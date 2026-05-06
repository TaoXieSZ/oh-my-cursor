import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  cancelScheduleTask,
  getScheduleStatePath,
  listScheduleTasks,
  readScheduleState,
  recordScheduleRun,
  requestScheduleRunNow,
  resumeAllScheduleTasks,
  resumeScheduleTask,
  suspendRunningScheduleTasks,
  upsertScheduleTask,
} from "../state.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omr-schedule-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omr", "state"), { recursive: true });
  return dir;
}

describe("schedule state helpers", () => {
  let projectRoot: string;
  let userRoot: string;
  const origEnv = process.env["OMR_PROJECT_ROOT"];
  const origUserRoot = process.env["OMR_USER_DATA_ROOT"];

  beforeEach(() => {
    projectRoot = makeTmpProject();
    userRoot = join(tmpdir(), `omr-schedule-user-${randomUUID()}`);
    mkdirSync(join(userRoot, "state"), { recursive: true });
    process.env["OMR_PROJECT_ROOT"] = projectRoot;
    process.env["OMR_USER_DATA_ROOT"] = userRoot;
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(userRoot, { recursive: true, force: true });
    if (origEnv === undefined) delete process.env["OMR_PROJECT_ROOT"];
    else process.env["OMR_PROJECT_ROOT"] = origEnv;
    if (origUserRoot === undefined) delete process.env["OMR_USER_DATA_ROOT"];
    else process.env["OMR_USER_DATA_ROOT"] = origUserRoot;
  });

  it("creates schedule state and inserts a task", () => {
    const task = upsertScheduleTask({
      id: "dashboard-scan",
      description: "Scan dashboard every 10 minutes",
      intervalSeconds: 600,
      params: { url: "https://grafana.example.com" },
    });

    assert.equal(task.id, "dashboard-scan");
    assert.equal(task.state, "running");
    assert.equal(task.run_count, 0);

    const state = readScheduleState();
    assert.ok(state);
    assert.equal(state!.mode, "schedule");
    assert.equal(state!.tasks.length, 1);
  });

  it("records a run and updates summary metadata", () => {
    upsertScheduleTask({
      id: "dashboard-scan",
      description: "Scan dashboard every 10 minutes",
      intervalSeconds: 600,
      params: {},
    });

    const updated = recordScheduleRun("dashboard-scan", {
      summary: "Dashboard tick completed",
      ts: "2026-04-15T05:00:00Z",
    });

    assert.ok(updated);
    assert.equal(updated!.run_count, 1);
    assert.equal(updated!.last_result, "Dashboard tick completed");
    assert.equal(updated!.last_run_at, "2026-04-15T05:00:00Z");
    assert.equal(typeof updated!.next_run_at, "string");
  });

  it("cancels, resumes, and requests run-now for tasks", () => {
    upsertScheduleTask({
      id: "dashboard-scan",
      description: "Scan dashboard every 10 minutes",
      intervalSeconds: 600,
      params: {},
      initialState: "suspended",
    });

    const resumed = resumeScheduleTask("dashboard-scan");
    assert.ok(resumed);
    assert.equal(resumed!.state, "running");

    const runNow = requestScheduleRunNow("dashboard-scan");
    assert.ok(runNow);
    assert.equal(runNow!.state, "running");
    assert.equal(typeof runNow!.run_now_requested_at, "string");

    const cancelled = cancelScheduleTask("dashboard-scan", "Stop monitoring");
    assert.ok(cancelled);
    assert.equal(cancelled!.state, "cancelled");
    assert.equal(cancelled!.next_run_at, null);
  });

  it("resumes all suspended tasks and lists running tasks first", () => {
    upsertScheduleTask({
      id: "task-a",
      description: "Task A",
      intervalSeconds: 60,
      params: {},
      initialState: "suspended",
      now: "2026-04-15T05:00:00Z",
    });
    upsertScheduleTask({
      id: "task-b",
      description: "Task B",
      intervalSeconds: 120,
      params: {},
      initialState: "running",
      now: "2026-04-15T05:01:00Z",
    });

    const resumed = resumeAllScheduleTasks();
    assert.equal(resumed.length, 1);
    assert.equal(resumed[0].id, "task-a");

    const tasks = listScheduleTasks();
    assert.equal(tasks.length, 2);
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[1].state, "running");
  });

  it("stores user-scope tasks outside the project .omr directory", () => {
    const userTask = upsertScheduleTask({
      id: "agents-radar-rss",
      scope: "user",
      description: "Watch the agents-radar RSS feed",
      intervalSeconds: 900,
      params: { feed_url: "https://duanyytop.github.io/agents-radar/feed.xml" },
      type: "rss-watch",
    });

    assert.equal(userTask.scope, "user");
    assert.equal(getScheduleStatePath("user"), join(userRoot, "state", "schedule-state.json"));
    assert.equal(readScheduleState("user")?.tasks.length, 1);
    assert.equal(readScheduleState()?.tasks.length ?? 0, 0);
  });

  it("suspends running tasks without touching cancelled ones", () => {
    upsertScheduleTask({
      id: "rss-a",
      scope: "user",
      description: "Task A",
      intervalSeconds: 900,
      params: {},
      now: "2026-04-15T05:00:00Z",
    });
    upsertScheduleTask({
      id: "rss-b",
      scope: "user",
      description: "Task B",
      intervalSeconds: 900,
      params: {},
      initialState: "cancelled",
      now: "2026-04-15T05:00:00Z",
    });

    const suspended = suspendRunningScheduleTasks("user", "2026-04-15T06:00:00Z");
    assert.equal(suspended.length, 1);
    assert.equal(suspended[0].id, "rss-a");
    assert.equal(suspended[0].state, "suspended");
    assert.equal(suspended[0].next_run_at, null);
    assert.equal(readScheduleState("user")?.tasks[1].state, "cancelled");
  });
});

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { collectState, computeStats, type DashboardState, type PlanInfo, type ModeInfo, type StatsData } from "../dashboard.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omr-dash-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("collectState", () => {
  let tmp: string;
  let origCwd: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tmp = makeTmpProject();
    origCwd = process.cwd();
    origEnv = process.env["OMR_PROJECT_ROOT"];
    process.chdir(tmp);
    delete process.env["OMR_PROJECT_ROOT"];
  });

  afterEach(() => {
    process.chdir(origCwd);
    if (origEnv === undefined) delete process.env["OMR_PROJECT_ROOT"];
    else process.env["OMR_PROJECT_ROOT"] = origEnv;
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns empty state for fresh project", () => {
    const state: DashboardState = collectState();
    assert.equal(state.session, null);
    assert.equal(state.activeTask, null);
    assert.deepEqual(state.activeModes, []);
    assert.deepEqual(state.completedModes, []);
    assert.deepEqual(state.archivedSessions, []);
    assert.deepEqual(state.notifications, []);
    assert.deepEqual(state.plans, []);
    assert.deepEqual(state.memory, {});
    assert.equal(state.notepad, "");
    assert.ok(state.timestamp);
  });

  it("reads active modes from state directory", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-a1b2c3d4-state.json"), JSON.stringify({
      mode: "forge", runId: "a1b2c3d4", status: "active",
      phase: "verify", iteration: 3,
      started_at: "2026-04-04T10:00:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes.length, 1);
    assert.equal(state.activeModes[0].mode, "forge");
    assert.equal(state.activeModes[0].runId, "a1b2c3d4");
  });

  it("reads legacy active modes (active: true)", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", active: true,
      phase: "verify", iteration: 3,
      started_at: "2026-04-04T10:00:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes.length, 1);
    assert.equal(state.activeModes[0].mode, "forge");
  });

  it("reads completed modes", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "blueprint-b1b2c3d4-state.json"), JSON.stringify({
      mode: "blueprint", runId: "b1b2c3d4", status: "complete",
      phase: "handoff", iteration: 1,
      started_at: "2026-04-04T09:00:00Z", completed_at: "2026-04-04T09:30:00Z",
    }));

    const state = collectState();
    assert.equal(state.completedModes.length, 1);
    assert.equal(state.completedModes[0].mode, "blueprint");
  });

  it("shows multiple active runs of the same mode", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-aaaa1111-state.json"), JSON.stringify({
      mode: "forge", runId: "aaaa1111", status: "active",
      phase: "implement", started_at: "2026-04-04T10:00:00Z",
    }));
    writeFileSync(join(stateDir, "forge-bbbb2222-state.json"), JSON.stringify({
      mode: "forge", runId: "bbbb2222", status: "active",
      phase: "verify", started_at: "2026-04-04T11:00:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes.length, 2);
    const runIds = state.activeModes.map((m: ModeInfo) => m.runId).sort();
    assert.deepEqual(runIds, ["aaaa1111", "bbbb2222"]);
  });

  it("includes archived sessions", () => {
    const archiveDir = join(tmp, ".omr", "archive");
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(join(archiveDir, "old-run.json"), JSON.stringify({
      runId: "old-run",
      session: { id: "old-run", started_at: "2026-04-01T10:00:00Z", archived_at: "2026-04-01T12:00:00Z" },
      task: "Old task", modes: [],
    }));

    const state = collectState();
    assert.equal(state.archivedSessions.length, 1);
    assert.equal(state.archivedSessions[0].task, "Old task");
  });

  it("reads plans with content preview, title, and modifiedAt", () => {
    const plansDir = join(tmp, ".omr", "plans");
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(join(plansDir, "prd-auth.md"), "# Auth PRD\n\nDesign the auth flow.");

    const state = collectState();
    assert.equal(state.plans.length, 1);
    assert.ok(state.plans[0].preview.includes("Auth PRD"));
    assert.equal(state.plans[0].title, "Auth PRD");
    assert.ok(state.plans[0].modifiedAt);
  });

  it("extracts activeTask from mode task field", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-a1b2c3d4-state.json"), JSON.stringify({
      mode: "forge", runId: "a1b2c3d4", status: "active",
      phase: "verify", iteration: 2,
      started_at: "2026-04-04T10:00:00Z",
      task: "Build the auth module",
    }));

    const state = collectState();
    assert.equal(state.activeTask, "Build the auth module");
  });

  it("reads project memory", () => {
    const omcDir = join(tmp, ".omr");
    mkdirSync(omcDir, { recursive: true });
    writeFileSync(join(omcDir, "project-memory.json"), JSON.stringify({
      preferred_pm: "pnpm",
    }));

    const state = collectState();
    assert.equal(state.memory["preferred_pm"], "pnpm");
  });

  it("reads notepad", () => {
    const omcDir = join(tmp, ".omr");
    mkdirSync(omcDir, { recursive: true });
    writeFileSync(join(omcDir, "notepad.md"), "# TODO\n- Fix auth bug");

    const state = collectState();
    assert.ok(state.notepad.includes("Fix auth bug"));
  });

  it("reads notifications newest first", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "notifications.jsonl"),
      [
        JSON.stringify({
          id: "n1",
          ts: "2026-04-04T10:00:00Z",
          source: "schedule",
          taskId: "dashboard-a",
          status: "info",
          summary: "first",
          channels: { desktop: true, feed: true },
        }),
        JSON.stringify({
          id: "n2",
          ts: "2026-04-04T10:01:00Z",
          source: "schedule",
          taskId: "dashboard-b",
          status: "warn",
          summary: "second",
          channels: { desktop: true, feed: true },
        }),
      ].join("\n") + "\n",
    );

    const state = collectState();
    assert.equal(state.notifications.length, 2);
    assert.equal(state.notifications[0].id, "n2");
    assert.equal(state.notifications[1].id, "n1");
  });

  it("ignores deprecated monitor state files in the generic dashboard view", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "monitor-a1b2c3d4-state.json"), JSON.stringify({
      mode: "monitor",
      runId: "a1b2c3d4",
      status: "active",
      phase: "watching",
      started_at: "2026-04-04T10:00:00Z",
      task: "IMOC monitor",
      monitorId: "imoc-dashboard",
      sourceTaskId: "dashboard-a",
      title: "IMOC Dashboard Monitor",
      dashboardUrl: "https://grafana.example.com",
      latestStatus: "warn",
      latestSummary: "Something happened",
      feed: [
        {
          id: "f1",
          ts: "2026-04-04T10:01:00Z",
          kind: "tick",
          status: "warn",
          summary: "Something happened",
          actions: ["investigate", "acknowledge", "ignore"],
          sourceTaskId: "dashboard-a",
        },
      ],
    }));

    const state = collectState();
    assert.equal(state.activeModes.length, 0);
    assert.equal(state.completedModes.length, 0);
  });

  it("skips corrupt notification lines", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "notifications.jsonl"),
      [
        JSON.stringify({
          id: "n1",
          ts: "2026-04-04T10:00:00Z",
          source: "schedule",
          taskId: "dashboard-a",
          status: "info",
          summary: "first",
          channels: { desktop: true, feed: true },
        }),
        "{invalid",
      ].join("\n") + "\n",
    );

    const state = collectState();
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].id, "n1");
  });

  it("reads session", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "session.json"), JSON.stringify({
      id: "abc-123-def",
      started_at: "2026-04-04T10:00:00Z",
    }));

    const state = collectState();
    assert.ok(state.session);
    assert.equal(state.session!.id, "abc-123-def");
  });

  it("handles malformed JSON gracefully", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "broken-a1b2c3d4-state.json"), "not json{{{");

    const state = collectState();
    assert.equal(state.activeModes.length, 0);
    assert.equal(state.completedModes.length, 0);
  });

  it("derives runId from filename when not in JSON", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-a1b2c3d4-state.json"), JSON.stringify({
      mode: "forge", status: "active",
      started_at: "2026-04-04T10:00:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes[0].runId, "a1b2c3d4");
  });

  it("populates recentEvents for active modes with event log", () => {
    const stateDir = join(tmp, ".omr", "state");
    const logsDir = join(tmp, ".omr", "logs");
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-ev123456-state.json"), JSON.stringify({
      mode: "forge", runId: "ev123456", status: "active",
      started_at: "2026-04-04T10:00:00Z",
    }));
    const events = [
      { ts: "2026-04-04T10:00:00Z", kind: "status", summary: "Started forge" },
      { ts: "2026-04-04T10:01:00Z", kind: "phase", summary: "Phase: init → verify" },
      { ts: "2026-04-04T10:02:00Z", kind: "iteration", summary: "Iteration 1" },
    ];
    writeFileSync(join(logsDir, "ev123456.jsonl"),
      events.map(e => JSON.stringify(e)).join("\n") + "\n");

    const state = collectState();
    assert.equal(state.activeModes.length, 1);
    assert.ok(state.activeModes[0].recentEvents);
    assert.equal(state.activeModes[0].recentEvents!.length, 3);
  });

  it("recentEvents is empty for modes without event log", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-nolog123-state.json"), JSON.stringify({
      mode: "forge", runId: "nolog123", status: "active",
      started_at: "2026-04-04T10:00:00Z",
    }));

    const state = collectState();
    assert.ok(state.activeModes[0].recentEvents);
    assert.equal(state.activeModes[0].recentEvents!.length, 0);
  });

  it("collectState includes stats", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-s1111111-state.json"), JSON.stringify({
      mode: "forge", runId: "s1111111", status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z",
      task: "Task 1",
    }));

    const state = collectState();
    assert.ok(state.stats);
    assert.equal(state.stats.totalRuns, 1);
    assert.equal(state.stats.successRate, 100);
    assert.ok(state.stats.avgDurationMs > 0);
  });
});

describe("computeStats", () => {
  it("returns defaults for no data", () => {
    const stats = computeStats([], [], []);
    assert.equal(stats.successRate, 100);
    assert.equal(stats.avgDurationMs, 0);
    assert.equal(stats.totalEvents, 0);
    assert.equal(stats.totalRuns, 0);
  });

  it("calculates success rate from completed and cancelled", () => {
    const completed: ModeInfo[] = [
      { mode: "forge", status: "complete", started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z" },
      { mode: "forge", status: "cancelled", started_at: "2026-04-04T11:00:00Z", completed_at: "2026-04-04T11:15:00Z" },
      { mode: "forge", status: "complete", started_at: "2026-04-04T12:00:00Z", completed_at: "2026-04-04T12:30:00Z" },
    ];
    const stats = computeStats([], completed, []);
    assert.equal(stats.successRate, 67);
  });

  it("calculates avg duration from completed runs", () => {
    const completed: ModeInfo[] = [
      { mode: "forge", status: "complete", started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z" },
      { mode: "forge", status: "complete", started_at: "2026-04-04T11:00:00Z", completed_at: "2026-04-04T12:00:00Z" },
    ];
    const stats = computeStats([], completed, []);
    assert.equal(stats.avgDurationMs, 45 * 60 * 1000);
  });

  it("counts events from active + completed + archived", () => {
    const active: ModeInfo[] = [
      { mode: "forge", status: "active", started_at: "2026-04-04T10:00:00Z", recentEvents: [
        { ts: "2026-04-04T10:00:00Z", kind: "status", summary: "Started" },
        { ts: "2026-04-04T10:01:00Z", kind: "phase", summary: "Phase change" },
      ] },
    ];
    const archived = [
      { session: { id: "a1", started_at: "2026-04-01T10:00:00Z", archived_at: "2026-04-01T12:00:00Z" },
        task: "old", modes: [{ status: "complete" }], events: [
          { ts: "2026-04-01T10:00:00Z", kind: "status", summary: "Started" },
        ] },
    ];
    const stats = computeStats(active, [], archived as any);
    assert.equal(stats.totalEvents, 3);
    assert.equal(stats.totalRuns, 2);
  });

  it("includes archives in success rate", () => {
    const archived = [
      { session: { id: "a1", started_at: "2026-04-01T10:00:00Z", archived_at: "2026-04-01T12:00:00Z" },
        task: "ok", modes: [{ status: "complete" }] },
      { session: { id: "a2", started_at: "2026-04-02T10:00:00Z", archived_at: "2026-04-02T12:00:00Z" },
        task: "bad", modes: [{ status: "cancelled" }] },
    ];
    const stats = computeStats([], [], archived as any);
    assert.equal(stats.successRate, 50);
  });
});

describe("memoryIndex in collectState", () => {
  let tmp: string;
  const origEnv = process.env["OMR_PROJECT_ROOT"];

  beforeEach(() => {
    tmp = makeTmpProject();
    process.env["OMR_PROJECT_ROOT"] = tmp;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (origEnv !== undefined) process.env["OMR_PROJECT_ROOT"] = origEnv;
    else delete process.env["OMR_PROJECT_ROOT"];
  });

  it("collectState includes empty memoryIndex when no index file", () => {
    const state = collectState();
    assert.deepEqual(state.memoryIndex, {});
  });

  it("collectState reads memoryIndex from file", () => {
    mkdirSync(join(tmp, ".omr"), { recursive: true });
    const indexData = {
      "project.name": [{ runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z", key: "project.name" }],
    };
    writeFileSync(join(tmp, ".omr", "memory-index.json"), JSON.stringify(indexData));
    const state = collectState();
    assert.ok(state.memoryIndex["project.name"]);
    assert.equal(state.memoryIndex["project.name"]!.length, 1);
  });

  it("derives memoryKeysModified for active modes", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-run123-state.json"), JSON.stringify({
      mode: "forge", runId: "run123", status: "active",
      started_at: "2026-04-07T10:00:00Z", task: "Test",
    }));
    const indexData = {
      "config.theme": [{ runId: "run123", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z", key: "config.theme" }],
      "unrelated": [{ runId: "other", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z", key: "unrelated" }],
    };
    writeFileSync(join(tmp, ".omr", "memory-index.json"), JSON.stringify(indexData));

    const state = collectState();
    assert.equal(state.activeModes.length, 1);
    assert.deepEqual(state.activeModes[0].memoryKeysModified, ["config.theme"]);
  });

  it("memoryKeysModified is undefined when no index match", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-run999-state.json"), JSON.stringify({
      mode: "forge", runId: "run999", status: "active",
      started_at: "2026-04-07T10:00:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes[0].memoryKeysModified, undefined);
  });
});

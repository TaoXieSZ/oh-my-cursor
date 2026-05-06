import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

function makeTmpDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("schedule hooks", () => {
  let projectRoot: string;
  let userRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir("omr-hook-project");
    userRoot = makeTmpDir("omr-hook-user");
    mkdirSync(join(projectRoot, ".omr", "state"), { recursive: true });
    mkdirSync(join(projectRoot, ".omr", "logs"), { recursive: true });
    mkdirSync(join(userRoot, "state"), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(userRoot, { recursive: true, force: true });
  });

  it("session-end suspends running project and user schedule tasks", () => {
    writeFileSync(join(projectRoot, ".omr", "state", "schedule-state.json"), JSON.stringify({
      mode: "schedule",
      status: "active",
      tasks: [
        { id: "project-task", description: "Project task", interval_seconds: 60, state: "running", run_count: 0, params: {} },
      ],
    }, null, 2));
    writeFileSync(join(userRoot, "state", "schedule-state.json"), JSON.stringify({
      mode: "schedule",
      status: "active",
      tasks: [
        { id: "user-task", description: "User task", interval_seconds: 60, state: "running", run_count: 0, params: {} },
      ],
    }, null, 2));

    execFileSync("node", [join(process.cwd(), "hooks", "session-end.mjs")], {
      input: JSON.stringify({ type: "stop" }),
      env: {
        ...process.env,
        OMR_PROJECT_ROOT: projectRoot,
        OMR_USER_DATA_ROOT: userRoot,
      },
      encoding: "utf-8",
    });

    const projectState = JSON.parse(readFileSync(join(projectRoot, ".omr", "state", "schedule-state.json"), "utf-8"));
    const userState = JSON.parse(readFileSync(join(userRoot, "state", "schedule-state.json"), "utf-8"));
    assert.equal(projectState.tasks[0].state, "suspended");
    assert.equal(projectState.tasks[0].next_run_at, null);
    assert.equal(userState.tasks[0].state, "suspended");
    assert.equal(userState.tasks[0].next_run_at, null);
  });

  it("session-start writes resume-pending markers for suspended tasks", () => {
    writeFileSync(join(projectRoot, ".omr", "state", "schedule-state.json"), JSON.stringify({
      mode: "schedule",
      status: "active",
      tasks: [
        { id: "project-task", description: "Project task", interval_seconds: 60, state: "suspended", run_count: 1, params: {}, last_result: "paused" },
      ],
    }, null, 2));
    writeFileSync(join(userRoot, "state", "schedule-state.json"), JSON.stringify({
      mode: "schedule",
      status: "active",
      tasks: [
        { id: "user-task", description: "User task", interval_seconds: 60, state: "suspended", run_count: 2, params: {}, last_result: "paused" },
      ],
    }, null, 2));

    execFileSync("node", [join(process.cwd(), "hooks", "session-start.mjs")], {
      input: JSON.stringify({ type: "sessionStart" }),
      env: {
        ...process.env,
        OMR_PROJECT_ROOT: projectRoot,
        OMR_USER_DATA_ROOT: userRoot,
      },
      encoding: "utf-8",
    });

    assert.equal(existsSync(join(projectRoot, ".omr", "state", "schedule-resume-pending.json")), true);
    assert.equal(existsSync(join(userRoot, "state", "schedule-resume-pending.json")), true);
    const projectPending = JSON.parse(readFileSync(join(projectRoot, ".omr", "state", "schedule-resume-pending.json"), "utf-8"));
    const userPending = JSON.parse(readFileSync(join(userRoot, "state", "schedule-resume-pending.json"), "utf-8"));
    assert.equal(projectPending.tasks[0].id, "project-task");
    assert.equal(userPending.tasks[0].id, "user-task");
    assert.equal(userPending.scope, "user");
  });
});

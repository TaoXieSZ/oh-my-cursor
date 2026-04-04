import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { collectState, type DashboardState } from "../dashboard.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-dash-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("collectState", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    tmp = makeTmpProject();
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns empty state for fresh project", () => {
    const state: DashboardState = collectState();
    assert.equal(state.session, null);
    assert.deepEqual(state.activeModes, []);
    assert.deepEqual(state.completedModes, []);
    assert.deepEqual(state.plans, []);
    assert.deepEqual(state.memory, {});
    assert.equal(state.notepad, "");
    assert.ok(state.timestamp);
  });

  it("reads active modes from state directory", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge",
      active: true,
      phase: "verify",
      iteration: 3,
      started_at: "2026-04-04T10:00:00Z",
      updated_at: "2026-04-04T10:05:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes.length, 1);
    assert.equal(state.activeModes[0].mode, "forge");
    assert.equal(state.activeModes[0].phase, "verify");
    assert.equal(state.activeModes[0].iteration, 3);
  });

  it("reads completed modes", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "blueprint-state.json"), JSON.stringify({
      mode: "blueprint",
      active: false,
      phase: "handoff",
      iteration: 1,
      started_at: "2026-04-04T09:00:00Z",
      updated_at: "2026-04-04T09:30:00Z",
      completed_at: "2026-04-04T09:30:00Z",
    }));

    const state = collectState();
    assert.equal(state.completedModes.length, 1);
    assert.equal(state.completedModes[0].mode, "blueprint");
  });

  it("reads plans", () => {
    const plansDir = join(tmp, ".omc", "plans");
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(join(plansDir, "prd-auth.md"), "# Auth PRD");
    writeFileSync(join(plansDir, "test-spec-auth.md"), "# Auth Tests");

    const state = collectState();
    assert.equal(state.plans.length, 2);
    assert.ok(state.plans.includes("prd-auth.md"));
    assert.ok(state.plans.includes("test-spec-auth.md"));
  });

  it("reads project memory", () => {
    const omcDir = join(tmp, ".omc");
    mkdirSync(omcDir, { recursive: true });
    writeFileSync(join(omcDir, "project-memory.json"), JSON.stringify({
      preferred_pm: "pnpm",
      main_branch: "develop",
    }));

    const state = collectState();
    assert.equal(state.memory["preferred_pm"], "pnpm");
    assert.equal(state.memory["main_branch"], "develop");
  });

  it("reads notepad", () => {
    const omcDir = join(tmp, ".omc");
    mkdirSync(omcDir, { recursive: true });
    writeFileSync(join(omcDir, "notepad.md"), "# TODO\n- Fix auth bug");

    const state = collectState();
    assert.ok(state.notepad.includes("Fix auth bug"));
  });

  it("reads session", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "session.json"), JSON.stringify({
      id: "abc-123-def",
      started_at: "2026-04-04T10:00:00Z",
    }));

    const state = collectState();
    assert.ok(state.session);
    assert.equal(state.session!.id, "abc-123-def");
  });

  it("handles multiple active modes", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", active: true, phase: "implement", iteration: 1,
      started_at: "2026-04-04T10:00:00Z", updated_at: "2026-04-04T10:01:00Z",
    }));
    writeFileSync(join(stateDir, "team-state.json"), JSON.stringify({
      mode: "team", active: true, phase: "dispatch", iteration: 2,
      started_at: "2026-04-04T10:00:00Z", updated_at: "2026-04-04T10:02:00Z",
    }));

    const state = collectState();
    assert.equal(state.activeModes.length, 2);
  });

  it("handles malformed JSON gracefully", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "broken-state.json"), "not json{{{");

    const state = collectState();
    assert.equal(state.activeModes.length, 0);
    assert.equal(state.completedModes.length, 0);
  });
});

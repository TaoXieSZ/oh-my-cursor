import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { readEvents } from "../event-log.js";
import {
  readModeState,
  writeModeState,
  startMode,
  updateMode,
  completeMode,
  cancelMode,
  listActiveModes,
  parseStateFilename,
} from "../mode-state.js";
import type { ModeState } from "../mode-state.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omr-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omr", "state"), { recursive: true });
  return dir;
}

describe("parseStateFilename", () => {
  it("parses legacy filename", () => {
    const result = parseStateFilename("forge-state.json");
    assert.deepEqual(result, { mode: "forge" });
  });

  it("parses run-scoped filename", () => {
    const result = parseStateFilename("forge-a1b2c3d4-state.json");
    assert.deepEqual(result, { mode: "forge", runId: "a1b2c3d4" });
  });

  it("parses hyphenated mode name (legacy)", () => {
    const result = parseStateFilename("deep-interview-state.json");
    assert.deepEqual(result, { mode: "deep-interview" });
  });

  it("parses hyphenated mode name with runId", () => {
    const result = parseStateFilename("deep-interview-a1b2c3d4-state.json");
    assert.deepEqual(result, { mode: "deep-interview", runId: "a1b2c3d4" });
  });

  it("returns null for non-state files", () => {
    assert.equal(parseStateFilename("session.json"), null);
    assert.equal(parseStateFilename("random.txt"), null);
  });
});

describe("mode-state", () => {
  let projectRoot: string;
  const origEnv = process.env["OMR_PROJECT_ROOT"];

  beforeEach(() => {
    projectRoot = makeTmpProject();
    process.env["OMR_PROJECT_ROOT"] = projectRoot;
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    if (origEnv === undefined) {
      delete process.env["OMR_PROJECT_ROOT"];
    } else {
      process.env["OMR_PROJECT_ROOT"] = origEnv;
    }
  });

  describe("readModeState", () => {
    it("returns null when no state file exists", () => {
      assert.equal(readModeState("forge"), null);
    });

    it("returns null for corrupt JSON (legacy file)", () => {
      const path = join(projectRoot, ".omr", "state", "forge-state.json");
      writeFileSync(path, "not json");
      assert.equal(readModeState("forge"), null);
    });

    it("reads legacy state file by mode name", () => {
      const path = join(projectRoot, ".omr", "state", "forge-state.json");
      writeFileSync(path, JSON.stringify({ mode: "forge", status: "active", started_at: "2026-01-01T00:00:00Z" }));
      const state = readModeState("forge");
      assert.ok(state);
      assert.equal(state!.mode, "forge");
    });

    it("reads run-scoped file by runId", () => {
      const path = join(projectRoot, ".omr", "state", "forge-a1b2c3d4-state.json");
      writeFileSync(path, JSON.stringify({ mode: "forge", runId: "a1b2c3d4", status: "active", started_at: "2026-01-01T00:00:00Z" }));
      const state = readModeState("forge", "a1b2c3d4");
      assert.ok(state);
      assert.equal(state!.runId, "a1b2c3d4");
    });

    it("scan returns active run over completed when no runId specified", () => {
      const stateDir = join(projectRoot, ".omr", "state");
      writeFileSync(join(stateDir, "forge-aaaa1111-state.json"), JSON.stringify({
        mode: "forge", runId: "aaaa1111", status: "complete", started_at: "2026-01-02T00:00:00Z",
      }));
      writeFileSync(join(stateDir, "forge-bbbb2222-state.json"), JSON.stringify({
        mode: "forge", runId: "bbbb2222", status: "active", started_at: "2026-01-01T00:00:00Z",
      }));
      const state = readModeState("forge");
      assert.ok(state);
      assert.equal(state!.runId, "bbbb2222");
      assert.equal(state!.status, "active");
    });
  });

  describe("writeModeState / readModeState roundtrip", () => {
    it("writes and reads back state with runId", () => {
      const state: ModeState = {
        mode: "forge",
        runId: "abcd1234",
        started_at: "2026-01-01T00:00:00Z",
        status: "active",
        task: "test task",
      };
      writeModeState("forge", state);
      const read = readModeState("forge", "abcd1234");
      assert.deepEqual(read, state);
    });

    it("writes to run-scoped file when runId present", () => {
      const state: ModeState = {
        mode: "forge", runId: "abcd1234",
        started_at: "2026-01-01T00:00:00Z", status: "active",
      };
      writeModeState("forge", state);
      assert.ok(existsSync(join(projectRoot, ".omr", "state", "forge-abcd1234-state.json")));
    });

    it("writes to legacy file when no runId", () => {
      const state: ModeState = {
        mode: "forge",
        started_at: "2026-01-01T00:00:00Z", status: "active",
      };
      writeModeState("forge", state);
      assert.ok(existsSync(join(projectRoot, ".omr", "state", "forge-state.json")));
    });
  });

  describe("startMode", () => {
    it("creates an active state file with runId", () => {
      const state = startMode("forge", "build auth");
      assert.equal(state.mode, "forge");
      assert.equal(state.status, "active");
      assert.equal(state.task, "build auth");
      assert.equal(state.phase, "init");
      assert.equal(state.iteration, 0);
      assert.ok(state.runId);
      assert.equal(state.runId!.length, 8);
    });

    it("generates unique runIds", () => {
      const s1 = startMode("forge", "task1");
      const s2 = startMode("forge", "task2");
      assert.notEqual(s1.runId, s2.runId);
    });

    it("writes to run-scoped file", () => {
      const state = startMode("forge", "task");
      const expected = join(projectRoot, ".omr", "state", `forge-${state.runId}-state.json`);
      assert.ok(existsSync(expected));
    });

    it("merges extra fields", () => {
      const state = startMode("team", "parallel work", { worker_count: 3 });
      assert.equal(state.worker_count, 3);
    });
  });

  describe("multi-run coexistence", () => {
    it("two forge runs coexist independently", () => {
      const run1 = startMode("forge", "task1");
      const run2 = startMode("forge", "task2");

      const read1 = readModeState("forge", run1.runId);
      const read2 = readModeState("forge", run2.runId);
      assert.equal(read1!.task, "task1");
      assert.equal(read2!.task, "task2");
    });

    it("updating one run does not affect the other", () => {
      const run1 = startMode("forge", "task1");
      const run2 = startMode("forge", "task2");

      updateMode("forge", { phase: "verify", iteration: 3 }, run1.runId);

      const read2 = readModeState("forge", run2.runId);
      assert.equal(read2!.phase, "init");
      assert.equal(read2!.iteration, 0);
    });

    it("completing one run makes readModeState return the other active one", () => {
      const run1 = startMode("forge", "task1");
      const run2 = startMode("forge", "task2");

      completeMode("forge", run1.runId);

      const active = readModeState("forge");
      assert.ok(active);
      assert.equal(active!.runId, run2.runId);
      assert.equal(active!.status, "active");
    });
  });

  describe("updateMode", () => {
    it("updates existing state", () => {
      const s = startMode("forge", "task");
      const updated = updateMode("forge", { phase: "executing", iteration: 2 }, s.runId);
      assert.ok(updated);
      assert.equal(updated!.phase, "executing");
      assert.equal(updated!.iteration, 2);
      assert.equal(updated!.status, "active");
    });

    it("returns null if mode does not exist", () => {
      assert.equal(updateMode("nonexistent", { phase: "x" }), null);
    });
  });

  describe("completeMode", () => {
    it("sets status to complete with timestamp", () => {
      const s = startMode("forge", "task");
      const completed = completeMode("forge", s.runId);
      assert.ok(completed);
      assert.equal(completed!.status, "complete");
      assert.ok(completed!.completed_at);
    });
  });

  describe("cancelMode", () => {
    it("sets status to cancelled with timestamp", () => {
      const s = startMode("forge", "task");
      const cancelled = cancelMode("forge", s.runId);
      assert.ok(cancelled);
      assert.equal(cancelled!.status, "cancelled");
      assert.ok(cancelled!.cancelled_at);
    });
  });

  describe("listActiveModes", () => {
    it("returns empty array when no state dir", () => {
      rmSync(join(projectRoot, ".omr", "state"), { recursive: true, force: true });
      assert.deepEqual(listActiveModes(), []);
    });

    it("returns only active modes", () => {
      startMode("forge", "task1");
      const team = startMode("team", "task2");
      completeMode("team", team.runId);

      const active = listActiveModes();
      assert.equal(active.length, 1);
      assert.equal(active[0].mode, "forge");
    });

    it("returns multiple active forge runs", () => {
      startMode("forge", "task1");
      startMode("forge", "task2");

      const active = listActiveModes();
      assert.equal(active.length, 2);
    });

    it("skips corrupt state files", () => {
      startMode("forge", "task");
      writeFileSync(join(projectRoot, ".omr", "state", "bad-a1b2c3d4-state.json"), "{invalid");
      const active = listActiveModes();
      assert.equal(active.length, 1);
    });
  });

  describe("auto-event emission", () => {
    it("startMode emits a 'Started' event", () => {
      const state = startMode("forge", "build auth");
      const events = readEvents(state.runId!);
      assert.ok(events.length >= 1);
      assert.ok(events.some(e => e.kind === "status" && e.summary.includes("Started forge")));
    });

    it("updateMode with phase change emits phase event", () => {
      const state = startMode("forge", "task");
      updateMode("forge", { phase: "verify" }, state.runId);
      const events = readEvents(state.runId!);
      assert.ok(events.some(e => e.kind === "phase" && e.summary.includes("→ verify")));
    });

    it("updateMode with iteration change emits iteration event", () => {
      const state = startMode("forge", "task");
      updateMode("forge", { iteration: 2 }, state.runId);
      const events = readEvents(state.runId!);
      assert.ok(events.some(e => e.kind === "iteration" && e.summary.includes("Iteration 2")));
    });

    it("completeMode emits status change event", () => {
      const state = startMode("forge", "task");
      completeMode("forge", state.runId);
      const events = readEvents(state.runId!);
      assert.ok(events.some(e => e.kind === "status" && e.summary.includes("→ complete")));
    });

    it("cancelMode emits status change event", () => {
      const state = startMode("forge", "task");
      cancelMode("forge", state.runId);
      const events = readEvents(state.runId!);
      assert.ok(events.some(e => e.kind === "status" && e.summary.includes("→ cancelled")));
    });

    it("two separate runs have independent event logs", () => {
      const run1 = startMode("forge", "task1");
      const run2 = startMode("forge", "task2");
      updateMode("forge", { phase: "verify" }, run1.runId);
      const ev1 = readEvents(run1.runId!);
      const ev2 = readEvents(run2.runId!);
      assert.ok(ev1.some(e => e.kind === "phase"));
      assert.ok(!ev2.some(e => e.kind === "phase"));
    });
  });
});

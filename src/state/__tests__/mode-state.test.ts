import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  readModeState,
  writeModeState,
  startMode,
  updateMode,
  completeMode,
  cancelMode,
  listActiveModes,
} from "../mode-state.js";
import type { ModeState } from "../mode-state.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omc", "state"), { recursive: true });
  return dir;
}

describe("mode-state", () => {
  let projectRoot: string;
  const origEnv = process.env["OMC_PROJECT_ROOT"];

  beforeEach(() => {
    projectRoot = makeTmpProject();
    process.env["OMC_PROJECT_ROOT"] = projectRoot;
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    if (origEnv === undefined) {
      delete process.env["OMC_PROJECT_ROOT"];
    } else {
      process.env["OMC_PROJECT_ROOT"] = origEnv;
    }
  });

  describe("readModeState", () => {
    it("returns null when no state file exists", () => {
      assert.equal(readModeState("forge"), null);
    });

    it("returns null for corrupt JSON", () => {
      const path = join(projectRoot, ".omc", "state", "forge-state.json");
      writeFileSync(path, "not json");
      assert.equal(readModeState("forge"), null);
    });
  });

  describe("writeModeState / readModeState roundtrip", () => {
    it("writes and reads back state", () => {
      const state: ModeState = {
        mode: "forge",
        started_at: "2026-01-01T00:00:00Z",
        status: "active",
        task: "test task",
      };

      writeModeState("forge", state);
      const read = readModeState("forge");

      assert.deepEqual(read, state);
    });
  });

  describe("startMode", () => {
    it("creates an active state file with defaults", () => {
      const state = startMode("forge", "build auth");

      assert.equal(state.mode, "forge");
      assert.equal(state.status, "active");
      assert.equal(state.task, "build auth");
      assert.equal(state.phase, "init");
      assert.equal(state.iteration, 0);
      assert.equal(state.completed_at, null);
      assert.ok(state.started_at);

      const onDisk = readModeState("forge");
      assert.deepEqual(onDisk, state);
    });

    it("merges extra fields", () => {
      const state = startMode("team", "parallel work", { worker_count: 3 });
      assert.equal(state.worker_count, 3);
    });
  });

  describe("updateMode", () => {
    it("updates existing state", () => {
      startMode("forge", "task");
      const updated = updateMode("forge", { phase: "executing", iteration: 2 });

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
      startMode("forge", "task");
      const completed = completeMode("forge");

      assert.ok(completed);
      assert.equal(completed!.status, "complete");
      assert.ok(completed!.completed_at);
    });
  });

  describe("cancelMode", () => {
    it("sets status to cancelled with timestamp", () => {
      startMode("forge", "task");
      const cancelled = cancelMode("forge");

      assert.ok(cancelled);
      assert.equal(cancelled!.status, "cancelled");
      assert.ok(cancelled!.cancelled_at);
    });
  });

  describe("listActiveModes", () => {
    it("returns empty array when no state dir", () => {
      rmSync(join(projectRoot, ".omc", "state"), { recursive: true, force: true });
      assert.deepEqual(listActiveModes(), []);
    });

    it("returns only active modes", () => {
      startMode("forge", "task1");
      startMode("team", "task2");
      completeMode("team");

      const active = listActiveModes();
      assert.equal(active.length, 1);
      assert.equal(active[0].mode, "forge");
    });

    it("skips corrupt state files", () => {
      startMode("forge", "task");
      const corruptPath = join(projectRoot, ".omc", "state", "bad-state.json");
      writeFileSync(corruptPath, "{invalid");

      const active = listActiveModes();
      assert.equal(active.length, 1);
    });
  });
});

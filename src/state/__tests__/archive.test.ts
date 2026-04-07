import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { archiveCurrentSession, archiveCompletedRuns, isSessionStale, listArchives } from "../archive.js";

function makeTmp(): string {
  const dir = join(tmpdir(), `omc-archive-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("archive", () => {
  let tmp: string;
  let origCwd: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tmp = makeTmp();
    origCwd = process.cwd();
    origEnv = process.env["OMC_PROJECT_ROOT"];
    process.chdir(tmp);
    delete process.env["OMC_PROJECT_ROOT"];
  });

  afterEach(() => {
    process.chdir(origCwd);
    if (origEnv === undefined) delete process.env["OMC_PROJECT_ROOT"];
    else process.env["OMC_PROJECT_ROOT"] = origEnv;
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when nothing to archive", () => {
    assert.equal(archiveCurrentSession(), null);
  });

  it("archiveCompletedRuns archives only non-active runs", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-aaaa1111-state.json"), JSON.stringify({
      mode: "forge", runId: "aaaa1111", status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z",
      task: "Completed task",
    }));
    writeFileSync(join(stateDir, "forge-bbbb2222-state.json"), JSON.stringify({
      mode: "forge", runId: "bbbb2222", status: "active",
      started_at: "2026-04-04T11:00:00Z", task: "Still running",
    }));

    const archived = archiveCompletedRuns();
    assert.equal(archived.length, 1);

    assert.ok(!existsSync(join(stateDir, "forge-aaaa1111-state.json")));
    assert.ok(existsSync(join(stateDir, "forge-bbbb2222-state.json")));

    const archiveData = JSON.parse(readFileSync(archived[0], "utf-8"));
    assert.equal(archiveData.runId, "aaaa1111");
    assert.equal(archiveData.task, "Completed task");
  });

  it("archiveCompletedRuns archives nothing when all active", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-aaaa1111-state.json"), JSON.stringify({
      mode: "forge", runId: "aaaa1111", status: "active",
      started_at: "2026-04-04T10:00:00Z",
    }));
    assert.deepEqual(archiveCompletedRuns(), []);
  });

  it("archiveCurrentSession preserves active runs and clears session only when empty", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "session.json"), JSON.stringify({
      id: "test-session", started_at: "2026-04-04T10:00:00Z",
    }));
    writeFileSync(join(stateDir, "forge-aaaa1111-state.json"), JSON.stringify({
      mode: "forge", runId: "aaaa1111", status: "complete",
      started_at: "2026-04-04T10:00:00Z", task: "Done",
    }));
    writeFileSync(join(stateDir, "forge-bbbb2222-state.json"), JSON.stringify({
      mode: "forge", runId: "bbbb2222", status: "active",
      started_at: "2026-04-04T11:00:00Z",
    }));

    const archivePath = archiveCurrentSession();
    assert.ok(archivePath);

    assert.ok(existsSync(join(stateDir, "forge-bbbb2222-state.json")));
    assert.ok(existsSync(join(stateDir, "session.json")));
    assert.ok(!existsSync(join(stateDir, "forge-aaaa1111-state.json")));
  });

  it("archiveCurrentSession clears session.json when all runs archived", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "session.json"), JSON.stringify({
      id: "test-session", started_at: "2026-04-04T10:00:00Z",
    }));
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", status: "complete",
      started_at: "2026-04-04T10:00:00Z", task: "Done",
    }));

    archiveCurrentSession();
    assert.ok(!existsSync(join(stateDir, "session.json")));
  });

  it("archives legacy state files (no runId in filename)", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "ralph-state.json"), JSON.stringify({
      mode: "ralph", task: "Old task", status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:15:00Z",
    }));

    const archived = archiveCompletedRuns();
    assert.equal(archived.length, 1);
    const data = JSON.parse(readFileSync(archived[0], "utf-8"));
    assert.equal(data.modes[0].mode, "ralph");
  });

  it("isSessionStale returns false for empty state", () => {
    assert.equal(isSessionStale(), false);
  });

  it("isSessionStale returns true when all modes are completed", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", active: false, status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z",
    }));
    assert.equal(isSessionStale(), true);
  });

  it("isSessionStale returns false when active even if old", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    writeFileSync(join(stateDir, "forge-a1b2c3d4-state.json"), JSON.stringify({
      mode: "forge", runId: "a1b2c3d4", status: "active",
      started_at: twoHoursAgo, updated_at: twoHoursAgo,
    }));
    assert.equal(isSessionStale(), false);
  });

  it("isSessionStale returns false for status-only active (no active boolean)", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", status: "active",
      started_at: new Date().toISOString(),
    }));
    assert.equal(isSessionStale(), false);
  });

  it("archiveCompletedRuns embeds events from event log", () => {
    const stateDir = join(tmp, ".omc", "state");
    const logsDir = join(tmp, ".omc", "logs");
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-ev111111-state.json"), JSON.stringify({
      mode: "forge", runId: "ev111111", status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z",
      task: "Done with events",
    }));
    const events = [
      { ts: "2026-04-04T10:00:00Z", kind: "status", summary: "Started forge" },
      { ts: "2026-04-04T10:15:00Z", kind: "phase", summary: "Phase: init → verify" },
    ];
    writeFileSync(join(logsDir, "ev111111.jsonl"),
      events.map(e => JSON.stringify(e)).join("\n") + "\n");

    const archived = archiveCompletedRuns();
    assert.equal(archived.length, 1);
    const archiveData = JSON.parse(readFileSync(archived[0], "utf-8"));
    assert.ok(archiveData.events);
    assert.equal(archiveData.events.length, 2);
    assert.equal(archiveData.events[0].kind, "status");

    assert.ok(!existsSync(join(logsDir, "ev111111.jsonl")));
  });

  it("archiveCompletedRuns handles missing event log gracefully", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-nolog999-state.json"), JSON.stringify({
      mode: "forge", runId: "nolog999", status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z",
      task: "No log",
    }));

    const archived = archiveCompletedRuns();
    assert.equal(archived.length, 1);
    const archiveData = JSON.parse(readFileSync(archived[0], "utf-8"));
    assert.ok(!archiveData.events);
  });

  it("listArchives returns sorted list", () => {
    const archiveDir = join(tmp, ".omc", "archive");
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(join(archiveDir, "old.json"), JSON.stringify({
      session: { id: "old", started_at: "2026-04-01T10:00:00Z", archived_at: "2026-04-01T12:00:00Z" },
      task: "Old task", modes: [],
    }));
    writeFileSync(join(archiveDir, "new.json"), JSON.stringify({
      session: { id: "new", started_at: "2026-04-04T10:00:00Z", archived_at: "2026-04-04T12:00:00Z" },
      task: "New task", modes: [],
    }));

    const list = listArchives();
    assert.equal(list.length, 2);
    assert.equal(list[0].session.id, "new");
    assert.equal(list[1].session.id, "old");
  });
});

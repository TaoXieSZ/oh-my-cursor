import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { archiveCurrentSession, isSessionStale, listArchives } from "../archive.js";

function makeTmp(): string {
  const dir = join(tmpdir(), `omc-archive-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("archive", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    tmp = makeTmp();
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when nothing to archive", () => {
    assert.equal(archiveCurrentSession(), null);
  });

  it("archives session + modes and clears state/", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "session.json"), JSON.stringify({
      id: "test-session-123", started_at: "2026-04-04T10:00:00Z",
    }));
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", active: false, phase: "verify", iteration: 3,
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:30:00Z",
      task: "Build auth module",
    }));
    writeFileSync(join(stateDir, "blueprint-state.json"), JSON.stringify({
      mode: "blueprint", active: false, phase: "handoff", iteration: 1,
      started_at: "2026-04-04T09:00:00Z", completed_at: "2026-04-04T09:30:00Z",
    }));

    const archivePath = archiveCurrentSession();
    assert.ok(archivePath);
    assert.ok(existsSync(archivePath!));

    const archive = JSON.parse(readFileSync(archivePath!, "utf-8"));
    assert.equal(archive.session.id, "test-session-123");
    assert.equal(archive.task, "Build auth module");
    assert.equal(archive.modes.length, 2);
    assert.ok(archive.session.archived_at);

    assert.ok(!existsSync(join(stateDir, "session.json")));
    assert.ok(!existsSync(join(stateDir, "forge-state.json")));
    assert.ok(!existsSync(join(stateDir, "blueprint-state.json")));
  });

  it("derives mode name from filename for legacy state files", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "session.json"), JSON.stringify({
      id: "legacy-session", started_at: "2026-04-04T10:00:00Z",
    }));
    writeFileSync(join(stateDir, "ralph-state.json"), JSON.stringify({
      task: "Old task", status: "complete",
      started_at: "2026-04-04T10:00:00Z", completed_at: "2026-04-04T10:15:00Z",
    }));

    const path = archiveCurrentSession()!;
    const archive = JSON.parse(readFileSync(path, "utf-8"));
    assert.equal(archive.modes[0].mode, "ralph");
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

  it("isSessionStale returns true when active but very old", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", active: true, status: "active",
      started_at: twoHoursAgo, updated_at: twoHoursAgo,
    }));
    assert.equal(isSessionStale(), true);
  });

  it("isSessionStale returns false when active and recent", () => {
    const stateDir = join(tmp, ".omc", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "forge-state.json"), JSON.stringify({
      mode: "forge", active: true, status: "active",
      started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }));
    assert.equal(isSessionStale(), false);
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

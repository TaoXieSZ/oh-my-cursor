import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  getProjectRoot,
  getBaseStateDir,
  getUserStateRoot,
  getStatePath,
  getModeStatePath,
  listModeStateFiles,
  getSessionPath,
  getTeamDir,
  getWorkerProgressPath,
  getPlanPath,
  getLogPath,
  getEventLogPath,
  getNotepadPath,
  getProjectMemoryPath,
  getMemoryIndexPath,
  getNotificationLogPath,
  getScopedSessionPath,
  getScopedPlanPath,
  getScopedLogPath,
  getScopedEventLogPath,
  getScopedNotepadPath,
  getScopedProjectMemoryPath,
  getScopedMemoryIndexPath,
  getScopedNotificationLogPath,
  getScopedBlackboardPath,
} from "../paths.js";

describe("getProjectRoot", () => {
  const origEnv = process.env["OMR_PROJECT_ROOT"];

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["OMR_PROJECT_ROOT"];
    } else {
      process.env["OMR_PROJECT_ROOT"] = origEnv;
    }
  });

  it("defaults to cwd when env is unset", () => {
    delete process.env["OMR_PROJECT_ROOT"];
    assert.equal(getProjectRoot(), process.cwd());
  });

  it("uses OMR_PROJECT_ROOT env when set", () => {
    process.env["OMR_PROJECT_ROOT"] = "/custom/root";
    assert.equal(getProjectRoot(), "/custom/root");
  });
});

describe("state path helpers", () => {
  const origEnv = process.env["OMR_PROJECT_ROOT"];

  beforeEach(() => {
    process.env["OMR_PROJECT_ROOT"] = "/test/project";
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["OMR_PROJECT_ROOT"];
    } else {
      process.env["OMR_PROJECT_ROOT"] = origEnv;
    }
  });

  it("getBaseStateDir", () => {
    assert.equal(getBaseStateDir(), "/test/project/.omr");
  });

  it("getUserStateRoot", () => {
    assert.equal(getUserStateRoot(), join(homedir(), ".cursor", "omr"));
  });

  it("getStatePath", () => {
    assert.equal(getStatePath("foo.json"), "/test/project/.omr/state/foo.json");
  });

  it("getStatePath user scope", () => {
    assert.equal(getStatePath("foo.json", "user"), join(homedir(), ".cursor", "omr", "state", "foo.json"));
  });

  it("getModeStatePath without runId", () => {
    assert.equal(getModeStatePath("forge"), "/test/project/.omr/state/forge-state.json");
  });

  it("getModeStatePath with runId", () => {
    assert.equal(getModeStatePath("forge", "abc12345"), "/test/project/.omr/state/forge-abc12345-state.json");
  });

  it("getSessionPath", () => {
    assert.equal(getSessionPath(), "/test/project/.omr/state/session.json");
  });

  it("getScopedSessionPath user scope", () => {
    assert.equal(getScopedSessionPath("user"), join(homedir(), ".cursor", "omr", "state", "session.json"));
  });

  it("getTeamDir without name", () => {
    assert.equal(getTeamDir(), "/test/project/.omr/state/team");
  });

  it("getTeamDir with name", () => {
    assert.equal(getTeamDir("alpha"), "/test/project/.omr/state/team/alpha");
  });

  it("getWorkerProgressPath", () => {
    assert.equal(
      getWorkerProgressPath("worker-1"),
      "/test/project/.omr/state/team/worker-1/progress.json"
    );
  });

  it("getPlanPath", () => {
    assert.equal(getPlanPath("prd-auth.md"), "/test/project/.omr/plans/prd-auth.md");
  });

  it("getScopedPlanPath user scope", () => {
    assert.equal(getScopedPlanPath("prd-auth.md", "user"), join(homedir(), ".cursor", "omr", "plans", "prd-auth.md"));
  });

  it("getLogPath", () => {
    assert.equal(getLogPath("session.log"), "/test/project/.omr/logs/session.log");
  });

  it("getScopedLogPath user scope", () => {
    assert.equal(getScopedLogPath("session.log", "user"), join(homedir(), ".cursor", "omr", "logs", "session.log"));
  });

  it("getEventLogPath", () => {
    assert.equal(getEventLogPath("abc12345"), "/test/project/.omr/logs/abc12345.jsonl");
  });

  it("getScopedEventLogPath user scope", () => {
    assert.equal(getScopedEventLogPath("abc12345", "user"), join(homedir(), ".cursor", "omr", "logs", "abc12345.jsonl"));
  });

  it("getNotepadPath", () => {
    assert.equal(getNotepadPath(), "/test/project/.omr/notepad.md");
  });

  it("getScopedNotepadPath user scope", () => {
    assert.equal(getScopedNotepadPath("user"), join(homedir(), ".cursor", "omr", "notepad.md"));
  });

  it("getProjectMemoryPath", () => {
    assert.equal(getProjectMemoryPath(), "/test/project/.omr/project-memory.json");
  });

  it("getScopedProjectMemoryPath user scope", () => {
    assert.equal(getScopedProjectMemoryPath("user"), join(homedir(), ".cursor", "omr", "project-memory.json"));
  });

  it("getMemoryIndexPath", () => {
    assert.equal(getMemoryIndexPath(), "/test/project/.omr/memory-index.json");
  });

  it("getScopedMemoryIndexPath user scope", () => {
    assert.equal(getScopedMemoryIndexPath("user"), join(homedir(), ".cursor", "omr", "memory-index.json"));
  });

  it("getNotificationLogPath", () => {
    assert.equal(getNotificationLogPath(), "/test/project/.omr/state/notifications.jsonl");
  });

  it("getScopedNotificationLogPath user scope", () => {
    assert.equal(getScopedNotificationLogPath("user"), join(homedir(), ".cursor", "omr", "state", "notifications.jsonl"));
  });

  it("getScopedBlackboardPath user scope", () => {
    assert.equal(getScopedBlackboardPath("user"), join(homedir(), ".cursor", "omr", "blackboard.jsonl"));
  });
});

describe("listModeStateFiles", () => {
  let tmp: string;
  const origEnv = process.env["OMR_PROJECT_ROOT"];

  beforeEach(() => {
    tmp = join(tmpdir(), `omr-paths-test-${randomUUID()}`);
    mkdirSync(join(tmp, ".omr", "state"), { recursive: true });
    process.env["OMR_PROJECT_ROOT"] = tmp;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (origEnv === undefined) delete process.env["OMR_PROJECT_ROOT"];
    else process.env["OMR_PROJECT_ROOT"] = origEnv;
  });

  it("returns empty for no state files", () => {
    assert.deepEqual(listModeStateFiles(), []);
  });

  it("returns all state files excluding session.json", () => {
    const stateDir = join(tmp, ".omr", "state");
    writeFileSync(join(stateDir, "forge-state.json"), "{}");
    writeFileSync(join(stateDir, "forge-a1b2c3d4-state.json"), "{}");
    writeFileSync(join(stateDir, "session.json"), "{}");
    const files = listModeStateFiles();
    assert.equal(files.length, 2);
    assert.ok(!files.includes("session.json"));
  });

  it("filters by mode", () => {
    const stateDir = join(tmp, ".omr", "state");
    writeFileSync(join(stateDir, "forge-state.json"), "{}");
    writeFileSync(join(stateDir, "forge-a1b2c3d4-state.json"), "{}");
    writeFileSync(join(stateDir, "blueprint-state.json"), "{}");
    const files = listModeStateFiles("forge");
    assert.equal(files.length, 2);
    assert.ok(files.every(f => f.startsWith("forge")));
  });

  it("returns empty for nonexistent state dir", () => {
    rmSync(join(tmp, ".omr", "state"), { recursive: true, force: true });
    assert.deepEqual(listModeStateFiles(), []);
  });
});

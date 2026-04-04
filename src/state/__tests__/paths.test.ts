import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getProjectRoot,
  getBaseStateDir,
  getStatePath,
  getModeStatePath,
  getSessionPath,
  getTeamDir,
  getWorkerProgressPath,
  getPlanPath,
  getLogPath,
  getNotepadPath,
  getProjectMemoryPath,
} from "../paths.js";

describe("getProjectRoot", () => {
  const origEnv = process.env["OMC_PROJECT_ROOT"];

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["OMC_PROJECT_ROOT"];
    } else {
      process.env["OMC_PROJECT_ROOT"] = origEnv;
    }
  });

  it("defaults to cwd when env is unset", () => {
    delete process.env["OMC_PROJECT_ROOT"];
    assert.equal(getProjectRoot(), process.cwd());
  });

  it("uses OMC_PROJECT_ROOT env when set", () => {
    process.env["OMC_PROJECT_ROOT"] = "/custom/root";
    assert.equal(getProjectRoot(), "/custom/root");
  });
});

describe("state path helpers", () => {
  const origEnv = process.env["OMC_PROJECT_ROOT"];

  beforeEach(() => {
    process.env["OMC_PROJECT_ROOT"] = "/test/project";
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["OMC_PROJECT_ROOT"];
    } else {
      process.env["OMC_PROJECT_ROOT"] = origEnv;
    }
  });

  it("getBaseStateDir", () => {
    assert.equal(getBaseStateDir(), "/test/project/.omc");
  });

  it("getStatePath", () => {
    assert.equal(getStatePath("foo.json"), "/test/project/.omc/state/foo.json");
  });

  it("getModeStatePath", () => {
    assert.equal(getModeStatePath("forge"), "/test/project/.omc/state/forge-state.json");
  });

  it("getSessionPath", () => {
    assert.equal(getSessionPath(), "/test/project/.omc/state/session.json");
  });

  it("getTeamDir without name", () => {
    assert.equal(getTeamDir(), "/test/project/.omc/state/team");
  });

  it("getTeamDir with name", () => {
    assert.equal(getTeamDir("alpha"), "/test/project/.omc/state/team/alpha");
  });

  it("getWorkerProgressPath", () => {
    assert.equal(
      getWorkerProgressPath("worker-1"),
      "/test/project/.omc/state/team/worker-1/progress.json"
    );
  });

  it("getPlanPath", () => {
    assert.equal(getPlanPath("prd-auth.md"), "/test/project/.omc/plans/prd-auth.md");
  });

  it("getLogPath", () => {
    assert.equal(getLogPath("session.log"), "/test/project/.omc/logs/session.log");
  });

  it("getNotepadPath", () => {
    assert.equal(getNotepadPath(), "/test/project/.omc/notepad.md");
  });

  it("getProjectMemoryPath", () => {
    assert.equal(getProjectMemoryPath(), "/test/project/.omc/project-memory.json");
  });
});

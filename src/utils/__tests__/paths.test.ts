import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  cursorHome,
  cursorRulesDir,
  cursorSkillsDir,
  cursorMcpConfigPath,
  omrUserDataDir,
  omrStateDir,
  omrPlansDir,
  omrLogsDir,
  omrStatePath,
  omrSetupScopePath,
  omrProjectMemoryPath,
  omrNotepadPath,
  packageRoot,
  packageRulesDir,
  packageSkillsDir,
} from "../paths.js";

describe("cursorHome", () => {
  it("returns ~/.cursor", () => {
    assert.equal(cursorHome(), join(homedir(), ".cursor"));
  });
});

describe("cursorRulesDir", () => {
  it("returns user scope path", () => {
    assert.equal(cursorRulesDir("user"), join(homedir(), ".cursor", "rules"));
  });

  it("returns project scope path", () => {
    assert.equal(cursorRulesDir("project"), join(process.cwd(), ".cursor", "rules"));
  });
});

describe("cursorSkillsDir", () => {
  it("returns user scope path", () => {
    assert.equal(cursorSkillsDir("user"), join(homedir(), ".cursor", "skills"));
  });

  it("returns project scope path", () => {
    assert.equal(cursorSkillsDir("project"), join(process.cwd(), ".cursor", "skills"));
  });
});

describe("cursorMcpConfigPath", () => {
  it("returns user scope path", () => {
    assert.equal(cursorMcpConfigPath("user"), join(homedir(), ".cursor", "mcp.json"));
  });

  it("returns project scope path", () => {
    assert.equal(cursorMcpConfigPath("project"), join(process.cwd(), ".cursor", "mcp.json"));
  });
});

describe("omr paths are rooted at cwd", () => {
  const cwd = process.cwd();

  it("omrUserDataDir", () => {
    assert.equal(omrUserDataDir(), join(homedir(), ".cursor", "omr"));
  });

  it("omrStateDir", () => {
    assert.equal(omrStateDir(), join(cwd, ".omr"));
  });

  it("omrStateDir user scope", () => {
    assert.equal(omrStateDir("user"), join(homedir(), ".cursor", "omr"));
  });

  it("omrPlansDir", () => {
    assert.equal(omrPlansDir(), join(cwd, ".omr", "plans"));
  });

  it("omrPlansDir user scope", () => {
    assert.equal(omrPlansDir("user"), join(homedir(), ".cursor", "omr", "plans"));
  });

  it("omrLogsDir", () => {
    assert.equal(omrLogsDir(), join(cwd, ".omr", "logs"));
  });

  it("omrLogsDir user scope", () => {
    assert.equal(omrLogsDir("user"), join(homedir(), ".cursor", "omr", "logs"));
  });

  it("omrStatePath", () => {
    assert.equal(omrStatePath(), join(cwd, ".omr", "state"));
  });

  it("omrStatePath user scope", () => {
    assert.equal(omrStatePath("user"), join(homedir(), ".cursor", "omr", "state"));
  });

  it("omrSetupScopePath", () => {
    assert.equal(omrSetupScopePath(), join(cwd, ".omr", "setup-scope.json"));
  });

  it("omrProjectMemoryPath", () => {
    assert.equal(omrProjectMemoryPath(), join(cwd, ".omr", "project-memory.json"));
  });

  it("omrProjectMemoryPath user scope", () => {
    assert.equal(omrProjectMemoryPath("user"), join(homedir(), ".cursor", "omr", "project-memory.json"));
  });

  it("omrNotepadPath", () => {
    assert.equal(omrNotepadPath(), join(cwd, ".omr", "notepad.md"));
  });

  it("omrNotepadPath user scope", () => {
    assert.equal(omrNotepadPath("user"), join(homedir(), ".cursor", "omr", "notepad.md"));
  });
});

describe("packageRoot", () => {
  it("points to a directory containing rules/ and skills/", () => {
    const root = packageRoot();
    assert.ok(root.length > 0);
    assert.ok(
      root.endsWith("oh-my-cursor") || root.includes("oh-my-cursor"),
      `packageRoot should be project root, got: ${root}`
    );
  });

  it("packageRulesDir ends with /rules", () => {
    assert.ok(packageRulesDir().endsWith("/rules"));
  });

  it("packageSkillsDir ends with /skills", () => {
    assert.ok(packageSkillsDir().endsWith("/skills"));
  });
});

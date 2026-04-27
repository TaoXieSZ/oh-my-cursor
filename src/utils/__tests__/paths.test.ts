import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  cursorHome,
  cursorRulesDir,
  cursorSkillsDir,
  cursorMcpConfigPath,
  omcUserDataDir,
  omcStateDir,
  omcPlansDir,
  omcLogsDir,
  omcStatePath,
  omcSetupScopePath,
  omcProjectMemoryPath,
  omcNotepadPath,
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

describe("omc paths are rooted at cwd", () => {
  const cwd = process.cwd();

  it("omcUserDataDir", () => {
    assert.equal(omcUserDataDir(), join(homedir(), ".cursor", "omc"));
  });

  it("omcStateDir", () => {
    assert.equal(omcStateDir(), join(cwd, ".omc"));
  });

  it("omcStateDir user scope", () => {
    assert.equal(omcStateDir("user"), join(homedir(), ".cursor", "omc"));
  });

  it("omcPlansDir", () => {
    assert.equal(omcPlansDir(), join(cwd, ".omc", "plans"));
  });

  it("omcPlansDir user scope", () => {
    assert.equal(omcPlansDir("user"), join(homedir(), ".cursor", "omc", "plans"));
  });

  it("omcLogsDir", () => {
    assert.equal(omcLogsDir(), join(cwd, ".omc", "logs"));
  });

  it("omcLogsDir user scope", () => {
    assert.equal(omcLogsDir("user"), join(homedir(), ".cursor", "omc", "logs"));
  });

  it("omcStatePath", () => {
    assert.equal(omcStatePath(), join(cwd, ".omc", "state"));
  });

  it("omcStatePath user scope", () => {
    assert.equal(omcStatePath("user"), join(homedir(), ".cursor", "omc", "state"));
  });

  it("omcSetupScopePath", () => {
    assert.equal(omcSetupScopePath(), join(cwd, ".omc", "setup-scope.json"));
  });

  it("omcProjectMemoryPath", () => {
    assert.equal(omcProjectMemoryPath(), join(cwd, ".omc", "project-memory.json"));
  });

  it("omcProjectMemoryPath user scope", () => {
    assert.equal(omcProjectMemoryPath("user"), join(homedir(), ".cursor", "omc", "project-memory.json"));
  });

  it("omcNotepadPath", () => {
    assert.equal(omcNotepadPath(), join(cwd, ".omc", "notepad.md"));
  });

  it("omcNotepadPath user scope", () => {
    assert.equal(omcNotepadPath("user"), join(homedir(), ".cursor", "omc", "notepad.md"));
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

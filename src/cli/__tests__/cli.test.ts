import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const OMC_BIN = join(import.meta.dirname, "..", "omc.js");

function run(args: string[], cwd?: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [OMC_BIN, ...args], {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      exitCode: err.status ?? 1,
    };
  }
}

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-cli-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("omc help", () => {
  it("prints usage info", () => {
    const { stdout, exitCode } = run(["help"]);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("oh-my-cursor"));
    assert.ok(stdout.includes("setup"));
    assert.ok(stdout.includes("doctor"));
    assert.ok(stdout.includes("status"));
  });
});

describe("omc version", () => {
  it("prints version number", () => {
    const { stdout, exitCode } = run(["version"]);
    assert.equal(exitCode, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });
});

describe("omc (unknown command)", () => {
  it("exits with code 1 and shows help", () => {
    const { stdout, stderr, exitCode } = run(["nonexistent"]);
    assert.equal(exitCode, 1);
    const output = stdout + stderr;
    assert.ok(output.includes("Unknown command"));
  });
});

describe("omc setup --scope project", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("installs rules, skills, MCP config, and .omc/ dirs", () => {
    const { stdout, exitCode } = run(["setup", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Setup complete"));

    // Rules installed
    const rulesDir = join(tmp, ".cursor", "rules");
    assert.ok(existsSync(rulesDir));
    const rules = readdirSync(rulesDir).filter((f) => f.startsWith("omc-"));
    assert.ok(rules.length >= 3, `Expected >= 3 rules, got ${rules.length}`);

    // Skills installed
    const skillsDir = join(tmp, ".cursor", "skills");
    assert.ok(existsSync(skillsDir));
    const skills = readdirSync(skillsDir).filter((f) => f.startsWith("omc-"));
    assert.ok(skills.length >= 10, `Expected >= 10 skills, got ${skills.length}`);

    // MCP config
    const mcpPath = join(tmp, ".cursor", "mcp.json");
    assert.ok(existsSync(mcpPath));
    const mcp = JSON.parse(readFileSync(mcpPath, "utf-8"));
    assert.ok(mcp.mcpServers["omc-state"]);
    assert.ok(mcp.mcpServers["omc-memory"]);

    // Prompts installed
    const promptsDir = join(tmp, ".omc", "prompts");
    assert.ok(existsSync(promptsDir), "Prompts directory should exist");
    const prompts = readdirSync(promptsDir).filter((f) => f.endsWith(".md"));
    assert.ok(prompts.length >= 20, `Expected >= 20 prompts, got ${prompts.length}`);
    const expectedRoles = [
      "executor.md", "architect.md", "debugger.md", "verifier.md",
      "explorer.md", "planner.md", "code-reviewer.md", "test-engineer.md",
      "writer.md", "security-reviewer.md",
      "build-fixer.md", "critic.md", "designer.md", "git-master.md", "researcher.md",
      "performance-reviewer.md", "quality-reviewer.md", "style-reviewer.md",
      "api-reviewer.md", "code-simplifier.md",
    ];
    for (const role of expectedRoles) {
      assert.ok(prompts.includes(role), `Missing prompt: ${role}`);
    }

    // Prompt files have expected structure
    const executorContent = readFileSync(join(promptsDir, "executor.md"), "utf-8");
    assert.ok(executorContent.includes("<identity>"), "executor.md should have <identity> section");
    assert.ok(executorContent.includes("<constraints>"), "executor.md should have <constraints> section");
    assert.ok(executorContent.includes("<execution_loop>"), "executor.md should have <execution_loop> section");
    assert.ok(executorContent.includes("<output_contract>"), "executor.md should have <output_contract> section");

    // .omc/ state dirs
    assert.ok(existsSync(join(tmp, ".omc", "state")));
    assert.ok(existsSync(join(tmp, ".omc", "plans")));
    assert.ok(existsSync(join(tmp, ".omc", "logs")));
    assert.ok(existsSync(join(tmp, ".omc", "notepad.md")));
    assert.ok(existsSync(join(tmp, ".omc", "project-memory.json")));
    assert.ok(existsSync(join(tmp, ".omc", "setup-scope.json")));

    // setup-scope.json content
    const meta = JSON.parse(readFileSync(join(tmp, ".omc", "setup-scope.json"), "utf-8"));
    assert.equal(meta.scope, "project");
    assert.equal(meta.version, "0.1.0");

    // .gitignore updated
    const gitignore = readFileSync(join(tmp, ".gitignore"), "utf-8");
    assert.ok(gitignore.includes(".omc/"));
  });

  it("is idempotent (running twice works)", () => {
    run(["setup", "--scope", "project"], tmp);
    const { exitCode } = run(["setup", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
  });

  it("removes deprecated built-in skills from existing installs", () => {
    const deprecatedNames = ["omc-plan", "omc-ralph", "omc-ralplan"];
    for (const name of deprecatedNames) {
      const deprecated = join(tmp, ".cursor", "skills", name);
      mkdirSync(deprecated, { recursive: true });
      writeFileSync(join(deprecated, "SKILL.md"), `---\nname: ${name}\n---\n`);
    }

    const { exitCode } = run(["setup", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
    for (const name of deprecatedNames) {
      assert.ok(!existsSync(join(tmp, ".cursor", "skills", name)), `${name} should be removed by setup`);
    }
  });
});

describe("omc doctor --scope project", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("passes all checks after setup", () => {
    run(["setup", "--scope", "project"], tmp);
    const { stdout, exitCode } = run(["doctor", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("All") && stdout.includes("passed"));
    assert.ok(stdout.includes("role prompts installed"), "Doctor should report prompt installation");
  });

  it("reports missing state dir before setup", () => {
    const { stdout } = run(["doctor", "--scope", "project"], tmp);
    assert.ok(stdout.includes("missing") || stdout.includes("not found"));
  });
});

describe("omc status", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("shows setup info after setup", () => {
    run(["setup", "--scope", "project"], tmp);
    const { stdout, exitCode } = run(["status"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("project"));
  });

  it("shows warning before setup", () => {
    const { stdout, exitCode } = run(["status"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Not set up") || stdout.includes("setup"));
  });
});

describe("omc skills", () => {
  it("lists installed skills from package dir", () => {
    const { stdout, exitCode } = run(["skills"]);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("OMC Skills"));
    const expected = [
      "omc-analyze", "omc-autopilot", "omc-blueprint", "omc-cancel", "omc-code-review",
      "omc-dashboard", "omc-deep-interview", "omc-ecomode", "omc-forge",
      "omc-tdd", "omc-team", "omc-web-clone",
    ];
    for (const name of expected) {
      assert.ok(stdout.includes(`/${name}`), `Missing skill: /${name}`);
    }
    assert.ok(stdout.includes("skills available"));
  });
});

describe("omc setup --scope invalid", () => {
  it("exits with error for invalid scope", () => {
    const { exitCode } = run(["setup", "--scope", "invalid"]);
    assert.equal(exitCode, 1);
  });
});

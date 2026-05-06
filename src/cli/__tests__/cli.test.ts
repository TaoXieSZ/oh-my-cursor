import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const OMR_BIN = join(import.meta.dirname, "..", "omr.js");

function run(args: string[], cwd?: string, env?: Record<string, string>): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [OMR_BIN, ...args], {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
      env: { ...process.env, OMR_DISABLE_SCHEDULE_WORKER_AUTOSTART: "1", ...env },
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
  const dir = join(tmpdir(), `omr-cli-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("omr help", () => {
  it("prints usage info", () => {
    const { stdout, exitCode } = run(["help"]);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("oh-my-cursor"));
    assert.ok(stdout.includes("Lightweight workflow toolkit"));
    assert.ok(stdout.includes("setup"));
    assert.ok(stdout.includes("doctor"));
    assert.ok(stdout.includes("status"));
  });
});

describe("omr version", () => {
  it("prints version number", () => {
    const { stdout, exitCode } = run(["version"]);
    assert.equal(exitCode, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });
});

describe("omr (unknown command)", () => {
  it("exits with code 1 and shows help", () => {
    const { stdout, stderr, exitCode } = run(["nonexistent"]);
    assert.equal(exitCode, 1);
    const output = stdout + stderr;
    assert.ok(output.includes("Unknown command"));
  });
});

describe("omr setup --scope project", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("installs rules, skills, MCP config, and .omr/ dirs", () => {
    const { stdout, exitCode } = run(["setup", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Setup complete"));

    // Rules installed
    const rulesDir = join(tmp, ".cursor", "rules");
    assert.ok(existsSync(rulesDir));
    const rules = readdirSync(rulesDir).filter((f) => f.startsWith("omr-"));
    assert.ok(rules.length >= 3, `Expected >= 3 rules, got ${rules.length}`);

    // Skills installed
    const skillsDir = join(tmp, ".cursor", "skills");
    assert.ok(existsSync(skillsDir));
    const skills = readdirSync(skillsDir).filter((f) => f.startsWith("omr-"));
    assert.ok(skills.length >= 10, `Expected >= 10 skills, got ${skills.length}`);

    // MCP config
    const mcpPath = join(tmp, ".cursor", "mcp.json");
    assert.ok(existsSync(mcpPath));
    const mcp = JSON.parse(readFileSync(mcpPath, "utf-8"));
    assert.ok(mcp.mcpServers["omr-state"]);
    assert.ok(mcp.mcpServers["omr-memory"]);

    // Prompts installed
    const promptsDir = join(tmp, ".omr", "prompts");
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

    // .omr/ state dirs
    assert.ok(existsSync(join(tmp, ".omr", "state")));
    assert.ok(existsSync(join(tmp, ".omr", "plans")));
    assert.ok(existsSync(join(tmp, ".omr", "logs")));
    assert.ok(existsSync(join(tmp, ".omr", "notepad.md")));
    assert.ok(existsSync(join(tmp, ".omr", "project-memory.json")));
    assert.ok(existsSync(join(tmp, ".omr", "setup-scope.json")));

    // setup-scope.json content
    const meta = JSON.parse(readFileSync(join(tmp, ".omr", "setup-scope.json"), "utf-8"));
    assert.equal(meta.scope, "project");
    assert.equal(meta.version, "0.1.0");

    // .gitignore updated
    const gitignore = readFileSync(join(tmp, ".gitignore"), "utf-8");
    assert.ok(gitignore.includes(".omr/"));
  });

  it("is idempotent (running twice works)", () => {
    run(["setup", "--scope", "project"], tmp);
    const { exitCode } = run(["setup", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
  });

  it("removes legacy omc-* skills (rename + earlier consolidations) from existing installs", () => {
    const legacyNames = ["omc-plan", "omc-ralph", "omc-ralplan", "omc-forge", "omc-blueprint"];
    for (const name of legacyNames) {
      const legacy = join(tmp, ".cursor", "skills", name);
      mkdirSync(legacy, { recursive: true });
      writeFileSync(join(legacy, "SKILL.md"), `---\nname: ${name}\n---\n`);
    }

    const { exitCode } = run(["setup", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
    for (const name of legacyNames) {
      assert.ok(!existsSync(join(tmp, ".cursor", "skills", name)), `${name} should be removed by setup`);
    }
  });
});

describe("omr doctor --scope project", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("passes all checks after setup", () => {
    run(["setup", "--scope", "project"], tmp);
    const { stdout, exitCode } = run(["doctor", "--scope", "project"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("All") && stdout.includes("passed"));
    assert.ok(stdout.includes("role prompts installed"), "Doctor should report prompt installation");
    assert.ok(stdout.includes("Harness contracts"), "Doctor should report harness readiness");
  });

  it("reports missing state dir before setup", () => {
    const { stdout } = run(["doctor", "--scope", "project"], tmp);
    assert.ok(stdout.includes("missing") || stdout.includes("not found"));
  });
});

describe("omr status", () => {
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

describe("omr skills", () => {
  it("lists installed skills from package dir", () => {
    const { stdout, exitCode } = run(["skills"]);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("OMR Skills"));
    assert.ok(stdout.includes("Core Path"));
    assert.ok(stdout.includes("Optional Extras"));
    const expected = [
      "omr-ai-slop-cleaner", "omr-analyze", "omr-ask", "omr-autopilot",
      "omr-blueprint", "omr-cancel", "omr-code-review", "omr-dashboard",
      "omr-deep-interview", "omr-ecomode", "omr-forge", "omr-git-master",
      "omr-ralplan", "omr-tdd", "omr-team", "omr-web-clone", "omr-wiki",
    ];
    for (const name of expected) {
      assert.ok(stdout.includes(`/${name}`), `Missing skill: /${name}`);
    }
    assert.ok(stdout.includes("skills available"));
  });
});

describe("omr team watch", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("help text advertises team watch", () => {
    const { stdout, exitCode } = run(["help"]);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("team watch"));
  });

  it("dumps existing blackboard messages with --no-follow", () => {
    const stateDir = join(tmp, ".omr");
    mkdirSync(stateDir, { recursive: true });
    const bbPath = join(stateDir, "blackboard.jsonl");
    const rows = [
      { ts: "2026-04-07T14:22:01Z", agent: "lane-1-executor", lane: "runABC-lane-1", role: "executor", kind: "status", content: "started" },
      { ts: "2026-04-07T14:22:03Z", agent: "lane-1-executor", lane: "runABC-lane-1", role: "executor", kind: "claim", content: "src/api/users.ts" },
      { ts: "2026-04-07T14:22:05Z", agent: "lane-2-designer", lane: "other-lane-2", role: "designer", kind: "progress", content: "other run" },
    ];
    writeFileSync(bbPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

    const { stdout, exitCode } = run(["team", "watch", "--run", "runABC", "--no-follow"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Team chatter — run runABC"));
    assert.ok(stdout.includes("lane-1·executor"));
    assert.ok(stdout.includes("src/api/users.ts"));
    assert.ok(!stdout.includes("other run"), "other runs must be filtered out");
  });

  it("dumps the full blackboard when no --run is given", () => {
    const stateDir = join(tmp, ".omr");
    mkdirSync(stateDir, { recursive: true });
    const bbPath = join(stateDir, "blackboard.jsonl");
    writeFileSync(
      bbPath,
      JSON.stringify({ ts: "2026-04-07T14:22:01Z", agent: "leader", kind: "note", content: "dispatching" }) + "\n",
    );
    const { stdout, exitCode } = run(["team", "watch", "--no-follow"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("dispatching"));
  });

  it("handles an empty blackboard gracefully", () => {
    const { stdout, exitCode } = run(["team", "watch", "--no-follow"], tmp);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Team chatter"));
  });

  it("rejects unknown team subcommand", () => {
    const { stderr, stdout, exitCode } = run(["team", "nope"], tmp);
    assert.equal(exitCode, 1);
    assert.ok((stdout + stderr).includes("omr team watch"));
  });
});

describe("omr notify", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("emits a core notification and lists it in recent", () => {
    const emitted = run([
      "notify", "emit",
      "--task-id", "dashboard-scan",
      "--summary", "Dashboard tick completed",
      "--status", "warn",
      "--no-desktop",
    ], tmp);
    assert.equal(emitted.exitCode, 0);
    assert.ok(emitted.stdout.includes("Notification emitted"));

    const recent = run(["notify", "recent", "--limit", "5"], tmp);
    assert.equal(recent.exitCode, 0);
    assert.ok(recent.stdout.includes("dashboard-scan"));
    assert.ok(recent.stdout.includes("Dashboard tick completed"));
  });

  it("shows empty state when no notifications exist", () => {
    const recent = run(["notify", "recent"], tmp);
    assert.equal(recent.exitCode, 0);
    assert.ok(recent.stdout.includes("No notifications yet."));
  });

  it("test-desktop honors command override", () => {
    const result = run(
      ["notify", "test-desktop", "hello from test"],
      tmp,
      { OMR_DESKTOP_NOTIFY_COMMAND: "true" },
    );
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes("Desktop notification sent."));
  });
});

describe("omr schedule", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpProject(); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("lists schedule tasks", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "schedule-state.json"), JSON.stringify({
      mode: "schedule",
      status: "active",
      started_at: "2026-04-15T00:00:00Z",
      tasks: [
        {
          id: "dashboard-scan",
          description: "Scan dashboard every 10 minutes",
          interval_seconds: 600,
          state: "running",
          run_count: 2,
          params: {},
          created_at: "2026-04-15T00:00:00Z",
          last_run_at: "2026-04-15T00:10:00Z",
          last_result: "All green",
          next_run_at: "2026-04-15T00:20:00Z",
        },
      ],
    }, null, 2));

    const result = run(
      ["schedule", "list"],
      tmp,
    );

    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes("Scheduled Tasks"));
    assert.ok(result.stdout.includes("dashboard-scan"));
    assert.ok(result.stdout.includes("All green"));
  });

  it("cancel, resume, and run-now update schedule state", () => {
    const stateDir = join(tmp, ".omr", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "schedule-state.json"), JSON.stringify({
      mode: "schedule",
      status: "active",
      started_at: "2026-04-15T00:00:00Z",
      tasks: [
        {
          id: "dashboard-scan",
          description: "Scan dashboard every 10 minutes",
          interval_seconds: 600,
          state: "suspended",
          run_count: 2,
          params: {},
          created_at: "2026-04-15T00:00:00Z",
          last_run_at: "2026-04-15T00:10:00Z",
          last_result: "All green",
          next_run_at: null,
        },
      ],
    }, null, 2));

    const resumed = run(["schedule", "resume", "dashboard-scan"], tmp);
    assert.equal(resumed.exitCode, 0);
    assert.ok(resumed.stdout.includes("Resumed scheduled task"));

    const runNow = run(["schedule", "run-now", "dashboard-scan"], tmp);
    assert.equal(runNow.exitCode, 0);
    assert.ok(runNow.stdout.includes("Requested immediate run"));

    const cancelled = run(["schedule", "cancel", "dashboard-scan"], tmp);
    assert.equal(cancelled.exitCode, 0);
    assert.ok(cancelled.stdout.includes("Cancelled scheduled task"));

    const state = JSON.parse(readFileSync(join(stateDir, "schedule-state.json"), "utf-8"));
    assert.equal(state.tasks[0].state, "cancelled");
    assert.equal(state.tasks[0].next_run_at, null);
  });

  it("registers a user-scope RSS task", () => {
    const userRoot = join(tmp, "user-omr");
    mkdirSync(join(userRoot, "state"), { recursive: true });

    const result = run([
      "schedule",
      "add-rss",
      "--scope", "user",
      "--url", "https://duanyytop.github.io/agents-radar/feed.xml",
      "--every", "15m",
      "--title", "Agents Radar RSS",
    ], tmp, { OMR_USER_DATA_ROOT: userRoot });

    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes("Registered RSS scheduled task"));

    const state = JSON.parse(readFileSync(join(userRoot, "state", "schedule-state.json"), "utf-8"));
    assert.equal(state.tasks.length, 1);
    assert.equal(state.tasks[0].scope, "user");
    assert.equal(state.tasks[0].type, "rss-watch");
    assert.equal(state.tasks[0].params.feed_url, "https://duanyytop.github.io/agents-radar/feed.xml");
    assert.equal(typeof state.tasks[0].run_now_requested_at, "string");
  });
});

describe("omr setup --scope invalid", () => {
  it("exits with error for invalid scope", () => {
    const { exitCode } = run(["setup", "--scope", "invalid"]);
    assert.equal(exitCode, 1);
  });
});

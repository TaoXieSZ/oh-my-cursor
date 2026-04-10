import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cursorRulesDir,
  cursorSkillsDir,
  cursorMcpConfigPath,
  cursorHooksConfigPath,
  omcStateDir,
  omcPlansDir,
  omcLogsDir,
  omcStatePath,
  omcSetupScopePath,
  omcNotepadPath,
  omcProjectMemoryPath,
  packageRulesDir,
  packageSkillsDir,
  packagePromptsDir,
  packageHooksDir,
  omcPromptsDir,
  omcHooksDir,
  isCursorInstalled,
} from "../utils/paths.js";
import { ensureDir, copyDir, copyFile } from "../utils/fs.js";
import { ok, warn, fail, info, heading, dim } from "../utils/log.js";

interface SetupOptions {
  scope: "user" | "project";
  force: boolean;
  verbose: boolean;
}

const DEPRECATED_SKILLS = ["omc-plan", "omc-ralph", "omc-ralplan"];

export async function setup(options: SetupOptions): Promise<void> {
  heading("oh-my-cursor setup");
  info(`Scope: ${options.scope}`);

  if (!isCursorInstalled()) {
    warn("Cursor home (~/.cursor) not detected. Proceeding anyway...");
  }

  const steps = [
    { name: "Install rules", fn: () => installRules(options) },
    { name: "Install skills", fn: () => installSkills(options) },
    { name: "Install prompts", fn: () => installPrompts(options) },
    { name: "Register MCP servers", fn: () => registerMcp(options) },
    { name: "Install hooks", fn: () => installHooks(options) },
    { name: "Create state directories", fn: () => createStateDirs(options) },
    { name: "Write setup metadata", fn: () => writeSetupMeta(options) },
  ];

  let passed = 0;
  for (const step of steps) {
    try {
      await step.fn();
      passed++;
    } catch (err) {
      fail(`${step.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log();
  if (passed === steps.length) {
    ok(`Setup complete (${passed}/${steps.length} steps)`);
    console.log();
    dim("Next steps:");
    dim("  1. Restart Cursor to load new rules and skills");
    dim("  2. Run 'omc doctor' to verify installation");
    dim("  3. Try '/deep-interview \"describe your task\"' in Cursor chat");
  } else {
    warn(`Setup partially complete (${passed}/${steps.length} steps)`);
    dim("Run 'omc doctor' to diagnose issues");
  }
}

function installRules(options: SetupOptions): void {
  const srcDir = packageRulesDir();
  const destDir = cursorRulesDir(options.scope);

  if (!existsSync(srcDir)) {
    throw new Error(`Rules source not found: ${srcDir}`);
  }

  const count = copyDir(srcDir, destDir);
  ok(`Installed ${count} rule files → ${destDir}`);
}

function installSkills(options: SetupOptions): void {
  const srcDir = packageSkillsDir();
  const destDir = cursorSkillsDir(options.scope);

  if (!existsSync(srcDir)) {
    throw new Error(`Skills source not found: ${srcDir}`);
  }

  const count = copyDir(srcDir, destDir);
  const removed = removeDeprecatedSkills(destDir);
  ok(`Installed ${count} skill files → ${destDir}`);
  if (removed.length > 0) {
    ok(`Removed deprecated skills: ${removed.join(", ")}`);
  }
}

function removeDeprecatedSkills(skillsDir: string): string[] {
  const removed: string[] = [];
  for (const skill of DEPRECATED_SKILLS) {
    const path = join(skillsDir, skill);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    removed.push(skill);
  }
  return removed;
}

function installPrompts(options: SetupOptions): void {
  const srcDir = packagePromptsDir();
  const destDir = omcPromptsDir(options.scope);

  if (!existsSync(srcDir)) {
    throw new Error(`Prompts source not found: ${srcDir}`);
  }

  const count = copyDir(srcDir, destDir);
  ok(`Installed ${count} prompt files → ${destDir}`);
}

function registerMcp(options: SetupOptions): void {
  const configPath = cursorMcpConfigPath(options.scope);

  let config: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      if (!options.force) {
        warn(`Could not parse existing ${configPath}, skipping MCP registration`);
        return;
      }
    }
  }

  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;

  mcpServers["omc-state"] = {
    command: "node",
    args: [getMcpServerPath("state-server.js")],
    env: {
      OMC_PROJECT_ROOT: process.cwd(),
    },
  };

  mcpServers["omc-memory"] = {
    command: "node",
    args: [getMcpServerPath("memory-server.js")],
    env: {
      OMC_PROJECT_ROOT: process.cwd(),
    },
  };

  config.mcpServers = mcpServers;

  ensureDir(join(configPath, ".."));
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  ok(`Registered MCP servers → ${configPath}`);
}

function installHooks(options: SetupOptions): void {
  const srcDir = packageHooksDir();
  const destDir = omcHooksDir(options.scope);

  if (!existsSync(srcDir)) {
    warn("Hooks source not found, skipping hooks installation");
    return;
  }

  const count = copyDir(srcDir, destDir);

  const hooksConfigPath = cursorHooksConfigPath(options.scope);
  let config: Record<string, unknown> = { version: 1, hooks: {} };
  if (existsSync(hooksConfigPath)) {
    try {
      config = JSON.parse(readFileSync(hooksConfigPath, "utf-8"));
    } catch {
      if (!options.force) {
        warn(`Could not parse existing ${hooksConfigPath}, skipping hooks config`);
        return;
      }
    }
  }

  const hooks = (config.hooks ?? {}) as Record<string, unknown[]>;

  // Quote paths to handle project/user directories containing spaces.
  const sessionStartCmd = `node "${destDir}/session-start.mjs"`;
  const stopCmd = `node "${destDir}/session-end.mjs"`;

  function addHookIfMissing(event: string, command: string): void {
    if (!hooks[event]) hooks[event] = [];
    const entries = hooks[event] as Array<{ command: string }>;
    if (!entries.some((e) => e.command === command)) {
      entries.push({ command });
    }
  }

  addHookIfMissing("sessionStart", sessionStartCmd);
  addHookIfMissing("stop", stopCmd);

  config.hooks = hooks;
  ensureDir(join(hooksConfigPath, ".."));
  writeFileSync(hooksConfigPath, JSON.stringify(config, null, 2) + "\n");

  ok(`Installed ${count} hook files → ${destDir}`);
  ok(`Registered hooks → ${hooksConfigPath}`);
}

function createStateDirs(options: SetupOptions): void {
  const dirs = [omcStateDir(), omcPlansDir(), omcLogsDir(), omcStatePath()];

  for (const dir of dirs) {
    ensureDir(dir);
  }

  if (!existsSync(omcNotepadPath())) {
    writeFileSync(omcNotepadPath(), "# OMC Notepad\n\nScratch notes for the current project.\n");
  }
  if (!existsSync(omcProjectMemoryPath())) {
    writeFileSync(omcProjectMemoryPath(), "{}\n");
  }

  if (options.scope === "project") {
    appendToGitignore();
  }

  ok(`Created .omc/ state directories`);
}

function writeSetupMeta(options: SetupOptions): void {
  const meta = {
    scope: options.scope,
    version: "0.1.0",
    installedAt: new Date().toISOString(),
    projectRoot: process.cwd(),
  };

  writeFileSync(omcSetupScopePath(), JSON.stringify(meta, null, 2) + "\n");
  ok("Wrote setup metadata");
}

function appendToGitignore(): void {
  const gitignorePath = join(process.cwd(), ".gitignore");
  const marker = ".omc/";

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (content.includes(marker)) return;
    writeFileSync(gitignorePath, content.trimEnd() + "\n" + marker + "\n");
  } else {
    writeFileSync(gitignorePath, marker + "\n");
  }
  dim("Added .omc/ to .gitignore");
}

function getMcpServerPath(filename: string): string {
  const thisFile = new URL(import.meta.url).pathname;
  const parts = thisFile.split("/");
  const distRoot = parts.slice(0, -2).join("/");
  return join(distRoot, "mcp", filename);
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  cursorRulesDir,
  cursorSkillsDir,
  cursorMcpConfigPath,
  cursorHooksConfigPath,
  omcStateDir,
  omcPlansDir,
  omcStatePath,
  omcSetupScopePath,
  omcPromptsDir,
  omcHooksDir,
  isCursorInstalled,
} from "../utils/paths.js";
import { ok, warn, fail, info, heading, dim } from "../utils/log.js";
import { inspectHarnessReadiness } from "../state/harness.js";

interface DoctorOptions {
  scope: "user" | "project";
  force: boolean;
  verbose: boolean;
}

interface Check {
  name: string;
  fn: () => CheckResult;
}

interface CheckResult {
  ok: boolean;
  message: string;
  detail?: string;
}

export async function doctor(options: DoctorOptions): Promise<void> {
  heading("oh-my-cursor doctor");

  const scope = detectScope(options);
  info(`Checking scope: ${scope}`);

  const checks: Check[] = [
    { name: "Node.js version", fn: checkNodeVersion },
    { name: "Cursor installation", fn: checkCursorInstalled },
    { name: "OMC rules", fn: () => checkRulesInstalled(scope) },
    { name: "OMC skills", fn: () => checkSkillsInstalled(scope) },
    { name: "OMC prompts", fn: () => checkPromptsInstalled(scope) },
    { name: "MCP servers", fn: () => checkMcpRegistered(scope) },
    { name: "Hooks", fn: () => checkHooksInstalled(scope) },
    { name: "State directory", fn: checkStateDir },
    { name: "Setup metadata", fn: checkSetupMeta },
    { name: "Harness contracts", fn: checkHarnessContracts },
  ];

  let passed = 0;
  let warned = 0;

  for (const check of checks) {
    const result = check.fn();
    if (result.ok) {
      ok(result.message);
      passed++;
    } else {
      fail(result.message);
    }
    if (result.detail && options.verbose) {
      dim(result.detail);
    }
  }

  console.log();
  if (passed === checks.length) {
    ok(`All ${checks.length} checks passed`);
  } else {
    warn(`${passed}/${checks.length} checks passed`);
    dim("Run 'omr setup' to fix issues");
  }
}

function detectScope(options: DoctorOptions): "user" | "project" {
  if (existsSync(omcSetupScopePath())) {
    try {
      const meta = JSON.parse(readFileSync(omcSetupScopePath(), "utf-8"));
      return meta.scope ?? options.scope;
    } catch {
      // fall through
    }
  }
  return options.scope;
}

function checkNodeVersion(): CheckResult {
  const major = parseInt(process.version.slice(1), 10);
  if (major >= 20) {
    return { ok: true, message: `Node.js ${process.version}` };
  }
  return {
    ok: false,
    message: `Node.js ${process.version} (requires >=20)`,
  };
}

function checkCursorInstalled(): CheckResult {
  if (isCursorInstalled()) {
    return { ok: true, message: "Cursor installation detected" };
  }
  return {
    ok: false,
    message: "Cursor home (~/.cursor) not found",
    detail: "Install Cursor from https://cursor.sh",
  };
}

function checkRulesInstalled(scope: "user" | "project"): CheckResult {
  const dir = cursorRulesDir(scope);
  if (!existsSync(dir)) {
    return { ok: false, message: `Rules directory missing: ${dir}` };
  }

  const omcRules = readdirSync(dir).filter((f) => f.startsWith("omc-"));
  if (omcRules.length === 0) {
    return { ok: false, message: `No OMC rules found in ${dir}` };
  }

  return {
    ok: true,
    message: `${omcRules.length} OMC rules installed`,
    detail: omcRules.join(", "),
  };
}

function checkSkillsInstalled(scope: "user" | "project"): CheckResult {
  const dir = cursorSkillsDir(scope);
  if (!existsSync(dir)) {
    return { ok: false, message: `Skills directory missing: ${dir}` };
  }

  const omcSkills = readdirSync(dir).filter((f) => f.startsWith("omc-"));
  if (omcSkills.length === 0) {
    return { ok: false, message: `No OMC skills found in ${dir}` };
  }

  return {
    ok: true,
    message: `${omcSkills.length} OMC skills installed`,
    detail: omcSkills.join(", "),
  };
}

function checkPromptsInstalled(scope: "user" | "project"): CheckResult {
  const dir = omcPromptsDir(scope);
  if (!existsSync(dir)) {
    return { ok: false, message: `Prompts directory missing: ${dir}` };
  }

  const allMd = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const prompts = allMd.filter((f) => !f.startsWith("_"));
  if (prompts.length === 0) {
    return { ok: false, message: `No prompt files found in ${dir}` };
  }

  const partials = allMd.filter((f) => f.startsWith("_"));
  const detail = prompts.map((f) => f.replace(".md", "")).join(", ")
    + (partials.length > 0 ? ` (partials: ${partials.map((f) => f.replace(".md", "")).join(", ")})` : "");

  return {
    ok: true,
    message: `${prompts.length} role prompts installed`,
    detail,
  };
}

function checkMcpRegistered(scope: "user" | "project"): CheckResult {
  const configPath = cursorMcpConfigPath(scope);
  if (!existsSync(configPath)) {
    return { ok: false, message: `MCP config not found: ${configPath}` };
  }

  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const servers = config.mcpServers ?? {};
    const omcServers = Object.keys(servers).filter((k) => k.startsWith("omc-"));

    if (omcServers.length === 0) {
      return { ok: false, message: "No OMC MCP servers registered" };
    }

    return {
      ok: true,
      message: `${omcServers.length} MCP servers registered`,
      detail: omcServers.join(", "),
    };
  } catch {
    return { ok: false, message: `Cannot parse ${configPath}` };
  }
}

function checkHooksInstalled(scope: "user" | "project"): CheckResult {
  const hooksDir = omcHooksDir(scope);
  const configPath = cursorHooksConfigPath(scope);

  if (!existsSync(hooksDir)) {
    return { ok: false, message: `Hooks directory missing: ${hooksDir}`, detail: "Run 'omr setup' to install hooks" };
  }

  const hookFiles = readdirSync(hooksDir).filter((f) => f.endsWith(".mjs"));
  if (hookFiles.length === 0) {
    return { ok: false, message: "No OMC hook scripts found" };
  }

  for (const file of hookFiles) {
    const check = spawnSync(process.execPath, ["--check", join(hooksDir, file)], {
      stdio: "pipe",
      encoding: "utf-8",
    });
    if (check.status !== 0) {
      return {
        ok: false,
        message: `Hook syntax invalid: ${file}`,
        detail: check.stderr?.trim() || check.stdout?.trim(),
      };
    }
  }

  if (!existsSync(configPath)) {
    return { ok: false, message: `Hooks config missing: ${configPath}` };
  }

  return {
    ok: true,
    message: `${hookFiles.length} hooks installed and syntax-checked`,
    detail: hookFiles.join(", "),
  };
}

function checkStateDir(): CheckResult {
  const dir = omcStateDir();
  if (!existsSync(dir)) {
    return { ok: false, message: ".omc/ directory missing" };
  }

  const subdirs = ["state", "plans", "logs"].filter((d) =>
    existsSync(`${dir}/${d}`)
  );

  return {
    ok: subdirs.length === 3,
    message: `.omc/ structure: ${subdirs.length}/3 subdirectories`,
    detail: subdirs.join(", "),
  };
}

function checkSetupMeta(): CheckResult {
  const path = omcSetupScopePath();
  if (!existsSync(path)) {
    return { ok: false, message: "Setup metadata missing (run 'omr setup')" };
  }

  try {
    const meta = JSON.parse(readFileSync(path, "utf-8"));
    return {
      ok: true,
      message: `Setup: scope=${meta.scope}, v${meta.version}, installed ${meta.installedAt}`,
    };
  } catch {
    return { ok: false, message: "Setup metadata corrupted" };
  }
}

function checkHarnessContracts(): CheckResult {
  const readiness = inspectHarnessReadiness();
  const details = readiness.checks.map((check) =>
    `[${check.status}] ${check.summary}${check.detail ? ` — ${check.detail}` : ""}`
  );
  return {
    ok: readiness.ok,
    message: readiness.ok
      ? `Harness contracts valid (${readiness.summary.okCount}/${readiness.summary.checkCount} checks passed)`
      : `Harness contracts invalid (${readiness.summary.errorCount} error${readiness.summary.errorCount === 1 ? "" : "s"})`,
    detail: details.join("\n"),
  };
}

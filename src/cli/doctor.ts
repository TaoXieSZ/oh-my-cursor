import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  cursorRulesDir,
  cursorSkillsDir,
  cursorMcpConfigPath,
  omcStateDir,
  omcPlansDir,
  omcStatePath,
  omcSetupScopePath,
  isCursorInstalled,
} from "../utils/paths.js";
import { ok, warn, fail, info, heading, dim } from "../utils/log.js";

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
    { name: "MCP servers", fn: () => checkMcpRegistered(scope) },
    { name: "State directory", fn: checkStateDir },
    { name: "Setup metadata", fn: checkSetupMeta },
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
    dim("Run 'omc setup' to fix issues");
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
    return { ok: false, message: "Setup metadata missing (run 'omc setup')" };
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

import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

export type OmcPathScope = "user" | "project";

export function cursorHome(): string {
  return join(homedir(), ".cursor");
}

export function cursorRulesDir(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "rules");
  }
  return join(cursorHome(), "rules");
}

export function cursorSkillsDir(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "skills");
  }
  return join(cursorHome(), "skills");
}

export function cursorMcpConfigPath(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "mcp.json");
  }
  return join(cursorHome(), "mcp.json");
}

export function omcUserDataDir(): string {
  return process.env["OMC_USER_OMC_ROOT"]?.trim() || join(cursorHome(), "omr");
}

export function omcStateDir(scope: OmcPathScope = "project"): string {
  if (scope === "user") {
    return omcUserDataDir();
  }
  return join(process.cwd(), ".omc");
}

export function omcPlansDir(scope: OmcPathScope = "project"): string {
  return join(omcStateDir(scope), "plans");
}

export function omcLogsDir(scope: OmcPathScope = "project"): string {
  return join(omcStateDir(scope), "logs");
}

export function omcStatePath(scope: OmcPathScope = "project"): string {
  return join(omcStateDir(scope), "state");
}

export function omcSetupScopePath(scope: OmcPathScope = "project"): string {
  return join(omcStateDir(scope), "setup-scope.json");
}

export function omcProjectMemoryPath(scope: OmcPathScope = "project"): string {
  return join(omcStateDir(scope), "project-memory.json");
}

export function omcNotepadPath(scope: OmcPathScope = "project"): string {
  return join(omcStateDir(scope), "notepad.md");
}

export function isCursorInstalled(): boolean {
  return existsSync(cursorHome());
}

/**
 * Resolve the package root (where rules/ and skills/ live).
 * Works both in dev (src/) and installed (dist/) contexts.
 */
export function packageRoot(): string {
  const thisFile = new URL(import.meta.url).pathname;
  // src/utils/paths.ts or dist/utils/paths.js → go up 3 levels
  const parts = thisFile.split("/");
  return parts.slice(0, -3).join("/");
}

export function packageRulesDir(): string {
  return join(packageRoot(), "rules");
}

export function packageSkillsDir(): string {
  return join(packageRoot(), "skills");
}

export function packagePromptsDir(): string {
  return join(packageRoot(), "prompts");
}

export function omcPromptsDir(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".omc", "prompts");
  }
  return join(cursorHome(), "omr-prompts");
}

export function cursorHooksConfigPath(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "hooks.json");
  }
  return join(cursorHome(), "hooks.json");
}

export function omcHooksDir(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "hooks", "omc");
  }
  return join(cursorHome(), "hooks", "omc");
}

export function packageHooksDir(): string {
  return join(packageRoot(), "hooks");
}

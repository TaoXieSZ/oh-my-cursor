import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

export type OmrPathScope = "user" | "project";

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

export function omrUserDataDir(): string {
  return process.env["OMR_USER_DATA_ROOT"]?.trim() || join(cursorHome(), "omr");
}

export function omrStateDir(scope: OmrPathScope = "project"): string {
  if (scope === "user") {
    return omrUserDataDir();
  }
  return join(process.cwd(), ".omr");
}

export function omrPlansDir(scope: OmrPathScope = "project"): string {
  return join(omrStateDir(scope), "plans");
}

export function omrLogsDir(scope: OmrPathScope = "project"): string {
  return join(omrStateDir(scope), "logs");
}

export function omrStatePath(scope: OmrPathScope = "project"): string {
  return join(omrStateDir(scope), "state");
}

export function omrSetupScopePath(scope: OmrPathScope = "project"): string {
  return join(omrStateDir(scope), "setup-scope.json");
}

export function omrProjectMemoryPath(scope: OmrPathScope = "project"): string {
  return join(omrStateDir(scope), "project-memory.json");
}

export function omrNotepadPath(scope: OmrPathScope = "project"): string {
  return join(omrStateDir(scope), "notepad.md");
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

export function omrPromptsDir(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".omr", "prompts");
  }
  return join(cursorHome(), "omr-prompts");
}

export function cursorHooksConfigPath(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "hooks.json");
  }
  return join(cursorHome(), "hooks.json");
}

export function omrHooksDir(scope: "user" | "project"): string {
  if (scope === "project") {
    return join(process.cwd(), ".cursor", "hooks", "omr");
  }
  return join(cursorHome(), "hooks", "omr");
}

export function packageHooksDir(): string {
  return join(packageRoot(), "hooks");
}

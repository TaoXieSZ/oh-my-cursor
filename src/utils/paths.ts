import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

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

export function omcStateDir(): string {
  return join(process.cwd(), ".omc");
}

export function omcPlansDir(): string {
  return join(omcStateDir(), "plans");
}

export function omcLogsDir(): string {
  return join(omcStateDir(), "logs");
}

export function omcStatePath(): string {
  return join(omcStateDir(), "state");
}

export function omcSetupScopePath(): string {
  return join(omcStateDir(), "setup-scope.json");
}

export function omcProjectMemoryPath(): string {
  return join(omcStateDir(), "project-memory.json");
}

export function omcNotepadPath(): string {
  return join(omcStateDir(), "notepad.md");
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
  return join(cursorHome(), "omc-prompts");
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

import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, readdirSync } from "node:fs";

export type OmrStateScope = "project" | "user";

export function getProjectRoot(): string {
  return process.env["OMR_PROJECT_ROOT"] ?? process.cwd();
}

export function getUserStateRoot(): string {
  return process.env["OMR_USER_DATA_ROOT"]?.trim() || join(homedir(), ".cursor", "omr");
}

export function getBaseStateDir(scope: OmrStateScope = "project"): string {
  if (scope === "user") {
    return getUserStateRoot();
  }
  return join(getProjectRoot(), ".omr");
}

export function getStatePath(filename: string, scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "state", filename);
}

export function getModeStatePath(mode: string, runId?: string, scope: OmrStateScope = "project"): string {
  if (runId) return getStatePath(`${mode}-${runId}-state.json`, scope);
  return getStatePath(`${mode}-state.json`, scope);
}

/**
 * List state files matching a mode (or all modes).
 * Returns filenames only (not full paths), e.g. ["forge-a1b2c3d4-state.json"].
 */
export function listModeStateFiles(mode?: string, scope: OmrStateScope = "project"): string[] {
  const stateDir = join(getBaseStateDir(scope), "state");
  if (!existsSync(stateDir)) return [];

  const files = readdirSync(stateDir).filter(f => f.endsWith("-state.json") && f !== "session.json");
  if (!mode) return files;

  return files.filter(f => {
    const prefix = f.replace(/-state\.json$/, "");
    return prefix === mode || prefix.startsWith(mode + "-");
  });
}

export function getSessionPath(): string {
  return getStatePath("session.json");
}

export function getScopedSessionPath(scope: OmrStateScope = "project"): string {
  return getStatePath("session.json", scope);
}

export function getTeamDir(teamName?: string): string {
  const base = join(getBaseStateDir(), "state", "team");
  return teamName ? join(base, teamName) : base;
}

export function getWorkerProgressPath(workerId: string): string {
  return join(getTeamDir(), workerId, "progress.json");
}

export function getPlanPath(filename: string): string {
  return join(getBaseStateDir(), "plans", filename);
}

export function getScopedPlanPath(filename: string, scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "plans", filename);
}

export function getLogPath(filename: string): string {
  return join(getBaseStateDir(), "logs", filename);
}

export function getScopedLogPath(filename: string, scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "logs", filename);
}

export function getEventLogPath(runId: string): string {
  return getLogPath(`${runId}.jsonl`);
}

export function getScopedEventLogPath(runId: string, scope: OmrStateScope = "project"): string {
  return getScopedLogPath(`${runId}.jsonl`, scope);
}

export function getNotepadPath(): string {
  return join(getBaseStateDir(), "notepad.md");
}

export function getScopedNotepadPath(scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "notepad.md");
}

export function getProjectMemoryPath(): string {
  return join(getBaseStateDir(), "project-memory.json");
}

export function getScopedProjectMemoryPath(scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "project-memory.json");
}

export function getMemoryIndexPath(): string {
  return join(getBaseStateDir(), "memory-index.json");
}

export function getScopedMemoryIndexPath(scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "memory-index.json");
}

export function getNotificationLogPath(): string {
  return join(getBaseStateDir(), "state", "notifications.jsonl");
}

export function getScopedNotificationLogPath(scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "state", "notifications.jsonl");
}

export function getBlackboardPath(): string {
  return join(getBaseStateDir(), "blackboard.jsonl");
}

export function getScopedBlackboardPath(scope: OmrStateScope = "project"): string {
  return join(getBaseStateDir(scope), "blackboard.jsonl");
}

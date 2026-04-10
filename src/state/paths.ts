import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";

export function getProjectRoot(): string {
  return process.env["OMC_PROJECT_ROOT"] ?? process.cwd();
}

export function getBaseStateDir(): string {
  return join(getProjectRoot(), ".omc");
}

export function getStatePath(filename: string): string {
  return join(getBaseStateDir(), "state", filename);
}

export function getModeStatePath(mode: string, runId?: string): string {
  if (runId) return getStatePath(`${mode}-${runId}-state.json`);
  return getStatePath(`${mode}-state.json`);
}

/**
 * List state files matching a mode (or all modes).
 * Returns filenames only (not full paths), e.g. ["forge-a1b2c3d4-state.json"].
 */
export function listModeStateFiles(mode?: string): string[] {
  const stateDir = join(getBaseStateDir(), "state");
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

export function getLogPath(filename: string): string {
  return join(getBaseStateDir(), "logs", filename);
}

export function getEventLogPath(runId: string): string {
  return getLogPath(`${runId}.jsonl`);
}

export function getNotepadPath(): string {
  return join(getBaseStateDir(), "notepad.md");
}

export function getProjectMemoryPath(): string {
  return join(getBaseStateDir(), "project-memory.json");
}

export function getMemoryIndexPath(): string {
  return join(getBaseStateDir(), "memory-index.json");
}

export function getBlackboardPath(): string {
  return join(getBaseStateDir(), "blackboard.jsonl");
}

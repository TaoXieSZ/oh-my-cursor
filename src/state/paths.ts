import { join } from "node:path";

export function getProjectRoot(): string {
  return process.env["OMC_PROJECT_ROOT"] ?? process.cwd();
}

export function getBaseStateDir(): string {
  return join(getProjectRoot(), ".omc");
}

export function getStatePath(filename: string): string {
  return join(getBaseStateDir(), "state", filename);
}

export function getModeStatePath(mode: string): string {
  return getStatePath(`${mode}-state.json`);
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

export function getNotepadPath(): string {
  return join(getBaseStateDir(), "notepad.md");
}

export function getProjectMemoryPath(): string {
  return join(getBaseStateDir(), "project-memory.json");
}

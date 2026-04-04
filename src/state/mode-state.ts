import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { getModeStatePath, getBaseStateDir } from "./paths.js";
import { ensureDir } from "../utils/fs.js";

export interface ModeState {
  mode: string;
  started_at: string;
  status: "active" | "complete" | "cancelled" | "blocked";
  phase?: string;
  iteration?: number;
  task?: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
  [key: string]: unknown;
}

export function readModeState(mode: string): ModeState | null {
  const path = getModeStatePath(mode);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ModeState;
  } catch {
    return null;
  }
}

export function writeModeState(mode: string, state: ModeState): void {
  const path = getModeStatePath(mode);
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
}

export function startMode(mode: string, task: string, extra?: Record<string, unknown>): ModeState {
  const state: ModeState = {
    mode,
    started_at: new Date().toISOString(),
    status: "active",
    task,
    phase: "init",
    iteration: 0,
    completed_at: null,
    ...extra,
  };
  writeModeState(mode, state);
  return state;
}

export function updateMode(mode: string, updates: Partial<ModeState>): ModeState | null {
  const current = readModeState(mode);
  if (!current) return null;

  const updated = { ...current, ...updates };
  writeModeState(mode, updated);
  return updated;
}

export function completeMode(mode: string): ModeState | null {
  return updateMode(mode, {
    status: "complete",
    completed_at: new Date().toISOString(),
  });
}

export function cancelMode(mode: string): ModeState | null {
  return updateMode(mode, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  });
}

export function listActiveModes(): ModeState[] {
  const stateDir = join(getBaseStateDir(), "state");
  if (!existsSync(stateDir)) return [];

  return readdirSync(stateDir)
    .filter((f) => f.endsWith("-state.json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(stateDir, f), "utf-8")) as ModeState;
      } catch {
        return null;
      }
    })
    .filter((s): s is ModeState => s !== null && s.status === "active");
}

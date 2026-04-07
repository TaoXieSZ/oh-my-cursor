import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getModeStatePath, getBaseStateDir, listModeStateFiles } from "./paths.js";
import { ensureDir } from "../utils/fs.js";
import { notifyForgeStateChange } from "../notify/forge-notify.js";
import { appendEvent } from "./event-log.js";
import type { RunEvent } from "./event-log.js";

export interface ModeState {
  mode: string;
  runId?: string;
  started_at: string;
  status: "active" | "complete" | "cancelled" | "blocked";
  phase?: string;
  iteration?: number;
  task?: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
  [key: string]: unknown;
}

function stateFilePath(mode: string, state: ModeState): string {
  return getModeStatePath(mode, state.runId);
}

/**
 * Parse a state filename like "forge-a1b2c3d4-state.json" into { mode, runId }.
 * Legacy files like "forge-state.json" return runId undefined.
 */
export function parseStateFilename(filename: string): { mode: string; runId?: string } | null {
  const m = filename.match(/^(.+)-state\.json$/);
  if (!m) return null;
  const prefix = m[1];
  const dashIdx = prefix.lastIndexOf("-");
  if (dashIdx === -1) return { mode: prefix };
  const possibleRunId = prefix.slice(dashIdx + 1);
  if (/^[0-9a-f]{8}$/.test(possibleRunId)) {
    return { mode: prefix.slice(0, dashIdx), runId: possibleRunId };
  }
  return { mode: prefix };
}

export function readModeState(mode: string, runId?: string): ModeState | null {
  if (runId) {
    const path = getModeStatePath(mode, runId);
    if (!existsSync(path)) return null;
    try { return JSON.parse(readFileSync(path, "utf-8")) as ModeState; } catch { return null; }
  }

  const stateDir = join(getBaseStateDir(), "state");
  const files = listModeStateFiles(mode);

  let latestActive: ModeState | null = null;
  let latestOverall: ModeState | null = null;
  let latestActiveTs = -1;
  let latestOverallTs = -1;

  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8")) as ModeState;
      if (!data.mode) data.mode = mode;
      const ts = new Date(data.started_at ?? 0).getTime();

      if ((data.status === "active" || (data as any).active === true) && ts >= latestActiveTs) {
        latestActive = data;
        latestActiveTs = ts;
      }
      if (ts >= latestOverallTs) {
        latestOverall = data;
        latestOverallTs = ts;
      }
    } catch { /* skip corrupt */ }
  }

  if (latestActive) return latestActive;
  if (latestOverall) return latestOverall;

  // Legacy fallback: {mode}-state.json
  const legacyPath = getModeStatePath(mode);
  if (existsSync(legacyPath)) {
    try { return JSON.parse(readFileSync(legacyPath, "utf-8")) as ModeState; } catch { return null; }
  }

  return null;
}

export function writeModeState(mode: string, state: ModeState): void {
  const path = stateFilePath(mode, state);
  const previous = readModeState(mode, state.runId);
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");

  if (state.runId) {
    emitStateEvents(previous, state);
  }
  if (mode === "forge") {
    void notifyForgeStateChange(previous, state);
  }
}

function emitStateEvents(previous: ModeState | null, next: ModeState): void {
  if (!next.runId) return;
  const runId = next.runId;

  try {
    if (!previous) {
      appendEvent(runId, { ts: new Date().toISOString(), kind: "status", summary: `Started ${next.mode}` });
      return;
    }

    if (previous.phase !== next.phase && next.phase) {
      appendEvent(runId, {
        ts: new Date().toISOString(), kind: "phase",
        summary: `Phase: ${previous.phase ?? "none"} → ${next.phase}`,
      });
    }

    if (previous.status !== next.status) {
      appendEvent(runId, {
        ts: new Date().toISOString(), kind: "status",
        summary: `Status: ${previous.status} → ${next.status}`,
      });
    }

    if (previous.iteration !== next.iteration && next.iteration != null) {
      appendEvent(runId, {
        ts: new Date().toISOString(), kind: "iteration",
        summary: `Iteration ${next.iteration}`,
      });
    }
  } catch { /* event logging is best-effort */ }
}

export function startMode(mode: string, task: string, extra?: Record<string, unknown>): ModeState {
  const state: ModeState = {
    mode,
    runId: randomUUID().slice(0, 8),
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

export function updateMode(mode: string, updates: Partial<ModeState>, runId?: string): ModeState | null {
  const current = readModeState(mode, runId);
  if (!current) return null;

  const updated = { ...current, ...updates };
  writeModeState(mode, updated);
  return updated;
}

export function completeMode(mode: string, runId?: string): ModeState | null {
  return updateMode(mode, {
    status: "complete",
    completed_at: new Date().toISOString(),
  }, runId);
}

export function cancelMode(mode: string, runId?: string): ModeState | null {
  return updateMode(mode, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  }, runId);
}

export function listActiveModes(): ModeState[] {
  const stateDir = join(getBaseStateDir(), "state");
  if (!existsSync(stateDir)) return [];

  const files = listModeStateFiles();
  const results: ModeState[] = [];

  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8")) as ModeState;
      if (data.status === "active" || (data as any).active === true) {
        if (!data.mode) {
          const parsed = parseStateFilename(f);
          if (parsed) data.mode = parsed.mode;
        }
        results.push(data);
      }
    } catch { /* skip */ }
  }

  return results;
}

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getBaseStateDir, getSessionPath, listModeStateFiles } from "./paths.js";
import { parseStateFilename } from "./mode-state.js";
import { ensureDir } from "../utils/fs.js";

export interface ArchivedSession {
  runId?: string;
  session: { id: string; started_at: string; archived_at: string };
  task: string | null;
  modes: Record<string, unknown>[];
}

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Archive only completed/cancelled runs. Each non-active run becomes its own
 * archive file keyed by runId (or a timestamp-based id for legacy files).
 * Active runs are preserved in state/.
 * Returns list of archive paths created.
 */
export function archiveCompletedRuns(): string[] {
  const stateDir = join(getBaseStateDir(), "state");
  const archiveDir = join(getBaseStateDir(), "archive");
  if (!existsSync(stateDir)) return [];

  const files = listModeStateFiles();
  const archived: string[] = [];

  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8"));
      const isActive = data.active === true || data.status === "active";
      if (isActive) continue;

      const parsed = parseStateFilename(f);
      if (!data.mode && parsed) data.mode = parsed.mode;

      const runId = data.runId ?? parsed?.runId ?? new Date().toISOString().replace(/[:.]/g, "-");
      const archive: ArchivedSession = {
        runId,
        session: {
          id: runId,
          started_at: data.started_at ?? new Date().toISOString(),
          archived_at: new Date().toISOString(),
        },
        task: data.task ?? data.metadata?.task ?? null,
        modes: [data],
      };

      ensureDir(archiveDir);
      const archivePath = join(archiveDir, `${runId}.json`);
      writeFileSync(archivePath, JSON.stringify(archive, null, 2) + "\n");
      unlinkSync(join(stateDir, f));
      archived.push(archivePath);
    } catch { /* skip corrupt */ }
  }

  return archived;
}

/**
 * Archive the current session: bundle completed runs into individual archive
 * files, preserving any active runs. Clears session.json if no active runs remain.
 * Returns the first archive path, or null if nothing archived.
 */
export function archiveCurrentSession(): string | null {
  const archived = archiveCompletedRuns();

  if (archived.length > 0) {
    const remaining = listModeStateFiles();
    if (remaining.length === 0) {
      const sessionPath = getSessionPath();
      if (existsSync(sessionPath)) {
        try { unlinkSync(sessionPath); } catch { /* skip */ }
      }
    }
  }

  return archived[0] ?? null;
}

/**
 * Check if the current session is stale:
 * - No active modes AND most recent timestamp is older than threshold
 * Never considers a session stale while any mode is still active,
 * since another Cursor window may still be running that mode.
 */
export function isSessionStale(): boolean {
  const stateDir = join(getBaseStateDir(), "state");
  if (!existsSync(stateDir)) return false;

  const files = listModeStateFiles();
  if (files.length === 0) return false;

  let hasActive = false;
  let latestTimestamp = 0;

  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8"));
      if (data.active === true || data.status === "active") hasActive = true;
      const ts = new Date(data.updated_at ?? data.completed_at ?? data.started_at ?? 0).getTime();
      if (ts > latestTimestamp) latestTimestamp = ts;
    } catch { /* skip */ }
  }

  if (hasActive) return false;

  return (Date.now() - latestTimestamp) > STALE_THRESHOLD_MS;
}

/** List archived sessions (newest first). */
export function listArchives(): ArchivedSession[] {
  const archiveDir = join(getBaseStateDir(), "archive");
  if (!existsSync(archiveDir)) return [];

  return readdirSync(archiveDir)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try { return JSON.parse(readFileSync(join(archiveDir, f), "utf-8")) as ArchivedSession; }
      catch { return null; }
    })
    .filter((a): a is ArchivedSession => a !== null)
    .sort((a, b) => new Date(b.session.archived_at).getTime() - new Date(a.session.archived_at).getTime());
}

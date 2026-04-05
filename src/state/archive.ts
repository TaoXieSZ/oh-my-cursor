import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getBaseStateDir, getSessionPath } from "./paths.js";
import { ensureDir } from "../utils/fs.js";

export interface ArchivedSession {
  session: { id: string; started_at: string; archived_at: string };
  task: string | null;
  modes: Record<string, unknown>[];
}

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Archive the current session: bundle session + all mode states into
 * .omc/archive/<session-id>.json, then clear .omc/state/.
 * Returns the archive path, or null if nothing to archive.
 */
export function archiveCurrentSession(): string | null {
  const stateDir = join(getBaseStateDir(), "state");
  const archiveDir = join(getBaseStateDir(), "archive");

  if (!existsSync(stateDir)) return null;

  const sessionPath = getSessionPath();
  let session: Record<string, unknown> | null = null;
  if (existsSync(sessionPath)) {
    try { session = JSON.parse(readFileSync(sessionPath, "utf-8")); } catch { /* skip */ }
  }

  const modeFiles = readdirSync(stateDir).filter(f => f.endsWith("-state.json"));
  if (modeFiles.length === 0 && !session) return null;

  const modes: Record<string, unknown>[] = [];
  let task: string | null = null;
  for (const f of modeFiles) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8"));
      if (!data.mode) data.mode = f.replace(/-state\.json$/, "");
      modes.push(data);
      if (!task) task = data.task ?? data.metadata?.task ?? null;
    } catch { /* skip corrupt files */ }
  }

  const sessionId = (session?.id as string) ?? new Date().toISOString().replace(/[:.]/g, "-");
  const archive: ArchivedSession = {
    session: {
      id: sessionId,
      started_at: (session?.started_at as string) ?? modes[0]?.started_at as string ?? new Date().toISOString(),
      archived_at: new Date().toISOString(),
    },
    task,
    modes,
  };

  ensureDir(archiveDir);
  const archivePath = join(archiveDir, `${sessionId}.json`);
  writeFileSync(archivePath, JSON.stringify(archive, null, 2) + "\n");

  // Clean up state/
  for (const f of modeFiles) {
    try { unlinkSync(join(stateDir, f)); } catch { /* skip */ }
  }
  if (existsSync(sessionPath)) {
    try { unlinkSync(sessionPath); } catch { /* skip */ }
  }

  return archivePath;
}

/**
 * Check if the current session is stale:
 * - No active modes, OR
 * - All modes' most recent timestamp is older than threshold
 */
export function isSessionStale(): boolean {
  const stateDir = join(getBaseStateDir(), "state");
  if (!existsSync(stateDir)) return false;

  const modeFiles = readdirSync(stateDir).filter(f => f.endsWith("-state.json"));
  if (modeFiles.length === 0) return false;

  let hasActive = false;
  let latestTimestamp = 0;

  for (const f of modeFiles) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8"));
      if (data.active === true || data.status === "active") hasActive = true;
      const ts = new Date(data.updated_at ?? data.completed_at ?? data.started_at ?? 0).getTime();
      if (ts > latestTimestamp) latestTimestamp = ts;
    } catch { /* skip */ }
  }

  if (!hasActive) return true;

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

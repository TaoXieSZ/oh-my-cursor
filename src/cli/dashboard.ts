import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { watch, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { exec } from "node:child_process";
import { join } from "node:path";
import { ensureDir } from "../utils/fs.js";
import {
  getBaseStateDir,
  getSessionPath,
  getNotepadPath,
  getProjectMemoryPath,
  getMemoryIndexPath,
  listModeStateFiles,
} from "../state/paths.js";
import { parseStateFilename } from "../state/mode-state.js";
import { readMemoryIndex, getKeysForRun } from "../state/memory-index.js";
import type { MemoryIndexMap } from "../state/memory-index.js";
import * as log from "../utils/log.js";
import { getHTML } from "./dashboard-html.js";
import { isSessionStale, archiveCurrentSession, listArchives } from "../state/archive.js";
import type { ArchivedSession } from "../state/archive.js";
import { tailEvents, readEvents } from "../state/event-log.js";
import type { RunEvent } from "../state/event-log.js";
import { tailNotifications } from "../notify/notification-store.js";
import type { NotificationEvent } from "../notify/notification-store.js";

export interface PlanInfo {
  name: string;
  preview: string;
  modifiedAt: string;
  title: string;
}

export interface ModeInfo {
  mode: string;
  runId?: string;
  chatId?: string;
  status?: "active" | "complete" | "cancelled" | "blocked" | string;
  active?: boolean;
  phase?: string;
  iteration?: number;
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  task?: string;
  metadata?: Record<string, unknown>;
  recentEvents?: RunEvent[];
  memoryKeysModified?: string[];
}

export interface StatsData {
  successRate: number;
  avgDurationMs: number;
  totalEvents: number;
  totalRuns: number;
}

export interface DashboardState {
  session: { id: string; started_at: string } | null;
  activeTask: string | null;
  activeModes: ModeInfo[];
  completedModes: ModeInfo[];
  archivedSessions: ArchivedSession[];
  stats: StatsData;
  notifications: NotificationEvent[];
  plans: PlanInfo[];
  memory: Record<string, unknown>;
  memoryIndex: MemoryIndexMap;
  notepad: string;
  timestamp: string;
}

const sseClients = new Set<ServerResponse>();

export function collectState(): DashboardState {
  const stateDir = join(getBaseStateDir(), "state");
  const plansDir = join(getBaseStateDir(), "plans");

  let session: DashboardState["session"] = null;
  const sessionPath = getSessionPath();
  if (existsSync(sessionPath)) {
    try { session = JSON.parse(readFileSync(sessionPath, "utf-8")); } catch { /* skip */ }
  }

  const activeModes: ModeInfo[] = [];
  const completedModes: ModeInfo[] = [];
  const files = listModeStateFiles();
  for (const file of files) {
    try {
      const data: ModeInfo = JSON.parse(readFileSync(join(stateDir, file), "utf-8"));
      if (!data.mode) {
        const parsed = parseStateFilename(file);
        if (parsed) data.mode = parsed.mode;
      }
      if (data.mode === "monitor" || data.mode === "monitor-handoff") {
        continue;
      }
      if (!data.runId) {
        const parsed = parseStateFilename(file);
        if (parsed?.runId) data.runId = parsed.runId;
      }
      if (data.runId) {
        try { data.recentEvents = tailEvents(data.runId, 5); } catch { data.recentEvents = []; }
      }
      const isActive = data.active === true || data.status === "active";
      if (isActive) activeModes.push(data);
      else completedModes.push(data);
    } catch { /* skip */ }
  }

  const archivedSessions = listArchives();
  const notifications = tailNotifications(20);

  let plans: PlanInfo[] = [];
  if (existsSync(plansDir)) {
    for (const f of readdirSync(plansDir).filter(f => f.endsWith(".md"))) {
      try {
        const fullPath = join(plansDir, f);
        const content = readFileSync(fullPath, "utf-8");
        const mtime = statSync(fullPath).mtime.toISOString();
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].replace(/^PRD:\s*/i, "").trim() : f.replace(/\.md$/, "");
        plans.push({ name: f, preview: content.slice(0, 600), modifiedAt: mtime, title });
      } catch { plans.push({ name: f, preview: "", modifiedAt: "", title: f.replace(/\.md$/, "") }); }
    }
    plans.sort((a, b) => (b.modifiedAt || "").localeCompare(a.modifiedAt || ""));
  }

  let memory: Record<string, unknown> = {};
  const memPath = getProjectMemoryPath();
  if (existsSync(memPath)) {
    try { memory = JSON.parse(readFileSync(memPath, "utf-8")); } catch { /* skip */ }
  }

  let memoryIndex: MemoryIndexMap = {};
  try { memoryIndex = readMemoryIndex(); } catch { /* skip */ }

  for (const m of activeModes) {
    if (m.runId) {
      const keys = getKeysForRun(m.runId);
      if (keys.length > 0) m.memoryKeysModified = keys;
    }
  }
  for (const m of completedModes) {
    if (m.runId) {
      const keys = getKeysForRun(m.runId);
      if (keys.length > 0) m.memoryKeysModified = keys;
    }
  }

  let notepad = "";
  const notepadPath = getNotepadPath();
  if (existsSync(notepadPath)) {
    notepad = readFileSync(notepadPath, "utf-8");
  }

  const taskSource = activeModes[0] ?? completedModes[0];
  const activeTask: string | null =
    (taskSource?.metadata?.task as string) ??
    (taskSource as any)?.task ??
    null;

  const stats = computeStats(activeModes, completedModes, archivedSessions);

  return { session, activeTask, activeModes, completedModes, archivedSessions, stats, notifications, plans, memory, memoryIndex, notepad, timestamp: new Date().toISOString() };
}

export function computeStats(
  active: ModeInfo[],
  completed: ModeInfo[],
  archived: ArchivedSession[],
): StatsData {
  let completeCount = 0;
  let cancelledCount = 0;
  let totalDurationMs = 0;
  let durationCount = 0;
  let totalEvents = 0;

  for (const m of completed) {
    if (m.status === "complete") completeCount++;
    else if (m.status === "cancelled") cancelledCount++;
    if (m.started_at && m.completed_at) {
      const d = new Date(m.completed_at).getTime() - new Date(m.started_at).getTime();
      if (d > 0) { totalDurationMs += d; durationCount++; }
    }
    totalEvents += m.recentEvents?.length ?? 0;
  }

  for (const a of archived) {
    const mode = a.modes?.[0] as Record<string, unknown> | undefined;
    const status = mode?.status as string ?? "";
    if (status === "complete") completeCount++;
    else if (status === "cancelled") cancelledCount++;
    if (a.session?.started_at && a.session?.archived_at) {
      const d = new Date(a.session.archived_at).getTime() - new Date(a.session.started_at).getTime();
      if (d > 0) { totalDurationMs += d; durationCount++; }
    }
    totalEvents += (a as any).events?.length ?? 0;
  }

  for (const m of active) {
    totalEvents += m.recentEvents?.length ?? 0;
  }

  const decided = completeCount + cancelledCount;
  const successRate = decided > 0 ? Math.round((completeCount / decided) * 100) : 100;
  const avgDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;
  const totalRuns = active.length + completed.length + archived.length;

  return { successRate, avgDurationMs, totalEvents, totalRuns };
}

function broadcast(): void {
  const data = JSON.stringify(collectState());
  for (const client of sseClients) {
    client.write("data: " + data + "\n\n");
  }
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? "/";
  const parsedUrl = new URL(url, "http://localhost");

  if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(getHTML());
    return;
  }

  if (parsedUrl.pathname === "/api/state") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(collectState()));
    return;
  }

  if (parsedUrl.pathname === "/api/plan") {
    const name = parsedUrl.searchParams.get("name") ?? "";
    const planPath = join(getBaseStateDir(), "plans", name);
    if (!existsSync(planPath) || name.includes("..")) {
      res.writeHead(404);
      res.end("Plan not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
    res.end(readFileSync(planPath, "utf-8"));
    return;
  }

  if (parsedUrl.pathname === "/api/open") {
    const file = parsedUrl.searchParams.get("file") ?? "";
    if (!file || file.includes("..")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid file path" }));
      return;
    }
    const fullPath = join(getBaseStateDir(), "plans", file);
    if (!existsSync(fullPath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "File not found" }));
      return;
    }
    const tryOpen = [
      `open -a "Cursor" "${fullPath}"`,
      `cursor "${fullPath}"`,
      `code "${fullPath}"`,
    ];
    const attempt = (i: number): void => {
      if (i >= tryOpen.length) return;
      exec(tryOpen[i], (err) => { if (err) attempt(i + 1); });
    };
    attempt(0);
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true, path: fullPath }));
    return;
  }

  if (parsedUrl.pathname === "/api/events") {
    const runId = parsedUrl.searchParams.get("runId") ?? "";
    if (!runId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing runId" }));
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(readEvents(runId)));
    return;
  }

  if (parsedUrl.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("data: connected\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

export async function dashboard(options: { port?: number; open?: boolean }): Promise<void> {
  const port = options.port ?? 3721;
  const stateDir = getBaseStateDir();
  ensureDir(stateDir);

  if (isSessionStale()) {
    const archived = archiveCurrentSession();
    if (archived) log.info("Archived stale session → " + archived);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    watch(stateDir, { recursive: true }, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(broadcast, 250);
    });
  } catch { /* watcher not critical */ }

  const server = createServer(handleRequest);
  const url = "http://localhost:" + port;

  server.listen(port, () => {
    log.heading("OMR Dashboard");
    log.ok("Running at " + url);
    log.info("Watching .omr/ for changes. Ctrl+C to stop.");

    if (options.open !== false) {
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      exec(cmd + " " + url, () => {});
    }
  });
}

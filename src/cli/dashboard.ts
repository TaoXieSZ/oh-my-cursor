import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { watch, existsSync, readFileSync, readdirSync } from "node:fs";
import { exec } from "node:child_process";
import { join } from "node:path";
import { ensureDir } from "../utils/fs.js";
import {
  getBaseStateDir,
  getSessionPath,
  getNotepadPath,
  getProjectMemoryPath,
  listModeStateFiles,
} from "../state/paths.js";
import { parseStateFilename } from "../state/mode-state.js";
import * as log from "../utils/log.js";
import { getHTML } from "./dashboard-html.js";
import { isSessionStale, archiveCurrentSession, listArchives } from "../state/archive.js";
import type { ArchivedSession } from "../state/archive.js";

export interface PlanInfo {
  name: string;
  preview: string;
}

export interface ModeInfo {
  mode: string;
  runId?: string;
  status?: "active" | "complete" | "cancelled" | "blocked" | string;
  active?: boolean;
  phase?: string;
  iteration?: number;
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  task?: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardState {
  session: { id: string; started_at: string } | null;
  activeTask: string | null;
  activeModes: ModeInfo[];
  completedModes: ModeInfo[];
  archivedSessions: ArchivedSession[];
  plans: PlanInfo[];
  memory: Record<string, unknown>;
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
      if (!data.runId) {
        const parsed = parseStateFilename(file);
        if (parsed?.runId) data.runId = parsed.runId;
      }
      const isActive = data.active === true || data.status === "active";
      if (isActive) activeModes.push(data);
      else completedModes.push(data);
    } catch { /* skip */ }
  }

  const archivedSessions = listArchives();

  let plans: PlanInfo[] = [];
  if (existsSync(plansDir)) {
    for (const f of readdirSync(plansDir).filter(f => f.endsWith(".md"))) {
      try {
        const content = readFileSync(join(plansDir, f), "utf-8");
        plans.push({ name: f, preview: content.slice(0, 600) });
      } catch { plans.push({ name: f, preview: "" }); }
    }
  }

  let memory: Record<string, unknown> = {};
  const memPath = getProjectMemoryPath();
  if (existsSync(memPath)) {
    try { memory = JSON.parse(readFileSync(memPath, "utf-8")); } catch { /* skip */ }
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

  return { session, activeTask, activeModes, completedModes, archivedSessions, plans, memory, notepad, timestamp: new Date().toISOString() };
}

function broadcast(): void {
  const data = JSON.stringify(collectState());
  for (const client of sseClients) {
    client.write("data: " + data + "\n\n");
  }
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? "/";

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(getHTML());
    return;
  }

  if (url === "/api/state") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(collectState()));
    return;
  }

  if (url.startsWith("/api/plan?name=")) {
    const name = decodeURIComponent(url.slice("/api/plan?name=".length));
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

  if (url === "/events") {
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
    log.heading("OMC Dashboard");
    log.ok("Running at " + url);
    log.info("Watching .omc/ for changes. Ctrl+C to stop.");

    if (options.open !== false) {
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      exec(cmd + " " + url, () => {});
    }
  });
}

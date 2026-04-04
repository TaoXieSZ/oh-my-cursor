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
} from "../state/paths.js";
import * as log from "../utils/log.js";
import { getHTML } from "./dashboard-html.js";

export interface PlanInfo {
  name: string;
  preview: string;
}

export interface DashboardState {
  session: { id: string; started_at: string } | null;
  activeTask: string | null;
  activeModes: ModeInfo[];
  completedModes: ModeInfo[];
  plans: PlanInfo[];
  memory: Record<string, unknown>;
  notepad: string;
  timestamp: string;
}

interface ModeInfo {
  mode: string;
  active: boolean;
  phase: string;
  iteration: number;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
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
  if (existsSync(stateDir)) {
    for (const file of readdirSync(stateDir)) {
      if (!file.endsWith("-state.json")) continue;
      try {
        const data: ModeInfo = JSON.parse(readFileSync(join(stateDir, file), "utf-8"));
        if (!data.mode) data.mode = file.replace(/-state\.json$/, "");
        if (data.active) activeModes.push(data);
        else completedModes.push(data);
      } catch { /* skip */ }
    }
  }

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

  return { session, activeTask, activeModes, completedModes, plans, memory, notepad, timestamp: new Date().toISOString() };
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

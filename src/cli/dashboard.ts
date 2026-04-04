import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { watch, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "../utils/fs.js";
import {
  getBaseStateDir,
  getSessionPath,
  getNotepadPath,
  getProjectMemoryPath,
} from "../state/paths.js";
import * as log from "../utils/log.js";

export interface DashboardState {
  session: { id: string; started_at: string } | null;
  activeModes: ModeInfo[];
  completedModes: ModeInfo[];
  plans: string[];
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
        if (data.active) activeModes.push(data);
        else completedModes.push(data);
      } catch { /* skip */ }
    }
  }

  let plans: string[] = [];
  if (existsSync(plansDir)) {
    plans = readdirSync(plansDir).filter(f => f.endsWith(".md"));
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

  return { session, activeModes, completedModes, plans, memory, notepad, timestamp: new Date().toISOString() };
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

export async function dashboard(options: { port?: number }): Promise<void> {
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

  server.listen(port, () => {
    log.heading("OMC Dashboard");
    log.ok("Running at http://localhost:" + port);
    log.info("Watching .omc/ for changes. Ctrl+C to stop.");
  });
}

/* ---------- HTML Template ---------- */

function getHTML(): string {
  // Using a function to keep the template isolated.
  // Embedded JS uses only single-quoted strings to avoid TS interpolation issues.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OMC Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a26;--border:#2a2a3a;
  --text:#e2e4e9;--text2:#8b8fa3;--text3:#5a5e72;
  --orange:#f97316;--orange-dim:#f9731633;--blue:#58a6ff;--blue-dim:#58a6ff33;
  --green:#3fb950;--green-dim:#3fb95033;--purple:#bc8cff;--purple-dim:#bc8cff33;
  --red:#f85149;--red-dim:#f8514933;
  --font-ui:'Inter',system-ui,-apple-system,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code','SF Mono',monospace;
  --radius:12px;
}
html{font-size:15px}
body{
  font-family:var(--font-ui);color:var(--text);background:var(--bg);
  min-height:100vh;line-height:1.5;
  background-image:radial-gradient(circle at 50% 0%,#1a1028 0%,transparent 50%);
}
header{
  display:flex;align-items:center;gap:16px;padding:20px 32px;
  border-bottom:1px solid var(--border);backdrop-filter:blur(12px);
  position:sticky;top:0;z-index:10;background:var(--bg)dd;
}
.logo{font-size:1.25rem;font-weight:700;letter-spacing:-0.02em;display:flex;align-items:center;gap:10px}
.logo svg{width:28px;height:28px}
.session{font-family:var(--font-mono);font-size:0.8rem;color:var(--text2);margin-left:auto}
.live{display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--green);font-weight:600;text-transform:uppercase;letter-spacing:0.08em}
.live .dot{width:8px;height:8px;background:var(--green);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 var(--green)}50%{opacity:.7;box-shadow:0 0 0 6px transparent}}
main{max-width:1280px;margin:0 auto;padding:28px 32px 64px}

/* Pipeline */
.pipeline{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:28px 36px;margin-bottom:28px;
}
.pipeline h2{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);margin-bottom:20px;font-weight:600}
.pipeline-track{display:flex;align-items:center;justify-content:space-between;position:relative}
.pipeline-track::before{
  content:'';position:absolute;top:50%;left:24px;right:24px;height:2px;
  background:var(--border);transform:translateY(-50%);z-index:0;
}
.stage{
  display:flex;flex-direction:column;align-items:center;gap:10px;z-index:1;
  position:relative;
}
.stage-dot{
  width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:1rem;border:2px solid var(--border);background:var(--bg);
  transition:all .4s ease;
}
.stage-label{font-size:0.72rem;color:var(--text3);font-weight:500;white-space:nowrap}
.stage.completed .stage-dot{border-color:var(--green);background:var(--green-dim);color:var(--green)}
.stage.completed .stage-label{color:var(--green)}
.stage.active .stage-dot{
  border-color:var(--orange);background:var(--orange-dim);color:var(--orange);
  box-shadow:0 0 20px var(--orange-dim),0 0 40px #f973160f;animation:glow 2.5s ease-in-out infinite;
}
.stage.active .stage-label{color:var(--orange);font-weight:600}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--orange-dim)}50%{box-shadow:0 0 30px var(--orange-dim),0 0 60px #f9731611}}

/* Grid */
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:860px){.grid{grid-template-columns:1fr}}

/* Cards */
.card{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:24px;transition:border-color .3s;overflow:hidden;
}
.card:hover{border-color:#3a3a4a}
.card h2{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);margin-bottom:16px;font-weight:600}
.card.active-glow{border-color:var(--orange);box-shadow:0 0 30px var(--orange-dim)}

/* Mode cards inside */
.mode-item{
  background:var(--surface2);border-radius:8px;padding:16px;margin-bottom:12px;
  border-left:3px solid var(--orange);
}
.mode-item:last-child{margin-bottom:0}
.mode-item.completed-mode{border-left-color:var(--green);opacity:.7}
.mode-name{font-family:var(--font-mono);font-weight:600;font-size:0.95rem;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.mode-name .badge{
  font-size:0.6rem;padding:2px 8px;border-radius:99px;font-weight:600;
  text-transform:uppercase;letter-spacing:0.06em;
}
.badge-active{background:var(--orange-dim);color:var(--orange)}
.badge-done{background:var(--green-dim);color:var(--green)}
.mode-row{display:flex;justify-content:space-between;font-size:0.82rem;padding:2px 0}
.mode-row .label{color:var(--text3)}
.mode-row .value{font-family:var(--font-mono);color:var(--text2)}

/* Progress bar */
.progress-bar{height:4px;background:var(--border);border-radius:2px;margin-top:10px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--orange),#fb923c);border-radius:2px;transition:width .6s ease}

/* Plans list */
.plan-item{
  font-family:var(--font-mono);font-size:0.85rem;color:var(--blue);
  padding:8px 12px;background:var(--surface2);border-radius:6px;margin-bottom:8px;
  display:flex;align-items:center;gap:8px;
}
.plan-item::before{content:'📋';font-size:0.8rem}

/* Memory table */
.mem-table{width:100%;font-size:0.82rem}
.mem-table td{padding:6px 0;border-bottom:1px solid var(--border)}
.mem-table td:first-child{font-family:var(--font-mono);color:var(--purple);padding-right:16px;white-space:nowrap}
.mem-table td:last-child{font-family:var(--font-mono);color:var(--text2);word-break:break-all}

/* Notepad */
.notepad-content{
  font-family:var(--font-mono);font-size:0.82rem;color:var(--text2);
  white-space:pre-wrap;line-height:1.7;max-height:300px;overflow-y:auto;
}

/* Empty state */
.empty{color:var(--text3);font-size:0.85rem;font-style:italic;padding:12px 0}

/* Idle banner */
.idle-banner{
  text-align:center;padding:32px;color:var(--text3);
}
.idle-banner .icon{font-size:2.5rem;margin-bottom:12px;opacity:.5}
.idle-banner p{font-size:0.9rem;margin-bottom:6px}
.idle-banner code{
  font-family:var(--font-mono);background:var(--surface2);padding:2px 8px;
  border-radius:4px;font-size:0.82rem;color:var(--orange);
}

/* Footer */
footer{
  text-align:center;padding:24px;font-size:0.72rem;color:var(--text3);
  border-top:1px solid var(--border);margin-top:40px;
}
footer a{color:var(--blue);text-decoration:none}
footer a:hover{text-decoration:underline}

/* Timestamp */
.updated-at{font-size:0.7rem;color:var(--text3);text-align:right;margin-top:8px;font-family:var(--font-mono)}

/* Scrollbar */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
</style>
</head>
<body>

<header>
  <div class="logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange)">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
    OMC Dashboard
  </div>
  <div class="session" id="session">—</div>
  <div class="live"><span class="dot"></span>Live</div>
</header>

<main>
  <section class="pipeline" id="pipeline">
    <h2>Workflow Pipeline</h2>
    <div class="pipeline-track" id="pipeline-track"></div>
  </section>

  <div class="grid">
    <section class="card" id="modes-card">
      <h2>Active Modes</h2>
      <div id="modes-body"></div>
    </section>
    <section class="card" id="plans-card">
      <h2>Plans</h2>
      <div id="plans-body"></div>
    </section>
    <section class="card" id="memory-card">
      <h2>Project Memory</h2>
      <div id="memory-body"></div>
    </section>
    <section class="card" id="notepad-card">
      <h2>Notepad</h2>
      <div id="notepad-body"></div>
    </section>
  </div>

  <div class="updated-at" id="updated-at"></div>
</main>

<footer>
  <a href="https://github.com/TaoXieSZ/oh-my-cursor" target="_blank">oh-my-cursor</a> &middot; workflow orchestration for Cursor IDE
</footer>

<script>
(function() {
  'use strict';

  var PHASES = {
    forge:  { load:10, implement:30, verify:60, fix:80 },
    blueprint: { setup:10, diverge:30, converge:50, review:70, handoff:90 },
    'deep-interview': { setup:10, question:40, synthesize:75 },
    team:   { plan:10, dispatch:30, monitor:50, integrate:80 },
    autopilot: { expand:10, plan:25, execute:50, qa:70, validate:85, cleanup:95 }
  };

  var PIPELINE_STAGES = [
    { id:'interview', label:'Interview', icon:'\\u{1F50D}', modes:['deep-interview'] },
    { id:'blueprint', label:'Blueprint', icon:'\\u{1F4D0}', modes:['blueprint'] },
    { id:'execute',   label:'Execute',   icon:'\\u{1F525}', modes:['forge','team','autopilot'] },
    { id:'done',      label:'Done',      icon:'\\u{2705}',  modes:[] }
  ];

  function timeAgo(iso) {
    if (!iso) return '—';
    var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderPipeline(state) {
    var activeSet = {};
    var completedSet = {};
    state.activeModes.forEach(function(m) { activeSet[m.mode] = true; });
    state.completedModes.forEach(function(m) { completedSet[m.mode] = true; });

    var html = '';
    PIPELINE_STAGES.forEach(function(stage) {
      var isActive = stage.modes.some(function(m) { return activeSet[m]; });
      var isDone = stage.modes.some(function(m) { return completedSet[m]; });
      if (stage.id === 'done') {
        isDone = state.completedModes.length > 0 && state.activeModes.length === 0;
      }
      var cls = isActive ? 'stage active' : isDone ? 'stage completed' : 'stage';
      html += '<div class="' + cls + '">';
      html += '<div class="stage-dot">' + stage.icon + '</div>';
      html += '<div class="stage-label">' + stage.label + '</div>';
      html += '</div>';
    });
    document.getElementById('pipeline-track').innerHTML = html;
  }

  function renderModes(state) {
    var el = document.getElementById('modes-body');
    var card = document.getElementById('modes-card');
    if (state.activeModes.length === 0 && state.completedModes.length === 0) {
      card.classList.remove('active-glow');
      el.innerHTML = '<div class="idle-banner"><div class="icon">\\u{1F6F8}</div>'
        + '<p>No active workflows</p>'
        + '<p>Start one with <code>$forge</code>, <code>$team</code>, or <code>$autopilot</code></p></div>';
      return;
    }
    card.classList.toggle('active-glow', state.activeModes.length > 0);
    var html = '';
    state.activeModes.forEach(function(m) {
      var pct = 50;
      var phaseMap = PHASES[m.mode];
      if (phaseMap && phaseMap[m.phase] !== undefined) pct = phaseMap[m.phase];
      html += '<div class="mode-item">';
      html += '<div class="mode-name">' + escapeHtml(m.mode) + ' <span class="badge badge-active">active</span></div>';
      html += '<div class="mode-row"><span class="label">Phase</span><span class="value">' + escapeHtml(m.phase) + '</span></div>';
      html += '<div class="mode-row"><span class="label">Iteration</span><span class="value">' + m.iteration + '</span></div>';
      html += '<div class="mode-row"><span class="label">Started</span><span class="value">' + timeAgo(m.started_at) + '</span></div>';
      html += '<div class="mode-row"><span class="label">Updated</span><span class="value">' + timeAgo(m.updated_at) + '</span></div>';
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
      html += '</div>';
    });
    state.completedModes.forEach(function(m) {
      html += '<div class="mode-item completed-mode">';
      html += '<div class="mode-name">' + escapeHtml(m.mode) + ' <span class="badge badge-done">done</span></div>';
      html += '<div class="mode-row"><span class="label">Final phase</span><span class="value">' + escapeHtml(m.phase) + '</span></div>';
      html += '<div class="mode-row"><span class="label">Completed</span><span class="value">' + timeAgo(m.completed_at) + '</span></div>';
      html += '</div>';
    });
    el.innerHTML = html;
  }

  function renderPlans(state) {
    var el = document.getElementById('plans-body');
    if (state.plans.length === 0) {
      el.innerHTML = '<div class="empty">No plans yet. Run <code>$blueprint</code> to create one.</div>';
      return;
    }
    var html = '';
    state.plans.forEach(function(p) {
      html += '<div class="plan-item">' + escapeHtml(p) + '</div>';
    });
    el.innerHTML = html;
  }

  function renderMemory(state) {
    var el = document.getElementById('memory-body');
    var keys = Object.keys(state.memory);
    if (keys.length === 0) {
      el.innerHTML = '<div class="empty">Empty. Memory populates as you work.</div>';
      return;
    }
    var html = '<table class="mem-table">';
    keys.forEach(function(k) {
      var v = typeof state.memory[k] === 'string' ? state.memory[k] : JSON.stringify(state.memory[k]);
      html += '<tr><td>' + escapeHtml(k) + '</td><td>' + escapeHtml(v) + '</td></tr>';
    });
    html += '</table>';
    el.innerHTML = html;
  }

  function renderNotepad(state) {
    var el = document.getElementById('notepad-body');
    if (!state.notepad) {
      el.innerHTML = '<div class="empty">Empty.</div>';
      return;
    }
    el.innerHTML = '<div class="notepad-content">' + escapeHtml(state.notepad) + '</div>';
  }

  function render(state) {
    document.getElementById('session').textContent = state.session
      ? 'Session: ' + state.session.id.slice(0,8)
      : 'No session';
    renderPipeline(state);
    renderModes(state);
    renderPlans(state);
    renderMemory(state);
    renderNotepad(state);
    var d = new Date(state.timestamp);
    document.getElementById('updated-at').textContent = 'Updated ' + d.toLocaleTimeString();
  }

  // Initial fetch
  fetch('/api/state').then(function(r) { return r.json(); }).then(render);

  // SSE for live updates
  var evtSource = new EventSource('/events');
  evtSource.onmessage = function(e) {
    if (e.data === 'connected') return;
    try { render(JSON.parse(e.data)); } catch(err) { console.error(err); }
  };
  evtSource.onerror = function() {
    document.querySelector('.live').style.color = 'var(--red)';
    document.querySelector('.live .dot').style.background = 'var(--red)';
  };
})();
</script>

</body>
</html>`;
}

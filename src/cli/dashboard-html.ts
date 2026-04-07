export function getHTML(): string {
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
  --bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a26;--surface3:#22222e;--border:#2a2a3a;--border2:#3a3a4a;
  --text:#e2e4e9;--text2:#8b8fa3;--text3:#5a5e72;
  --orange:#f97316;--orange-dim:#f9731633;--blue:#58a6ff;--blue-dim:#58a6ff33;
  --green:#3fb950;--green-dim:#3fb95033;--purple:#bc8cff;--purple-dim:#bc8cff33;
  --red:#f85149;--red-dim:#f8514933;--yellow:#d29922;--yellow-dim:#d2992233;
  --font-ui:'Inter',system-ui,-apple-system,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code','SF Mono',monospace;
  --radius:12px;--radius-sm:8px;
}
html{font-size:15px}
body{font-family:var(--font-ui);color:var(--text);background:var(--bg);min-height:100vh;line-height:1.5;
  background-image:radial-gradient(circle at 50% 0%,#1a1028 0%,transparent 50%)}

header{display:flex;align-items:center;gap:16px;padding:16px 32px;border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:10;background:var(--bg)ee;backdrop-filter:blur(8px)}
.logo{font-size:1.1rem;font-weight:700;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px}
.logo svg{width:24px;height:24px}
.header-right{margin-left:auto;display:flex;align-items:center;gap:16px}
.session-id{font-family:var(--font-mono);font-size:0.75rem;color:var(--text3)}
.live{display:flex;align-items:center;gap:6px;font-size:0.7rem;color:var(--green);font-weight:600;text-transform:uppercase;letter-spacing:0.08em}
.live .dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 var(--green)}50%{opacity:.7;box-shadow:0 0 0 5px transparent}}

main{max-width:1400px;margin:0 auto;padding:24px 32px 64px}

/* Section headers */
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;margin-top:28px}
.section-header:first-child{margin-top:0}
.section-title{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);font-weight:600}
.section-count{font-family:var(--font-mono);font-size:0.65rem;background:var(--surface2);color:var(--text2);
  padding:2px 8px;border-radius:99px}

/* Stats bar */
.stats{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:12px 18px;display:flex;flex-direction:column;gap:2px;min-width:140px;flex:1}
.stat-label{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);font-weight:500}
.stat-value{font-family:var(--font-mono);font-size:1.3rem;font-weight:700;letter-spacing:-0.02em}
.stat-value.active{color:var(--orange)}
.stat-value.completed{color:var(--green)}
.stat-value.archived{color:var(--purple)}

/* Active session cards grid */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}

.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:20px;transition:border-color .2s,box-shadow .2s}
.card:hover{border-color:var(--border2)}
.card.active-card{border-color:var(--orange);box-shadow:0 0 30px var(--orange-dim)}

.card-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.mode-badge{font-family:var(--font-mono);font-size:0.72rem;font-weight:600;padding:3px 10px;
  border-radius:99px;text-transform:uppercase;letter-spacing:0.04em}
.mode-badge.forge{background:var(--orange-dim);color:var(--orange)}
.mode-badge.blueprint{background:var(--blue-dim);color:var(--blue)}
.mode-badge.deep-interview{background:var(--purple-dim);color:var(--purple)}
.mode-badge.team{background:var(--green-dim);color:var(--green)}
.mode-badge.autopilot{background:var(--yellow-dim);color:var(--yellow)}
.mode-badge.default{background:var(--surface2);color:var(--text2)}

.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.status-dot.active{background:var(--orange);box-shadow:0 0 8px var(--orange-dim);animation:glow 2.5s ease-in-out infinite}
.status-dot.complete{background:var(--green)}
.status-dot.cancelled{background:var(--red)}
.status-dot.blocked{background:var(--yellow)}
@keyframes glow{0%,100%{box-shadow:0 0 8px var(--orange-dim)}50%{box-shadow:0 0 18px var(--orange-dim)}}

.run-id{font-family:var(--font-mono);font-size:0.65rem;color:var(--text3);margin-left:auto}

.card-task{font-size:1rem;font-weight:600;letter-spacing:-0.01em;margin-bottom:10px;line-height:1.4;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.card-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:0.72rem;color:var(--text2);margin-bottom:12px}
.meta-item{display:flex;align-items:center;gap:4px}
.meta-label{color:var(--text3)}
.meta-val{font-family:var(--font-mono);color:var(--text)}

.card-progress{height:3px;background:var(--border);border-radius:2px;overflow:hidden}
.card-progress-fill{height:100%;background:linear-gradient(90deg,var(--orange),#fb923c);border-radius:2px;transition:width .6s}

/* Two column layout */
.columns{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
@media(max-width:900px){.columns{grid-template-columns:1fr}}

.panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
.panel-title{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);margin-bottom:14px;font-weight:600}

/* History list */
.history-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius-sm);
  cursor:pointer;transition:background .15s;border-bottom:1px solid var(--border)}
.history-item:last-child{border-bottom:none}
.history-item:hover{background:var(--surface2)}
.history-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.history-dot.complete{background:var(--green)}
.history-dot.cancelled{background:var(--red)}
.history-dot.default{background:var(--text3)}
.history-info{flex:1;min-width:0}
.history-task{font-size:0.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.history-meta{font-size:0.68rem;color:var(--text3);font-family:var(--font-mono)}
.history-time{font-size:0.68rem;color:var(--text3);font-family:var(--font-mono);white-space:nowrap}

.history-detail{display:none;padding:10px 14px;font-size:0.75rem;color:var(--text2);
  background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px;font-family:var(--font-mono);
  white-space:pre-wrap;line-height:1.6}
.history-detail.open{display:block}

.chat-link{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;
  border:1px solid var(--border);background:var(--surface2);color:var(--blue);font-size:0.65rem;
  font-family:var(--font-mono);cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
.chat-link:hover{background:var(--blue-dim);border-color:var(--blue)}
.chat-link svg{width:12px;height:12px}
.card .chat-link{margin-top:8px}

/* Timeline */
.timeline{margin-top:10px;border-top:1px solid var(--border);padding-top:8px}
.timeline-toggle{display:flex;align-items:center;gap:6px;font-size:0.68rem;color:var(--text3);
  cursor:pointer;user-select:none;margin-bottom:6px}
.timeline-toggle:hover{color:var(--text2)}
.timeline-toggle .arrow{transition:transform .2s;font-size:0.6rem}
.timeline-toggle.open .arrow{transform:rotate(90deg)}
.tl-list{display:none;padding-left:12px;border-left:2px solid var(--border)}
.tl-list.open{display:block}
.tl-event{position:relative;padding:4px 0 4px 14px;font-size:0.72rem;line-height:1.5}
.tl-event::before{content:'';position:absolute;left:-7px;top:10px;width:6px;height:6px;
  border-radius:50%;border:1.5px solid var(--border);background:var(--surface)}
.tl-event.phase::before{border-color:var(--blue);background:var(--blue-dim)}
.tl-event.status::before{border-color:var(--orange);background:var(--orange-dim)}
.tl-event.iteration::before{border-color:var(--text3);background:var(--surface2)}
.tl-event.tool_call::before{border-color:var(--purple);background:var(--purple-dim)}
.tl-event.milestone::before{border-color:var(--green);background:var(--green-dim)}
.tl-event.note::before{border-color:var(--text3);background:var(--surface2)}
.tl-event.file_edit::before{border-color:var(--yellow);background:var(--yellow-dim)}
.tl-event.state_change::before{border-color:var(--orange);background:var(--orange-dim)}
.tl-time{color:var(--text3);font-family:var(--font-mono);font-size:0.62rem;margin-right:6px}
.tl-kind{font-family:var(--font-mono);font-size:0.6rem;padding:1px 5px;border-radius:3px;
  background:var(--surface2);color:var(--text2);margin-right:4px}
.tl-summary{color:var(--text)}

.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);
  background:var(--surface);border:1px solid var(--green);border-radius:var(--radius-sm);
  padding:10px 20px;color:var(--text);font-size:0.82rem;z-index:100;
  transition:transform .3s ease;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.toast.show{transform:translateX(-50%) translateY(0)}
.toast .toast-sub{font-size:0.7rem;color:var(--text2);margin-top:2px}

/* Plan cards */
.plan-card{background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:10px;overflow:hidden;
  border:1px solid transparent;transition:border-color .2s}
.plan-card:hover{border-color:var(--border)}
.plan-header{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none}
.plan-header:hover{background:#1e1e2d}
.plan-open{margin-left:auto;background:none;border:1px solid var(--border);color:var(--text2);
  font-size:0.65rem;padding:2px 8px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:4px;
  transition:all .15s;font-family:var(--font-mono)}
.plan-open:hover{border-color:var(--blue);color:var(--blue);background:rgba(56,139,253,0.08)}
.plan-open svg{width:12px;height:12px}
.plan-meta{display:flex;align-items:center;gap:8px;padding:0 14px 6px;font-size:0.68rem;color:var(--text3)}
.plan-title{color:var(--text2);font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.plan-time{font-family:var(--font-mono);font-size:0.62rem;white-space:nowrap}
.plan-arrow{color:var(--text3);font-size:0.7rem;transition:transform .2s}
.plan-card.open .plan-arrow{transform:rotate(90deg)}
.plan-name{font-family:var(--font-mono);font-size:0.82rem;color:var(--blue)}
.plan-preview{padding:0 14px;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease}
.plan-card.open .plan-preview{max-height:400px;padding:0 14px 14px;overflow-y:auto}
.plan-content{font-family:var(--font-mono);font-size:0.75rem;color:var(--text2);white-space:pre-wrap;line-height:1.6;
  background:var(--bg);border-radius:6px;padding:12px;border:1px solid var(--border)}

/* Memory table */
.mem-table{width:100%;font-size:0.78rem}
.mem-table td{padding:5px 0;border-bottom:1px solid var(--border)}
.mem-table td:first-child{font-family:var(--font-mono);color:var(--purple);padding-right:14px;white-space:nowrap}
.mem-table td:last-child{font-family:var(--font-mono);color:var(--text2);word-break:break-all}

.notepad-content{font-family:var(--font-mono);font-size:0.78rem;color:var(--text2);line-height:1.7;max-height:260px;overflow-y:auto}

.empty{color:var(--text3);font-size:0.82rem;font-style:italic;padding:8px 0}

footer{text-align:center;padding:20px;font-size:0.7rem;color:var(--text3);border-top:1px solid var(--border);margin-top:32px}
footer a{color:var(--blue);text-decoration:none}
footer a:hover{text-decoration:underline}
.updated-at{font-size:0.68rem;color:var(--text3);text-align:right;margin-top:6px;font-family:var(--font-mono)}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
</style>
</head>
<body>

<header>
  <div class="logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange)">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
    OMC
  </div>
  <div class="header-right">
    <div class="session-id" id="session-id"></div>
    <div class="live"><span class="dot"></span>Live</div>
  </div>
</header>

<main>
  <div id="stats-bar"></div>
  <div class="section-header">
    <div class="section-title">Active Sessions</div>
    <div class="section-count" id="active-count">0</div>
  </div>
  <div class="cards" id="active-cards"></div>

  <div class="columns">
    <div>
      <div class="panel">
        <div class="panel-title">History</div>
        <div id="history-body"></div>
      </div>
      <div class="panel" style="margin-top:20px">
        <div class="panel-title">Plans</div>
        <div id="plans-body"></div>
      </div>
    </div>
    <div>
      <div class="panel">
        <div class="panel-title">Project Memory</div>
        <div id="memory-body"></div>
      </div>
      <div class="panel" style="margin-top:20px">
        <div class="panel-title">Notepad</div>
        <div id="notepad-body"></div>
      </div>
    </div>
  </div>
  <div class="updated-at" id="updated-at"></div>
</main>

<div class="toast" id="toast"></div>

<footer>
  <a href="https://github.com/TaoXieSZ/oh-my-cursor" target="_blank">oh-my-cursor</a> &middot; workflow orchestration for Cursor IDE
</footer>

<script>
(function() {
  'use strict';

  var PHASES = {
    forge:  { init:5, load:10, implement:30, verify:60, fix:80 },
    blueprint: { analyze:10, deliberate:30, approve:60, approved:80, handoff:90 },
    'deep-interview': { init:5, setup:10, question:40, synthesize:75, complete:100 },
    team:   { plan:10, dispatch:30, monitor:50, integrate:80 },
    autopilot: { expand:10, plan:25, execute:50, qa:70, validate:85, cleanup:95 }
  };

  var MODE_COLORS = {
    forge: 'forge', blueprint: 'blueprint', 'deep-interview': 'deep-interview',
    team: 'team', autopilot: 'autopilot'
  };

  function timeAgo(iso) {
    if (!iso) return '\\u{2014}';
    var ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'just now';
    var s = Math.floor(ms / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  }

  function duration(start, end) {
    if (!start) return '\\u{2014}';
    var ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    var s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
    return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm';
  }

  function esc(str) {
    return String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function badgeClass(mode) { return MODE_COLORS[mode] || 'default'; }

  var CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  function showToast(msg, sub) {
    var t = document.getElementById('toast');
    t.innerHTML = esc(msg) + (sub ? '<div class="toast-sub">' + esc(sub) + '</div>' : '');
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 3000);
  }

  window._openChat = function(chatId, ev) {
    if (ev) ev.stopPropagation();
    if (!chatId) return;
    navigator.clipboard.writeText(chatId).then(function() {
      showToast('Chat ID copied!', 'Search "' + chatId.slice(0,8) + '..." in Cursor Previous Chats');
    });
  };

  function chatLinkHtml(chatId) {
    if (!chatId) return '';
    return '<button class="chat-link" onclick="window._openChat(\\'' + esc(chatId) + '\\', event)" title="Copy Chat ID to find in Cursor">' + CHAT_ICON + '<span>' + esc(chatId.slice(0,8)) + '</span></button>';
  }

  function renderTimeline(events, id) {
    if (!events || events.length === 0) return '';
    var html = '<div class="timeline">';
    html += '<div class="timeline-toggle" onclick="this.classList.toggle(\\'open\\');document.getElementById(\\'' + id + '-tl\\').classList.toggle(\\'open\\')">';
    html += '<span class="arrow">\\u{25B6}</span> Timeline (' + events.length + ')';
    html += '</div>';
    html += '<div class="tl-list" id="' + id + '-tl">';
    events.slice().reverse().forEach(function(ev) {
      html += '<div class="tl-event ' + esc(ev.kind) + '">';
      html += '<span class="tl-time">' + timeAgo(ev.ts) + '</span>';
      html += '<span class="tl-kind">' + esc(ev.kind) + '</span>';
      html += '<span class="tl-summary">' + esc(ev.summary) + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  var eventCache = {};
  function fetchAndRenderTimeline(runId, containerId) {
    if (!runId) return;
    var el = document.getElementById(containerId);
    if (!el || el.dataset.loaded) return;
    el.dataset.loaded = '1';
    fetch('/api/events?runId=' + encodeURIComponent(runId))
      .then(function(r) { return r.json(); })
      .then(function(events) {
        if (events && events.length > 0) {
          el.innerHTML = renderTimeline(events, containerId);
        }
      });
  }

  function statusDotClass(status) {
    if (status === 'active') return 'active';
    if (status === 'complete' || status === 'approved') return 'complete';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'blocked') return 'blocked';
    return 'default';
  }

  function renderStats(state) {
    var el = document.getElementById('stats-bar');
    var html = '<div class="stats">';
    html += '<div class="stat"><div class="stat-label">Active</div><div class="stat-value active">' + state.activeModes.length + '</div></div>';
    html += '<div class="stat"><div class="stat-label">Completed</div><div class="stat-value completed">' + state.completedModes.length + '</div></div>';
    html += '<div class="stat"><div class="stat-label">Archived</div><div class="stat-value archived">' + state.archivedSessions.length + '</div></div>';

    var activeTask = state.activeTask || 'No active task';
    html += '<div class="stat" style="flex:3"><div class="stat-label">Current Focus</div><div class="stat-value" style="font-size:0.95rem;color:' + (state.activeTask ? 'var(--orange)' : 'var(--text3)') + '">' + esc(activeTask) + '</div></div>';
    html += '</div>';
    el.innerHTML = html;
  }

  function renderActiveCards(state) {
    var el = document.getElementById('active-cards');
    document.getElementById('active-count').textContent = state.activeModes.length;

    if (state.activeModes.length === 0) {
      el.innerHTML = '<div class="card"><div class="empty">No active sessions. Start with <code style="font-family:var(--font-mono);background:var(--surface2);padding:2px 8px;border-radius:4px;color:var(--orange)">$forge</code>, <code style="font-family:var(--font-mono);background:var(--surface2);padding:2px 8px;border-radius:4px;color:var(--blue)">$blueprint</code>, or <code style="font-family:var(--font-mono);background:var(--surface2);padding:2px 8px;border-radius:4px;color:var(--purple)">$deep-interview</code></div></div>';
      return;
    }

    var html = '';
    state.activeModes.forEach(function(m) {
      var mode = m.mode || 'task';
      var task = m.task || (m.metadata && m.metadata.task) || 'Working...';
      var phase = m.phase || 'active';
      var pct = 50;
      var phaseMap = PHASES[mode];
      if (phaseMap && phaseMap[phase] !== undefined) pct = phaseMap[phase];

      html += '<div class="card active-card">';
      html += '<div class="card-head">';
      html += '<div class="status-dot active"></div>';
      html += '<span class="mode-badge ' + badgeClass(mode) + '">' + esc(mode) + '</span>';
      if (m.runId) html += '<span class="run-id">' + esc(m.runId) + '</span>';
      html += '</div>';
      html += '<div class="card-task">' + esc(task) + '</div>';
      html += '<div class="card-meta">';
      html += '<span class="meta-item"><span class="meta-label">phase</span> <span class="meta-val">' + esc(phase) + '</span></span>';
      if (m.iteration != null) html += '<span class="meta-item"><span class="meta-label">iter</span> <span class="meta-val">' + m.iteration + '</span></span>';
      html += '<span class="meta-item"><span class="meta-label">elapsed</span> <span class="meta-val">' + duration(m.started_at) + '</span></span>';
      html += '<span class="meta-item"><span class="meta-label">started</span> <span class="meta-val">' + timeAgo(m.started_at) + '</span></span>';
      html += '</div>';
      var chatId = m.chatId || (m.metadata && m.metadata.chatId);
      if (chatId) html += chatLinkHtml(chatId);
      html += '<div class="card-progress"><div class="card-progress-fill" style="width:' + pct + '%"></div></div>';
      if (m.recentEvents && m.recentEvents.length > 0) {
        html += renderTimeline(m.recentEvents, 'card-' + (m.runId || i));
      }
      html += '</div>';
    });
    el.innerHTML = html;
  }

  function renderHistory(state) {
    var el = document.getElementById('history-body');
    var items = [];

    state.completedModes.forEach(function(m) {
      var chatId = m.chatId || (m.metadata && m.metadata.chatId) || null;
      items.push({ type:'mode', mode:m.mode, task:m.task||(m.metadata&&m.metadata.task)||'', status:m.status||'complete',
        runId:m.runId, chatId:chatId, started:m.started_at, ended:m.completed_at||m.updated_at, data:m });
    });
    state.archivedSessions.forEach(function(a) {
      var m = a.modes && a.modes[0];
      var status = m ? (m.status || 'complete') : 'complete';
      var chatId = (m && (m.chatId || (m.metadata && m.metadata.chatId))) || a.chatId || null;
      items.push({ type:'archive', mode:m?m.mode:'unknown', task:a.task||'', status:status,
        runId:a.runId||a.session.id, chatId:chatId, started:a.session.started_at, ended:a.session.archived_at, data:a });
    });

    items.sort(function(a,b) {
      return new Date(b.ended||b.started||0).getTime() - new Date(a.ended||a.started||0).getTime();
    });

    if (items.length === 0) {
      el.innerHTML = '<div class="empty">No history yet.</div>';
      return;
    }

    var html = '';
    items.forEach(function(item, i) {
      var id = 'hist-' + i;
      var itemRunId = item.runId || '';
      html += '<div class="history-item" onclick="window._toggleHistory(\\'' + id + '\\',\\'' + esc(itemRunId) + '\\')">';
      html += '<div class="history-dot ' + statusDotClass(item.status) + '"></div>';
      html += '<div class="history-info">';
      html += '<div class="history-task">' + esc(item.task || item.mode) + '</div>';
      html += '<div class="history-meta">' + esc(item.mode);
      if (item.runId) html += ' \\u{00B7} ' + esc(String(item.runId).slice(0,8));
      html += ' \\u{00B7} ' + duration(item.started, item.ended);
      html += '</div></div>';
      if (item.chatId) html += chatLinkHtml(item.chatId);
      else html += '<div class="history-time">' + timeAgo(item.ended || item.started) + '</div>';
      html += '</div>';
      html += '<div class="history-detail" id="' + id + '">';
      html += '<div id="' + id + '-events"></div>';
      html += '<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--text3);font-size:0.7rem">Raw state</summary>';
      html += '<pre style="margin-top:4px">' + esc(JSON.stringify(item.data, null, 2)) + '</pre></details>';
      html += '</div>';
    });
    el.innerHTML = html;
  }

  window._toggleHistory = function(id, runId) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.toggle('open');
      if (el.classList.contains('open') && runId) {
        fetchAndRenderTimeline(runId, id + '-events');
      }
    }
  };

  var OPEN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  window._openInCursor = function(filename, ev) {
    if (ev) ev.stopPropagation();
    fetch('/api/open?file=' + encodeURIComponent(filename))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok) showToast('Opened in Cursor', data.path);
        else showToast('Failed to open', data.error || 'Unknown error');
      })
      .catch(function() { showToast('Failed to open', 'Server error'); });
  };

  var planCache = {};
  function renderPlans(state) {
    var el = document.getElementById('plans-body');
    if (state.plans.length === 0) {
      el.innerHTML = '<div class="empty">No plans yet.</div>';
      return;
    }
    var html = '';
    state.plans.forEach(function(p, i) {
      var id = 'plan-' + i;
      html += '<div class="plan-card" id="' + id + '">';
      html += '<div class="plan-header" onclick="window._togglePlan(\\'' + id + '\\',\\'' + encodeURIComponent(p.name) + '\\')">';
      html += '<span class="plan-arrow">\\u{25B6}</span>';
      html += '<span class="plan-name">' + esc(p.name) + '</span>';
      html += '<button class="plan-open" onclick="window._openInCursor(\\'' + esc(p.name) + '\\', event)" title="Open in Cursor">' + OPEN_ICON + 'Open</button>';
      html += '</div>';
      html += '<div class="plan-meta">';
      html += '<span class="plan-title">' + esc(p.title || p.name) + '</span>';
      if (p.modifiedAt) html += '<span class="plan-time">' + timeAgo(p.modifiedAt) + '</span>';
      html += '</div>';
      html += '<div class="plan-preview"><div class="plan-content" id="' + id + '-content">';
      if (p.preview) html += esc(p.preview) + (p.preview.length >= 590 ? '\\n...' : '');
      else html += '<span style="color:var(--text3)">Loading...</span>';
      html += '</div></div>';
      html += '</div>';
    });
    el.innerHTML = html;
  }

  window._togglePlan = function(id, encodedName) {
    var card = document.getElementById(id);
    if (!card) return;
    var isOpen = card.classList.toggle('open');
    if (isOpen && !planCache[encodedName]) {
      var contentEl = document.getElementById(id + '-content');
      fetch('/api/plan?name=' + encodedName)
        .then(function(r) { return r.text(); })
        .then(function(text) {
          planCache[encodedName] = true;
          contentEl.textContent = text;
        });
    }
  };

  function renderMemory(state) {
    var el = document.getElementById('memory-body');
    var keys = Object.keys(state.memory);
    if (keys.length === 0) { el.innerHTML = '<div class="empty">Empty.</div>'; return; }
    var html = '<table class="mem-table">';
    keys.forEach(function(k) {
      var v = typeof state.memory[k] === 'string' ? state.memory[k] : JSON.stringify(state.memory[k]);
      html += '<tr><td>' + esc(k) + '</td><td>' + esc(v) + '</td></tr>';
    });
    html += '</table>';
    el.innerHTML = html;
  }

  function miniMd(text) {
    return esc(text)
      .replace(/^### (.+)$/gm, '<h4 style="color:var(--text);margin:10px 0 2px;font-size:0.82rem">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="color:var(--text);margin:12px 0 2px;font-size:0.88rem">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="color:var(--text);margin:0 0 6px;font-size:0.95rem">$1</h2>')
      .replace(/^- (.+)$/gm, '<div style="padding-left:14px">\\u{2022} $1</div>');
  }

  function renderNotepad(state) {
    var el = document.getElementById('notepad-body');
    if (!state.notepad) { el.innerHTML = '<div class="empty">Empty.</div>'; return; }
    el.innerHTML = '<div class="notepad-content">' + miniMd(state.notepad) + '</div>';
  }

  function render(state) {
    document.getElementById('session-id').textContent = state.session ? state.session.id.slice(0,8) : '';
    renderStats(state);
    renderActiveCards(state);
    renderHistory(state);
    renderPlans(state);
    renderMemory(state);
    renderNotepad(state);
    document.getElementById('updated-at').textContent = 'Updated ' + new Date(state.timestamp).toLocaleTimeString();
  }

  fetch('/api/state').then(function(r){return r.json();}).then(render);

  var liveEl = document.querySelector('.live');
  var dotEl = document.querySelector('.live .dot');
  function connectSSE() {
    var es = new EventSource('/events');
    es.onmessage = function(e) {
      if (e.data === 'connected') { liveEl.style.color='var(--green)'; dotEl.style.background='var(--green)'; return; }
      try { render(JSON.parse(e.data)); } catch(err) { console.error(err); }
    };
    es.onerror = function() { es.close(); liveEl.style.color='var(--red)'; dotEl.style.background='var(--red)'; setTimeout(connectSSE,3000); };
  }
  connectSSE();
})();
</script>
</body>
</html>`;
}

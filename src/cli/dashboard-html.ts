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
body{font-family:var(--font-ui);color:var(--text);background:var(--bg);min-height:100vh;line-height:1.5;
  background-image:radial-gradient(circle at 50% 0%,#1a1028 0%,transparent 50%)}

/* Header */
header{display:flex;align-items:center;gap:16px;padding:16px 32px;border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:10;background:var(--bg)ee}
.logo{font-size:1.1rem;font-weight:700;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px}
.logo svg{width:24px;height:24px}
.header-right{margin-left:auto;display:flex;align-items:center;gap:16px}
.session-id{font-family:var(--font-mono);font-size:0.75rem;color:var(--text3)}
.live{display:flex;align-items:center;gap:6px;font-size:0.7rem;color:var(--green);font-weight:600;text-transform:uppercase;letter-spacing:0.08em}
.live .dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 var(--green)}50%{opacity:.7;box-shadow:0 0 0 5px transparent}}

main{max-width:1200px;margin:0 auto;padding:24px 32px 64px}

/* Hero — what am I working on */
.hero{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px 28px;margin-bottom:20px}
.hero.has-task{border-color:var(--orange);box-shadow:0 0 40px var(--orange-dim)}
.hero-task{font-size:1.3rem;font-weight:700;letter-spacing:-0.02em;margin-bottom:8px;display:flex;align-items:center;gap:10px}
.hero-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:0.78rem;color:var(--text2)}
.hero-meta .tag{display:flex;align-items:center;gap:5px}
.hero-meta .tag-val{font-family:var(--font-mono);color:var(--text)}
.hero-idle{color:var(--text3);font-size:1rem;text-align:center;padding:8px 0}
.hero-idle code{font-family:var(--font-mono);background:var(--surface2);padding:2px 8px;border-radius:4px;font-size:0.85rem;color:var(--orange)}

/* Compact pipeline */
.pipeline{display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:24px;padding:12px 0}
.pip-node{display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;z-index:1}
.pip-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:0.7rem;border:2px solid var(--border);background:var(--bg);transition:all .3s}
.pip-label{font-size:0.62rem;color:var(--text3);font-weight:500}
.pip-line{width:60px;height:2px;background:var(--border);margin:0 -2px;margin-bottom:18px}
.pip-node.done .pip-dot{border-color:var(--green);background:var(--green-dim);color:var(--green)}
.pip-node.done .pip-label{color:var(--green)}
.pip-node.active .pip-dot{border-color:var(--orange);background:var(--orange-dim);color:var(--orange);
  box-shadow:0 0 16px var(--orange-dim);animation:glow 2.5s ease-in-out infinite}
.pip-node.active .pip-label{color:var(--orange);font-weight:600}
@keyframes glow{0%,100%{box-shadow:0 0 16px var(--orange-dim)}50%{box-shadow:0 0 28px var(--orange-dim)}}

/* Two column layout */
.columns{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:860px){.columns{grid-template-columns:1fr}}

/* Card base */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:20px}
.card:hover{border-color:#3a3a4a}
.card-title{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);margin-bottom:14px;font-weight:600}

/* Timeline */
.timeline{position:relative;padding-left:24px}
.timeline::before{content:'';position:absolute;left:7px;top:4px;bottom:4px;width:2px;background:var(--border)}
.tl-entry{position:relative;margin-bottom:20px}
.tl-entry:last-child{margin-bottom:0}
.tl-dot{position:absolute;left:-24px;top:3px;width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:var(--bg)}
.tl-entry.active .tl-dot{border-color:var(--orange);background:var(--orange-dim);box-shadow:0 0 10px var(--orange-dim)}
.tl-entry.done .tl-dot{border-color:var(--green);background:var(--green-dim)}
.tl-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.tl-mode{font-family:var(--font-mono);font-weight:600;font-size:0.88rem}
.tl-badge{font-size:0.55rem;padding:1px 7px;border-radius:99px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
.tl-badge-active{background:var(--orange-dim);color:var(--orange)}
.tl-badge-done{background:var(--green-dim);color:var(--green)}
.tl-details{font-size:0.78rem;color:var(--text2);display:flex;flex-wrap:wrap;gap:12px;margin-bottom:4px}
.tl-details span{display:flex;align-items:center;gap:4px}
.tl-details .lbl{color:var(--text3)}
.tl-task{font-size:0.78rem;color:var(--text3);font-style:italic;margin-top:4px}
.tl-progress{height:3px;background:var(--border);border-radius:2px;margin-top:8px;overflow:hidden}
.tl-progress-fill{height:100%;background:linear-gradient(90deg,var(--orange),#fb923c);border-radius:2px;transition:width .6s}

/* Plan cards — expandable */
.plan-card{background:var(--surface2);border-radius:8px;margin-bottom:10px;overflow:hidden;border:1px solid transparent;transition:border-color .2s}
.plan-card:hover{border-color:var(--border)}
.plan-header{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none}
.plan-header:hover{background:#1e1e2d}
.plan-arrow{color:var(--text3);font-size:0.7rem;transition:transform .2s}
.plan-card.open .plan-arrow{transform:rotate(90deg)}
.plan-name{font-family:var(--font-mono);font-size:0.82rem;color:var(--blue)}
.plan-preview{padding:0 14px;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease}
.plan-card.open .plan-preview{max-height:400px;padding:0 14px 14px;overflow-y:auto}
.plan-content{font-family:var(--font-mono);font-size:0.75rem;color:var(--text2);white-space:pre-wrap;line-height:1.6;
  background:var(--bg);border-radius:6px;padding:12px;border:1px solid var(--border)}
.plan-loading{font-size:0.75rem;color:var(--text3);padding:8px 0}

/* Memory table */
.mem-table{width:100%;font-size:0.78rem}
.mem-table td{padding:5px 0;border-bottom:1px solid var(--border)}
.mem-table td:first-child{font-family:var(--font-mono);color:var(--purple);padding-right:14px;white-space:nowrap}
.mem-table td:last-child{font-family:var(--font-mono);color:var(--text2);word-break:break-all}

/* Notepad */
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
  <section class="hero" id="hero"></section>

  <div class="pipeline" id="pipeline"></div>

  <div class="columns">
    <div class="col-left">
      <div class="card">
        <div class="card-title">Activity Timeline</div>
        <div id="timeline-body"></div>
      </div>
    </div>
    <div class="col-right">
      <div class="card">
        <div class="card-title">Plans</div>
        <div id="plans-body"></div>
      </div>
      <div class="card">
        <div class="card-title">Project Memory</div>
        <div id="memory-body"></div>
      </div>
      <div class="card">
        <div class="card-title">Notepad</div>
        <div id="notepad-body"></div>
      </div>
    </div>
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

  var STAGES = [
    { id:'interview', label:'Interview', icon:'\\u{1F50D}', modes:['deep-interview'] },
    { id:'blueprint', label:'Blueprint', icon:'\\u{1F4D0}', modes:['blueprint'] },
    { id:'execute',   label:'Execute',   icon:'\\u{1F525}', modes:['forge','team','autopilot'] },
    { id:'done',      label:'Done',      icon:'\\u{2705}',  modes:[] }
  ];

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

  function esc(str) {
    return String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // --- Hero ---
  function renderHero(state) {
    var el = document.getElementById('hero');
    if (!state.activeTask && state.activeModes.length === 0) {
      el.classList.remove('has-task');
      el.innerHTML = '<div class="hero-idle">No active task. Start with <code>$forge</code>, <code>$blueprint</code>, or <code>$autopilot</code></div>';
      return;
    }
    el.classList.add('has-task');
    var task = state.activeTask || 'Working...';
    var am = state.activeModes[0];
    var html = '<div class="hero-task">\\u{1F525} ' + esc(task) + '</div>';
    html += '<div class="hero-meta">';
    if (state.session) html += '<span class="tag">Session <span class="tag-val">' + state.session.id.slice(0,8) + '</span></span>';
    if (am) {
      html += '<span class="tag">Mode <span class="tag-val">' + esc(am.mode) + '</span></span>';
      html += '<span class="tag">Phase <span class="tag-val">' + esc(am.phase) + '</span></span>';
      html += '<span class="tag">Iter <span class="tag-val">' + am.iteration + '</span></span>';
      html += '<span class="tag">Started <span class="tag-val">' + timeAgo(am.started_at) + '</span></span>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // --- Pipeline (compact) ---
  function renderPipeline(state) {
    var activeSet = {};
    var doneSet = {};
    state.activeModes.forEach(function(m) { activeSet[m.mode] = true; });
    state.completedModes.forEach(function(m) { doneSet[m.mode] = true; });
    var html = '';
    STAGES.forEach(function(stage, i) {
      if (i > 0) html += '<div class="pip-line"></div>';
      var isActive = stage.modes.some(function(m) { return activeSet[m]; });
      var isDone = stage.modes.some(function(m) { return doneSet[m]; });
      if (stage.id === 'done') isDone = state.completedModes.length > 0 && state.activeModes.length === 0;
      var cls = isActive ? 'pip-node active' : isDone ? 'pip-node done' : 'pip-node';
      html += '<div class="' + cls + '"><div class="pip-dot">' + stage.icon + '</div><div class="pip-label">' + stage.label + '</div></div>';
    });
    document.getElementById('pipeline').innerHTML = html;
  }

  // --- Timeline ---
  function renderTimeline(state) {
    var el = document.getElementById('timeline-body');
    var all = [];
    state.activeModes.forEach(function(m) { all.push({m:m, active:true}); });
    state.completedModes.forEach(function(m) { all.push({m:m, active:false}); });
    if (all.length === 0) {
      el.innerHTML = '<div class="empty">No workflow steps yet.</div>';
      return;
    }
    all.sort(function(a,b) { return new Date(a.m.started_at||0).getTime() - new Date(b.m.started_at||0).getTime(); });
    var html = '<div class="timeline">';
    all.forEach(function(entry) {
      var m = entry.m;
      var name = m.mode || (m).role || 'task';
      var phase = m.phase || (m).status || 'done';
      var cls = entry.active ? 'tl-entry active' : 'tl-entry done';
      html += '<div class="' + cls + '">';
      html += '<div class="tl-dot"></div>';
      html += '<div class="tl-head"><span class="tl-mode">' + esc(name) + '</span>';
      if (entry.active) html += '<span class="tl-badge tl-badge-active">active</span>';
      else html += '<span class="tl-badge tl-badge-done">done</span>';
      html += '</div>';
      html += '<div class="tl-details">';
      html += '<span><span class="lbl">phase</span> ' + esc(phase) + '</span>';
      if (m.iteration) html += '<span><span class="lbl">iter</span> ' + m.iteration + '</span>';
      html += '<span><span class="lbl">started</span> ' + timeAgo(m.started_at) + '</span>';
      if (m.completed_at) html += '<span><span class="lbl">completed</span> ' + timeAgo(m.completed_at) + '</span>';
      else if (m.updated_at) html += '<span><span class="lbl">updated</span> ' + timeAgo(m.updated_at) + '</span>';
      html += '</div>';
      var task = (m.metadata && m.metadata.task) || (m).task || null;
      if (task) html += '<div class="tl-task">' + esc(task) + '</div>';
      if (entry.active) {
        var pct = 50;
        var phaseMap = PHASES[m.mode];
        if (phaseMap && phaseMap[m.phase] !== undefined) pct = phaseMap[m.phase];
        html += '<div class="tl-progress"><div class="tl-progress-fill" style="width:' + pct + '%"></div></div>';
      }
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  // --- Plans (expandable with content) ---
  var planCache = {};

  function renderPlans(state) {
    var el = document.getElementById('plans-body');
    if (state.plans.length === 0) {
      el.innerHTML = '<div class="empty">No plans yet. Run <code>$blueprint</code> to create one.</div>';
      return;
    }
    var html = '';
    state.plans.forEach(function(p, i) {
      var id = 'plan-' + i;
      html += '<div class="plan-card" id="' + id + '">';
      html += '<div class="plan-header" onclick="window._togglePlan(\\'' + id + '\\',\\'' + encodeURIComponent(p.name) + '\\')">';
      html += '<span class="plan-arrow">\\u{25B6}</span>';
      html += '<span class="plan-name">' + esc(p.name) + '</span>';
      html += '</div>';
      html += '<div class="plan-preview"><div class="plan-content" id="' + id + '-content">';
      if (p.preview) html += esc(p.preview) + (p.preview.length >= 590 ? '\\n...' : '');
      else html += '<span class="plan-loading">Loading...</span>';
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

  // --- Memory ---
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

  // --- Notepad ---
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

  // --- Render all ---
  function render(state) {
    document.getElementById('session-id').textContent = state.session ? state.session.id.slice(0,8) : '';
    renderHero(state);
    renderPipeline(state);
    renderTimeline(state);
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

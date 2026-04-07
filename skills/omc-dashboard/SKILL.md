---
name: omc-dashboard
description: Render an interactive OMC workflow dashboard inside Cursor via Canvas, or launch the standalone web dashboard.
argument-hint: "[web]"
---

# omc-dashboard

> Render an interactive OMC workflow dashboard inside Cursor via Canvas, or launch the standalone web dashboard.

## Invocation

```
$dashboard          — render Canvas dashboard in Cursor
$dashboard web      — launch omc dashboard web server
```

## When to use

- You want to see active workflow state at a glance.
- Checking progress during a `$forge` or `$team` session.
- Reviewing plans, memory, and notepad contents.
- Showing project status to collaborators.

## Protocol

### Canvas mode (default)

1. **Collect state** — read `.omc/state/*-state.json`, `.omc/plans/`, `.omc/project-memory.json`, `.omc/notepad.md`, and `.omc/state/session.json`.
2. **Build visualization** — generate a single-page HTML Canvas showing:
   - Pipeline tracker (Interview → Blueprint → Execute → Done)
   - Active modes with phase, iteration, and progress
   - Plans list
   - Project memory key-value table
   - Notepad contents
3. **Render Canvas** — use the `canvas` browser tool with title "OMC Dashboard" and the generated HTML.
4. **Reuse** — if a canvas with id `omc-dashboard` already exists, update it by editing the source HTML file.

### Web mode

Run `omc dashboard` in a terminal. This starts a local HTTP server (default port 3721) with:
- Real-time SSE updates when `.omc/` files change
- Full dashboard at `http://localhost:3721`
- API endpoint at `/api/state` returning JSON

## Canvas design guidelines

- Dark theme: background `#0a0a0f`, surface `#12121a`
- Accent orange `#f97316` for active states, green `#3fb950` for completed
- Use JetBrains Mono for data, Inter for labels
- Pipeline as horizontal stepper with glowing active node
- Cards for each data section with subtle borders
- Show "No active workflows" idle state when nothing is running

## State sources

| Data | Path | Format |
|------|------|--------|
| Session | `.omc/state/session.json` | `{ id, started_at }` |
| Mode states | `.omc/state/{mode}-{runId}-state.json` | `{ mode, runId, status, phase, iteration, task, ... }` |
| Legacy mode states | `.omc/state/{mode}-state.json` | Backward compat (no runId) |
| Archives | `.omc/archive/{runId}.json` | `{ runId, session, task, modes }` |
| Plans | `.omc/plans/*.md` | Markdown files |
| Memory | `.omc/project-memory.json` | `{ key: value, ... }` |
| Notepad | `.omc/notepad.md` | Markdown |

Each workflow invocation (forge, blueprint, etc.) creates a unique `runId`. Multiple runs can coexist — the dashboard shows all active runs as separate cards and lists archived runs in the history section.

## Exit

Canvas mode: the canvas stays open until closed by the user.
Web mode: Ctrl+C to stop the server.

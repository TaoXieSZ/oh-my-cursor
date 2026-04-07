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
| Event logs | `.omc/logs/{runId}.jsonl` | Append-only JSONL, one `RunEvent` per line |
| Archives | `.omc/archive/{runId}.json` | `{ runId, session, task, modes, events? }` |
| Plans | `.omc/plans/*.md` | Markdown files |
| Memory | `.omc/project-memory.json` | `{ key: value, ... }` |
| Notepad | `.omc/notepad.md` | Markdown |

Each workflow invocation (forge, blueprint, etc.) creates a unique `runId`. Multiple runs can coexist — the dashboard shows all active runs as separate cards and lists archived runs in the history section.

## Event timeline (P1)

State transitions are automatically logged as events in `.omc/logs/{runId}.jsonl`. Each line is a JSON object:

```json
{ "ts": "2026-04-07T10:00:00Z", "kind": "phase", "summary": "Phase: init → verify" }
```

**Auto-captured kinds:** `status` (start, complete, cancel), `phase` (transitions), `iteration` (bumps).

**Manual injection:** Use MCP `event_append` with `runId`, `kind`, `summary`, and optional `detail` to add custom events (tool calls, file edits, milestones, notes).

**Dashboard:** Active cards show a collapsible mini-timeline (last 5 events). History items fetch the full event log on expand via `/api/events?runId=X`.

**Archival:** When a run is archived, its event log is embedded in `ArchivedSession.events` and the `.jsonl` file is removed.

## Insights & Metrics (P2)

The stats bar shows computed metrics:
- **Active** — currently running workflows
- **Total Runs** — active + completed + archived
- **Success Rate** — CSS donut showing complete/(complete+cancelled) ratio
- **Avg Duration** — mean duration of completed runs
- **Events** — total event count across all runs
- **Current Focus** — active task description

Active cards include a **phase duration bar** — a stacked horizontal bar showing time spent per phase, computed from event timestamps.

Timeline events support **kind filtering** — click a filter pill (phase/status/iteration/etc.) to show only matching events.

## Theme Toggle

Click the sun/moon icon in the header to switch between dark and light themes. Preference is persisted in `localStorage('omc-theme')`.

## Exit

Canvas mode: the canvas stays open until closed by the user.
Web mode: Ctrl+C to stop the server.

---
name: omr-dashboard
description: Optional extra: render an interactive OMR workflow dashboard inside Cursor via Canvas, or launch the standalone web dashboard.
argument-hint: "[web]"
---

# omr-dashboard

> Optional extra: render an interactive OMR workflow dashboard inside Cursor via Canvas, or launch the standalone web dashboard.

## Invocation

```
$dashboard          — render Canvas dashboard in Cursor
$dashboard web      — launch omr dashboard web server
```

## When to use

- You want to see active workflow state at a glance.
- Checking progress during a `$forge` or `$team` session.
- Reviewing plans, memory, and notepad contents.
- Showing project status to collaborators.

## Protocol

### Canvas mode (default)

1. **Collect state** — read `.omr/state/*-state.json`, `.omr/plans/`, `.omr/project-memory.json`, `.omr/notepad.md`, and `.omr/state/session.json`.
2. **Build visualization** — generate a single-page HTML Canvas showing:
   - Pipeline tracker (Interview → Blueprint → Execute → Done)
   - Active modes with phase, iteration, and progress
   - Plans list
   - Project memory key-value table
   - Notepad contents
3. **Render Canvas** — use the `canvas` browser tool with title "OMR Dashboard" and the generated HTML.
4. **Reuse** — if a canvas with id `omr-dashboard` already exists, update it by editing the source HTML file.

### Web mode

Run `omr dashboard` in a terminal. This starts a local HTTP server (default port 3721) with:
- Real-time SSE updates when `.omr/` files change
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
| Session | `.omr/state/session.json` | `{ id, started_at }` |
| Mode states | `.omr/state/{mode}-{runId}-state.json` | `{ mode, runId, status, phase, iteration, task, ... }` |
| Legacy mode states | `.omr/state/{mode}-state.json` | Backward compat (no runId) |
| Event logs | `.omr/logs/{runId}.jsonl` | Append-only JSONL, one `RunEvent` per line |
| Archives | `.omr/archive/{runId}.json` | `{ runId, session, task, modes, events? }` |
| Plans | `.omr/plans/*.md` | Markdown files |
| Memory | `.omr/project-memory.json` | `{ key: value, ... }` |
| Notepad | `.omr/notepad.md` | Markdown |

Each workflow invocation (forge, blueprint, etc.) creates a unique `runId`. Multiple runs can coexist — the dashboard shows all active runs as separate cards and lists archived runs in the history section.

## Event timeline (P1)

State transitions are automatically logged as events in `.omr/logs/{runId}.jsonl`. Each line is a JSON object:

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

## Memory Visualization

The memory panel replaces the plain key-value table with a structured, searchable display:

- **Grouped by prefix** — keys are grouped by their first segment (split on `.` or `/`). Ungrouped keys appear under "General".
- **Search filter** — type in the search box to filter keys in real-time.
- **Expandable values** — click a key to see the full JSON value in a formatted block.
- **Run badges** — each key shows colored badges indicating which workflow runs touched it (from `memory-index.json`).

### Bidirectional run-key links

- **On active cards**: purple pills below the metadata show which memory keys the current run has modified.
- **In history details**: expanding a history item shows memory keys modified by that run.

### Data tracking

MCP `memory_set` and `memory_delete` accept optional `runId` and `mode` parameters. When provided, a record is appended to `.omr/memory-index.json` mapping `key → [{runId, mode, action, ts}]`. Index is capped at 20 entries per key.

| Data | Path | Format |
|------|------|--------|
| Memory index | `.omr/memory-index.json` | `{ key: [{runId, mode, action, ts, key}] }` |

## Theme Toggle

Click the sun/moon icon in the header to switch between dark and light themes. Preference is persisted in `localStorage('omr-theme')`.

## Exit

Canvas mode: the canvas stays open until closed by the user.
Web mode: Ctrl+C to stop the server.

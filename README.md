# oh-my-cursor (OMC)

> Cursor 3 gives you a powerful engine. OMC gives you a better way to drive it.

[CI](https://github.com/TaoXieSZ/oh-my-cursor/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/oh-my-cursor)
[License: MIT](https://opensource.org/licenses/MIT)
[Node.js](https://nodejs.org)

OMC is a lightweight workflow toolkit for [Cursor IDE](https://cursor.sh).

Cursor 3 introduced the Agents Window, `/worktree`, `/best-of-n`, and native Plan Mode — great low-level primitives. OMC builds on top of these to provide:

- **Durable context**: plans, notes, logs, and memory in `.omc/`
- **A small workflow spine**: clarify → plan → execute → stop/resume cleanly
- **Simple setup and health checks**: `omc setup` and `omc doctor`
- **Optional extras when you need them**: dashboard, schedule, notifications, and advanced workflows

## Quick start

### Requirements

- Node.js 20+
- Cursor IDE installed

### Install

```bash
npm install -g oh-my-cursor
omc setup
```

That's it. Restart Cursor to load the new rules and skills.

### Verify

```bash
omc doctor
```

## Core workflow

1. `**/omc-deep-interview**` — clarify scope when the request or boundaries are vague
2. `**/omc-blueprint**` — approve the implementation plan and review tradeoffs
3. `**/omc-forge**` — execute with a persistent verify-fix loop until done
4. `**/omc-cancel**` — stop a workflow cleanly when the loop should not continue

```text
/omc-deep-interview "clarify the authentication change"
/omc-blueprint "approve the safest implementation path"
/omc-forge "carry the approved plan to completion"
```

> **Tip**: type `/skills` in Cursor chat to see all available skills. In Cursor's slash picker, you'll typically see `/omc-`* command names.

## Optional extras

OMC keeps the default story small. These extras are available, but they are not the product center:

- `/omc-team` for parallel work with clear file ownership
- `/omc-dashboard` for live workflow visibility
- `/omc-schedule` for periodic checks while a session is active
- `/omc-autopilot` and `/omc-web-clone` for heavier, specialized workflows
- `/omc-analyze`, `/omc-code-review`, `/omc-tdd`, and `/omc-ecomode` as supporting tools around the core path

## Core command guide

Use this as the default decision guide before reaching for optional extras:


| Command               | Use when                                                    | Avoid when                                       |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `/omc-deep-interview` | Requirement is vague, user says "don't assume"              | Task is already fully scoped                     |
| `/omc-blueprint`      | Need a reviewed plan before coding                          | One-file trivial changes                         |
| `/omc-forge`          | Plan is approved and one owner should push to done          | Work splits cleanly into independent lanes       |
| `/omc-cancel`         | You need to stop active OMC modes cleanly                   | You still expect the current loop to continue    |

### Core path examples

```text
# 1) Requirement is unclear
/omc-deep-interview "we need to improve onboarding, clarify scope and acceptance criteria first"

# 2) Medium task, want lightweight planning
/omc-blueprint --quick "add API pagination for /users and /orders with backward compatibility"

# 3) Complex task, need full planning + risks
/omc-blueprint "design a safe migration from local cache to redis with rollback plan"

# 4) Approved plan, single-owner execution
/omc-forge "execute the approved redis migration plan to completion with full verification"

```

### Optional extras

```text
# Parallelizable feature
/omc-team "split auth revamp into backend, frontend, and tests with clear file ownership"

# Bug/incident investigation
/omc-analyze "investigate why webhook retries spike after deploy and identify root cause"

# Test-first delivery
/omc-tdd "add rate limiting middleware for login endpoint using test-first workflow"

# Pre-merge safety check
/omc-code-review "review current diff for correctness, regressions, and missing tests"

# Observe workflow state
/omc-dashboard "show active modes and plan/test artifact status"

# Abort active workflow
/omc-cancel "cancel current forge run and mark state as cancelled"

# Budget mode
/omc-ecomode "enable token-efficient mode for this debugging session"

# Full automatic pipeline
/omc-autopilot "build a minimal internal changelog viewer from markdown files"
```

## What OMC installs


| Component   | Location                     | Purpose                                                       |
| ----------- | ---------------------------- | ------------------------------------------------------------- |
| Rules       | `~/.cursor/rules/omc-*.mdc`  | Lightweight routing and workflow conventions                  |
| Skills      | `~/.cursor/skills/omc-*/`    | Core workflows plus optional extras                           |
| Prompts     | `~/.cursor/omc-prompts/*.md` | Optional role pack for deeper agent guidance                  |
| MCP servers | Cursor MCP config            | Persistence helpers for state and memory                      |
| Hooks       | `~/.cursor/hooks/omc/`       | Simple lifecycle helpers (session init, archive)              |
| State       | `.omc/` (project root)       | Durable project context: plans, logs, notes, memory           |


### Scopes

- **User scope** (default): installs to `~/.cursor/` — available in all projects
- **Project scope**: installs to `.cursor/` in the project — scoped to one project

```bash
omc setup --scope project
```

## How OMC relates to Cursor 3

OMC does **not** replace Cursor — it adds a small workflow and context layer around it.


| Concern         | Cursor 3 native                 | OMC adds                                                                    |
| --------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Planning        | Plan Mode (`Shift+Tab`)         | Structured deliberation with PRD artifacts, tradeoff review, approval gates |
| Persistence     | Session handoff (local ↔ cloud) | Cross-session project memory, PRDs, test specs, archived sessions           |
| Completion      | Single agent chat               | `/omc-forge` — persistent verify-fix loop that doesn't stop until done      |
| Clarification   | Ad hoc                          | `/omc-deep-interview` — Socratic interview with ambiguity scoring           |

Think of OMC as **better task routing + durable context**, with a few opinionated workflows on top.

## Skills reference

Type `/skills` in Cursor chat or run `omc skills` in the terminal to see all installed skills.

### Core path


| Skill                 | Trigger                    | Purpose                                                                |
| --------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `/omc-deep-interview` | "clarify", "don't assume"  | Socratic interview to clarify scope                                    |
| `/omc-blueprint`      | "plan this", "blueprint"   | Structured planning with tradeoff review (`--quick` for lighter tasks) |
| `/omc-forge`          | "keep going", "don't stop" | Persistent completion loop                                             |
| `/omc-cancel`         | "cancel", "stop"           | Clean cancellation of active modes                                     |


### Supporting tools


| Skill              | Trigger                  | Purpose                                    |
| ------------------ | ------------------------ | ------------------------------------------ |
| `/omc-analyze`     | "analyze", "investigate" | Deep investigation and root cause analysis |
| `/omc-code-review` | "review code"            | Structured code review                     |
| `/omc-ecomode`     | "eco", "budget"          | Token-efficient mode                       |


### Optional extras


| Skill            | Trigger                    | Purpose                                        |
| ---------------- | -------------------------- | ---------------------------------------------- |
| `/omc-team`      | "team", "parallel"         | Work decomposition for independent lanes       |
| `/omc-tdd`       | "tdd", "test first"       | Test-driven development cycle                  |
| `/omc-dashboard` | "dashboard", "show status" | Live workflow dashboard (Canvas or web server) |
| `/omc-schedule`  | "schedule", "watch"        | Periodic checks while a Cursor session is open |
| `/omc-autopilot` | "build me", "autopilot"    | Full lifecycle: idea → spec → plan → build     |
| `/omc-web-clone` | "clone site", "web-clone"  | Clone a website from URL                       |


> **Compatibility note**: if you previously used `/plan`, use `/omc-blueprint --quick` for the same lightweight planning intent.

## Roles

OMC ships 20 role prompts that define agent "personalities" — each with a focused identity, constraints, execution loop, and output contract. The prompt pack is useful depth, but it is not the core product story.

### Core roles


| Role        | Posture     | Purpose                                                      |
| ----------- | ----------- | ------------------------------------------------------------ |
| `executor`  | deep-worker | Implementation: explore, implement, verify, finish           |
| `architect` | read-only   | Analysis: diagnose, recommend with file:line evidence        |
| `debugger`  | deep-worker | Root cause: multi-hypothesis approach, no fix without cause  |
| `verifier`  | read-only   | Completion check: PASS/FAIL/PARTIAL with evidence            |
| `explorer`  | fast-lane   | Codebase search: find files, map structure, answer questions |
| `planner`   | read-only   | Plan creation: architecture, sequencing, tradeoffs           |


### Specialist roles


| Role                   | Posture     | Purpose                                                                |
| ---------------------- | ----------- | ---------------------------------------------------------------------- |
| `build-fixer`          | deep-worker | Build/compile error resolution: minimal diffs, no architecture changes |
| `code-reviewer`        | read-only   | Diff review: correctness, safety, style                                |
| `critic`               | read-only   | Plan review: verify plans are clear, complete, and actionable          |
| `designer`             | deep-worker | UI/UX: visually striking, production-grade interfaces                  |
| `git-master`           | deep-worker | Git: atomic commits, style-matched messages, rebasing                  |
| `researcher`           | read-only   | External docs: find reliable answers with source citations             |
| `test-engineer`        | deep-worker | Test writing: coverage analysis, test-first approach                   |
| `writer`               | deep-worker | Documentation and prose                                                |
| `security-reviewer`    | read-only   | Security audit: OWASP, auth, secrets                                   |
| `performance-reviewer` | read-only   | Performance: hotspots, complexity, memory/latency tradeoffs            |
| `quality-reviewer`     | read-only   | Quality: logic defects, anti-patterns, SOLID violations                |
| `style-reviewer`       | read-only   | Style: formatting, naming, idioms, lint conventions                    |
| `api-reviewer`         | read-only   | API: contracts, backward compatibility, error semantics                |
| `code-simplifier`      | deep-worker | Simplify: reduce complexity, remove duplication, preserve behavior     |


### Using roles with `/omc-team`

```text
/omc-team "implement the three API endpoints" (assigns executor roles by default)
/omc-team "audit the payment module" (auto-routes to security-reviewer)
```

Each role prompt is a markdown file with `<identity>`, `<constraints>`, `<execution_loop>`, and `<output_contract>` sections. The `/omc-team` skill reads the prompt, appends the shared [`_team-protocol.md`](prompts/_team-protocol.md) partial (so the lane posts claim / progress / handoff / release events to the blackboard), and includes it in the lane brief.

### Team chatter in the chat session

When `/omc-team` dispatches multiple lanes, the leader echoes every new blackboard post back into the main chat composer as two rendered blocks — a compact lane status table and a running chatter log — so a session feels like the oh-my-codex tmux panes even without leaving Cursor:

```text
| Lane | Role          | State    | Last update              |
| ---- | ------------- | -------- | ------------------------ |
| 1    | executor      | active   | claim src/api/users.ts   |
| 2    | designer      | progress | form draft complete      |
| 3    | test-engineer | waiting  | —                        |

[14:22:01] run123-lane-1·executor      status    started
[14:22:03] run123-lane-1·executor      claim     src/api/users.ts
[14:22:18] run123-lane-2·designer      progress  form draft complete
[14:22:30] run123-lane-1·executor      release   src/api/users.ts
```

Under the hood:

- Lanes post to the shared blackboard via the `blackboard_post` MCP tool (with `lane` + `role` set).
- The leader polls `blackboard_tail(cursor)` for incremental updates and re-renders the two blocks in chat.
- At the end of the run the leader calls `team_transcript_write` to save the full log to `.omc/state/team/<runId>-transcript.md`.
- For a side-terminal view (closest to tmux panes), run `omc team watch --run <runId>` while the leader runs in chat.

### Role routing

When no role is specified, keywords in the task description route to the appropriate role:


| Keywords                                    | Role                   |
| ------------------------------------------- | ---------------------- |
| "implement", "build", "create"              | `executor`             |
| "analyze", "diagnose"                       | `architect`            |
| "debug", "fix bug", "root cause"            | `debugger`             |
| "verify", "check", "validate"               | `verifier`             |
| "explore", "find", "search"                 | `explorer`             |
| "plan", "design"                            | `planner`              |
| "build error", "compile error", "fix build" | `build-fixer`          |
| "review", "code review"                     | `code-reviewer`        |
| "review plan", "critique"                   | `critic`               |
| "UI", "UX", "frontend", "visual"            | `designer`             |
| "git", "commit", "rebase"                   | `git-master`           |
| "research", "docs lookup"                   | `researcher`           |
| "test", "write tests"                       | `test-engineer`        |
| "document", "readme"                        | `writer`               |
| "security", "audit"                         | `security-reviewer`    |
| "performance", "slow", "latency"            | `performance-reviewer` |
| "quality", "logic bugs", "anti-pattern"     | `quality-reviewer`     |
| "style", "naming", "formatting"             | `style-reviewer`       |
| "API", "backward compat", "contract"        | `api-reviewer`         |
| "simplify", "deduplicate", "cleanup"        | `code-simplifier`      |


## Optional extras

OMC includes optional extras for users who want more runtime surface area, but they are intentionally secondary to the core workflow-and-context story.

### Dashboard

```bash
omc dashboard              # Launch at http://localhost:3721
omc dashboard --port 4000  # Custom port
```

The dashboard shows:

- **Pipeline tracker** — which workflow stage is active (Interview → Blueprint → Execute → Done)
- **Active modes** — phase, iteration, and progress for each running mode
- **Plans** — list of PRDs and test specs
- **Project memory** — cross-session key-value pairs
- **Notepad** — scratch notes

State updates are pushed via SSE — no manual refresh needed.

You can also invoke `/omc-dashboard` inside Cursor to render the dashboard as an inline Canvas.

## CLI reference

```bash
omc setup [--scope user|project] [--force]    # Install workflows and durable context conventions
omc doctor [--scope user|project] [--verbose] # Verify installation health
omc status                                    # Show active mode and durable context state
omc skills                                    # List core workflows and optional extras
omc archive                                   # Archive session → .omc/archive/
omc archives                                  # List archived sessions

# Optional extras
omc schedule list [--scope user|project]      # Show scheduled tasks
omc schedule add-rss --scope user --url <feed>
                                              # Register a user-scoped RSS watcher
omc schedule cancel <id> [--scope user|project]
                                              # Cancel a scheduled task
omc schedule resume [id] [--scope user|project]
                                              # Resume one or all suspended tasks
omc schedule run-now <id> [--scope user|project]
                                              # Request an immediate rerun
omc dashboard [--port <number>]               # Launch live web dashboard
omc team watch [--run <id>] [--no-follow]     # Tail team chatter from the blackboard
omc notify emit --task-id <id> --summary <text> [--scope user|project]
                                              # Emit core desktop + feed notification
omc notify recent [--limit N] [--scope user|project]
                                              # Show recent core notifications
omc notify test-desktop [message]              # Desktop notification smoke test
omc notify slack [message]                     # Test Slack webhook (forge-related URL)
omc notify forge                              # Push forge-state snapshot to Slack
omc help                                      # Show help
omc version                                   # Print version
```

Run `omc help` for the full command list and notify options.

### Notifications (optional)

OMC can post to a [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks) when **forge** workflow state is saved through the OMC state API (including MCP `state_write` for mode `forge`). Configure `OMC_SLACK_WEBHOOK_URL`, `OMC_FORGE_SLACK_WEBHOOK_URL`, or `notifications.slack_webhook_url` in `.omc/omc-config.json`.

**Other modes** (`deep-interview`, `blueprint`, `team`, etc.) **do not** trigger that automatic webhook. To send a manual message or a snapshot of current forge state, use `omc notify slack` or `omc notify forge`. See `skills/omc-forge/SKILL.md` for details.

OMC also supports a built-in notification feed for non-Slack workflows such as
scheduled checks. Use `omc notify emit` to create a durable dashboard entry and,
by default, a macOS desktop notification at the same time.

For user-scoped scheduled tasks, pass `--scope user` so the durable
notification log lives under the same user-scoped OMC runtime root as the task
state.

### Schedule lifecycle helpers

OMC keeps scheduling generic. Use `omc schedule list`, `cancel`, `resume`, and
`run-now` to inspect or adjust scheduled task state. The primary user workflow
still lives in `/omc-schedule`, while the CLI stays a thin lifecycle surface.

For global, cross-project tasks, use `--scope user`. User-scoped schedule state
and resume markers live under `~/.cursor/omc/`, while project-scoped runtime
state continues to live under the current repo's `.omc/`.

The built-in RSS watcher is intentionally thin:

```bash
omc schedule add-rss --scope user \
  --url https://duanyytop.github.io/agents-radar/feed.xml \
  --every 15m \
  --title "Agents Radar RSS"
```

This registers the task, requests an immediate baseline run, and lets the
schedule worker continue polling while the current OMC session remains active.

Downstream products that previously depended on monitor-specific OMC commands
should migrate to generic schedule state plus `omc notify emit`. Any
domain-specific monitor UI belongs downstream, not in OMC core.

## State management

All runtime state lives under `.omc/` in the project root:

```
.omc/
├── state/           # Mode state files (forge, team, etc.)
├── plans/           # PRDs and test specs from planning
├── logs/            # Session logs
├── notepad.md       # Scratch notes
└── project-memory.json  # Cross-session memory
```

## Persistence helpers

### MCP servers

OMC registers two MCP servers in Cursor:

- **omc-state** — read/write `.omc/` state, plans, and notepad
- **omc-memory** — cross-session project memory (key-value store)

These are implementation helpers for persistence. They are useful, but they are not the main reason to adopt OMC.

### Hooks

OMC registers Cursor lifecycle hooks for automatic state management:


| Hook                | Event          | Purpose                                             |
| ------------------- | -------------- | --------------------------------------------------- |
| `session-start.mjs` | `sessionStart` | Ensures `.omc/` dirs exist, creates/updates session |
| `session-end.mjs`   | `stop`         | Archives completed runs, marks session ended        |


Hooks are installed to `~/.cursor/hooks/omc/` (user scope) or `.cursor/hooks/omc/` (project scope) and registered in `hooks.json`. They run automatically on agent lifecycle events — no manual invocation needed.

## Compared to oh-my-codex

OMC is inspired by [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) and shares the same workflow philosophy. Key differences:


|               | oh-my-codex                  | oh-my-cursor                                         |
| ------------- | ---------------------------- | ---------------------------------------------------- |
| Target        | Codex CLI                    | Cursor IDE                                           |
| Orchestration | `AGENTS.md` (monolithic)     | `.cursor/rules/*.mdc` (modular)                      |
| Team mode     | tmux sessions                | Agents Window + Task tool (role-based decomposition) |
| Skills format | `.codex/skills/`             | `.cursor/skills/` (native)                           |
| Role prompts  | 33 TOML-generated prompts    | 20 markdown prompts with XML sections                |
| State         | `.omx/`                      | `.omc/`                                              |
| Install       | `npm install -g oh-my-codex` | `npm install -g oh-my-cursor`                        |


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and how to add skills, roles, or CLI commands.

## License

[MIT](LICENSE)
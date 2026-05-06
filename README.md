# oh-my-cursor (OMR)

> Cursor 3 gives you a powerful engine. OMR gives you a better way to drive it.

[CI](https://github.com/TaoXieSZ/oh-my-cursor/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/oh-my-cursor)
[License: MIT](https://opensource.org/licenses/MIT)
[Node.js](https://nodejs.org)

OMR is a lightweight workflow toolkit for [Cursor IDE](https://cursor.sh).

Cursor 3 introduced the Agents Window, `/worktree`, `/best-of-n`, and native Plan Mode — great low-level primitives. OMR builds on top of these to provide:

- **Durable context**: plans, notes, logs, and memory in `.omr/`
- **A small workflow spine**: clarify → plan → execute → stop/resume cleanly
- **Simple setup and health checks**: `omr setup` and `omr doctor`
- **Optional extras when you need them**: dashboard, schedule, notifications, and advanced workflows

## Quick start

### Requirements

- Node.js 20+
- Cursor IDE installed

### Install

```bash
npm install -g oh-my-cursor
omr setup
```

That's it. Restart Cursor to load the new rules and skills.

### Verify

```bash
omr doctor
```

## Core workflow

1. `**/omr-deep-interview**` — clarify scope when the request or boundaries are vague
2. `**/omr-blueprint**` — approve the implementation plan and review tradeoffs
3. `**/omr-forge**` — execute with a persistent verify-fix loop until done
4. `**/omr-cancel**` — stop a workflow cleanly when the loop should not continue

```text
/omr-deep-interview "clarify the authentication change"
/omr-blueprint "approve the safest implementation path"
/omr-forge "carry the approved plan to completion"
```

> **Tip**: type `/skills` in Cursor chat to see all available skills. In Cursor's slash picker, you'll typically see `/omr-`* command names.

## Optional extras

OMR keeps the default story small. These extras are available, but they are not the product center:

- `/omr-team` for parallel work with clear file ownership
- `/omr-dashboard` for live workflow visibility
- `/omr-schedule` for periodic checks while a session is active
- `/omr-autopilot` and `/omr-web-clone` for heavier, specialized workflows
- `/omr-analyze`, `/omr-code-review`, `/omr-tdd`, and `/omr-ecomode` as supporting tools around the core path

## Core command guide

Use this as the default decision guide before reaching for optional extras:


| Command               | Use when                                                    | Avoid when                                       |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `/omr-deep-interview` | Requirement is vague, user says "don't assume"              | Task is already fully scoped                     |
| `/omr-blueprint`      | Need a reviewed plan before coding                          | One-file trivial changes                         |
| `/omr-forge`          | Plan is approved and one owner should push to done          | Work splits cleanly into independent lanes       |
| `/omr-cancel`         | You need to stop active OMR modes cleanly                   | You still expect the current loop to continue    |

### Core path examples

```text
# 1) Requirement is unclear
/omr-deep-interview "we need to improve onboarding, clarify scope and acceptance criteria first"

# 2) Medium task, want lightweight planning
/omr-blueprint --quick "add API pagination for /users and /orders with backward compatibility"

# 3) Complex task, need full planning + risks
/omr-blueprint "design a safe migration from local cache to redis with rollback plan"

# 4) Approved plan, single-owner execution
/omr-forge "execute the approved redis migration plan to completion with full verification"

```

### Optional extras

```text
# Parallelizable feature
/omr-team "split auth revamp into backend, frontend, and tests with clear file ownership"

# Bug/incident investigation
/omr-analyze "investigate why webhook retries spike after deploy and identify root cause"

# Test-first delivery
/omr-tdd "add rate limiting middleware for login endpoint using test-first workflow"

# Pre-merge safety check
/omr-code-review "review current diff for correctness, regressions, and missing tests"

# Observe workflow state
/omr-dashboard "show active modes and plan/test artifact status"

# Abort active workflow
/omr-cancel "cancel current forge run and mark state as cancelled"

# Budget mode
/omr-ecomode "enable token-efficient mode for this debugging session"

# Full automatic pipeline
/omr-autopilot "build a minimal internal changelog viewer from markdown files"
```

## What OMR installs


| Component   | Location                     | Purpose                                                       |
| ----------- | ---------------------------- | ------------------------------------------------------------- |
| Rules       | `~/.cursor/rules/omr-*.mdc`  | Lightweight routing and workflow conventions                  |
| Skills      | `~/.cursor/skills/omr-*/`    | Core workflows plus optional extras                           |
| Prompts     | `~/.cursor/omr-prompts/*.md` | Optional role pack for deeper agent guidance                  |
| MCP servers | Cursor MCP config            | Persistence helpers for state and memory                      |
| Hooks       | `~/.cursor/hooks/omr/`       | Simple lifecycle helpers (session init, archive)              |
| State       | `.omr/` (project root)       | Durable project context: plans, logs, notes, memory           |


### Scopes

- **User scope** (default): installs to `~/.cursor/` — available in all projects
- **Project scope**: installs to `.cursor/` in the project — scoped to one project

```bash
omr setup --scope project
```

## How OMR relates to Cursor 3

OMR does **not** replace Cursor — it adds a small workflow and context layer around it.


| Concern         | Cursor 3 native                 | OMR adds                                                                    |
| --------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Planning        | Plan Mode (`Shift+Tab`)         | Structured deliberation with PRD artifacts, tradeoff review, approval gates |
| Persistence     | Session handoff (local ↔ cloud) | Cross-session project memory, PRDs, test specs, archived sessions           |
| Completion      | Single agent chat               | `/omr-forge` — persistent verify-fix loop that doesn't stop until done      |
| Clarification   | Ad hoc                          | `/omr-deep-interview` — Socratic interview with ambiguity scoring           |

Think of OMR as **better task routing + durable context**, with a few opinionated workflows on top.

## Skills reference

Type `/skills` in Cursor chat or run `omr skills` in the terminal to see all installed skills.

### Core path


| Skill                 | Trigger                            | Purpose                                                                |
| --------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `/omr-deep-interview` | "clarify", "don't assume"          | Socratic interview to clarify scope                                    |
| `/omr-blueprint`      | "plan this", "blueprint"           | Structured planning with tradeoff review (`--quick` for lighter tasks) |
| `/omr-ralplan`        | "ralplan", "consensus plan"        | Planner→Architect→Critic loop + vague-execution gate                   |
| `/omr-forge`          | "keep going", "don't stop"         | Persistent completion loop                                             |
| `/omr-cancel`         | "cancel", "stop"                   | Clean cancellation of active modes                                     |


### Supporting tools


| Skill                  | Trigger                                  | Purpose                                                |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `/omr-analyze`         | "analyze", "investigate"                 | Deep investigation and root cause analysis             |
| `/omr-code-review`     | "review code"                            | Structured code review                                 |
| `/omr-ai-slop-cleaner` | "deslop", "cleanup", "refactor slop"     | Regression-safe AI slop cleanup workflow               |
| `/omr-ask`             | "ask claude", "ask gemini", "second opinion" | External CLI second opinion with artifact capture  |
| `/omr-ecomode`         | "eco", "budget"                          | Token-efficient mode                                   |


### Optional extras


| Skill              | Trigger                          | Purpose                                                  |
| ------------------ | -------------------------------- | -------------------------------------------------------- |
| `/omr-team`        | "team", "parallel"               | Work decomposition for independent lanes                 |
| `/omr-tdd`         | "tdd", "test first"              | Test-driven development cycle                            |
| `/omr-git-master`  | "split commits", "rebase", "git" | Atomic commits, style-matched messages, safe history ops |
| `/omr-wiki`        | "wiki add", "wiki query"         | Persistent project knowledge base under `.omr/wiki/`     |
| `/omr-dashboard`   | "dashboard", "show status"       | Live workflow dashboard (Canvas or web server)           |
| `/omr-schedule`    | "schedule", "watch"              | Periodic checks while a Cursor session is open           |
| `/omr-autopilot`   | "build me", "autopilot"          | Full lifecycle: idea → spec → plan → build               |
| `/omr-web-clone`   | "clone site", "web-clone"        | Clone a website from URL                                 |


> **Compatibility note**: if you previously used `/plan`, use `/omr-blueprint --quick` for the same lightweight planning intent.

## Roles

OMR ships 20 role prompts that define agent "personalities" — each with a focused identity, constraints, execution loop, and output contract. The prompt pack is useful depth, but it is not the core product story.

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


### Using roles with `/omr-team`

```text
/omr-team "implement the three API endpoints" (assigns executor roles by default)
/omr-team "audit the payment module" (auto-routes to security-reviewer)
```

Each role prompt is a markdown file with `<identity>`, `<constraints>`, `<execution_loop>`, and `<output_contract>` sections. The `/omr-team` skill reads the prompt, appends the shared [`_team-protocol.md`](prompts/_team-protocol.md) partial (so the lane posts claim / progress / handoff / release events to the blackboard), and includes it in the lane brief.

### Team chatter in the chat session

When `/omr-team` dispatches multiple lanes, the leader echoes every new blackboard post back into the main chat composer as two rendered blocks — a compact lane status table and a running chatter log — so a session feels like the oh-my-codex tmux panes even without leaving Cursor:

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
- At the end of the run the leader calls `team_transcript_write` to save the full log to `.omr/state/team/<runId>-transcript.md`.
- For a side-terminal view (closest to tmux panes), run `omr team watch --run <runId>` while the leader runs in chat.

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

OMR includes optional extras for users who want more runtime surface area, but they are intentionally secondary to the core workflow-and-context story.

### Dashboard

```bash
omr dashboard              # Launch at http://localhost:3721
omr dashboard --port 4000  # Custom port
```

The dashboard shows:

- **Pipeline tracker** — which workflow stage is active (Interview → Blueprint → Execute → Done)
- **Active modes** — phase, iteration, and progress for each running mode
- **Plans** — list of PRDs and test specs
- **Project memory** — cross-session key-value pairs
- **Notepad** — scratch notes

State updates are pushed via SSE — no manual refresh needed.

You can also invoke `/omr-dashboard` inside Cursor to render the dashboard as an inline Canvas.

## CLI reference

```bash
omr setup [--scope user|project] [--force]    # Install workflows and durable context conventions
omr doctor [--scope user|project] [--verbose] # Verify installation health
omr status                                    # Show active mode and durable context state
omr skills                                    # List core workflows and optional extras
omr archive                                   # Archive session → .omr/archive/
omr archives                                  # List archived sessions

# Optional extras
omr schedule list [--scope user|project]      # Show scheduled tasks
omr schedule add-rss --scope user --url <feed>
                                              # Register a user-scoped RSS watcher
omr schedule cancel <id> [--scope user|project]
                                              # Cancel a scheduled task
omr schedule resume [id] [--scope user|project]
                                              # Resume one or all suspended tasks
omr schedule run-now <id> [--scope user|project]
                                              # Request an immediate rerun
omr dashboard [--port <number>]               # Launch live web dashboard
omr team watch [--run <id>] [--no-follow]     # Tail team chatter from the blackboard
omr notify emit --task-id <id> --summary <text> [--scope user|project]
                                              # Emit core desktop + feed notification
omr notify recent [--limit N] [--scope user|project]
                                              # Show recent core notifications
omr notify test-desktop [message]              # Desktop notification smoke test
omr notify slack [message]                     # Test Slack webhook (forge-related URL)
omr notify forge                              # Push forge-state snapshot to Slack
omr help                                      # Show help
omr version                                   # Print version
```

Run `omr help` for the full command list and notify options.

### Notifications (optional)

OMR can post to a [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks) when **forge** workflow state is saved through the OMR state API (including MCP `state_write` for mode `forge`). Configure `OMR_SLACK_WEBHOOK_URL`, `OMR_FORGE_SLACK_WEBHOOK_URL`, or `notifications.slack_webhook_url` in `.omr/omr-config.json`.

**Other modes** (`deep-interview`, `blueprint`, `team`, etc.) **do not** trigger that automatic webhook. To send a manual message or a snapshot of current forge state, use `omr notify slack` or `omr notify forge`. See `skills/omr-forge/SKILL.md` for details.

OMR also supports a built-in notification feed for non-Slack workflows such as
scheduled checks. Use `omr notify emit` to create a durable dashboard entry and,
by default, a macOS desktop notification at the same time.

For user-scoped scheduled tasks, pass `--scope user` so the durable
notification log lives under the same user-scoped OMR runtime root as the task
state.

### Schedule lifecycle helpers

OMR keeps scheduling generic. Use `omr schedule list`, `cancel`, `resume`, and
`run-now` to inspect or adjust scheduled task state. The primary user workflow
still lives in `/omr-schedule`, while the CLI stays a thin lifecycle surface.

For global, cross-project tasks, use `--scope user`. User-scoped schedule state
and resume markers live under `~/.cursor/omr/`, while project-scoped runtime
state continues to live under the current repo's `.omr/`.

The built-in RSS watcher is intentionally thin:

```bash
omr schedule add-rss --scope user \
  --url https://duanyytop.github.io/agents-radar/feed.xml \
  --every 15m \
  --title "Agents Radar RSS"
```

This registers the task, requests an immediate baseline run, and lets the
schedule worker continue polling while the current OMR session remains active.

Downstream products that previously depended on monitor-specific OMR commands
should migrate to generic schedule state plus `omr notify emit`. Any
domain-specific monitor UI belongs downstream, not in OMR core.

## State management

All runtime state lives under `.omr/` in the project root:

```
.omr/
├── state/           # Mode state files (forge, team, etc.)
├── plans/           # PRDs and test specs from planning
├── logs/            # Session logs
├── notepad.md       # Scratch notes
└── project-memory.json  # Cross-session memory
```

## Persistence helpers

### MCP servers

OMR registers two MCP servers in Cursor:

- **omr-state** — read/write `.omr/` state, plans, and notepad
- **omr-memory** — cross-session project memory (key-value store)

These are implementation helpers for persistence. They are useful, but they are not the main reason to adopt OMR.

### Hooks

OMR registers Cursor lifecycle hooks for automatic state management:


| Hook                | Event          | Purpose                                             |
| ------------------- | -------------- | --------------------------------------------------- |
| `session-start.mjs` | `sessionStart` | Ensures `.omr/` dirs exist, creates/updates session |
| `session-end.mjs`   | `stop`         | Archives completed runs, marks session ended        |


Hooks are installed to `~/.cursor/hooks/omr/` (user scope) or `.cursor/hooks/omr/` (project scope) and registered in `hooks.json`. They run automatically on agent lifecycle events — no manual invocation needed.

## Compared to oh-my-codex

OMR is inspired by [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) and shares the same workflow philosophy. Key differences:


|               | oh-my-codex                  | oh-my-cursor                                         |
| ------------- | ---------------------------- | ---------------------------------------------------- |
| Target        | Codex CLI                    | Cursor IDE                                           |
| Orchestration | `AGENTS.md` (monolithic)     | `.cursor/rules/*.mdc` (modular)                      |
| Team mode     | tmux sessions                | Agents Window + Task tool (role-based decomposition) |
| Skills format | `.codex/skills/`             | `.cursor/skills/` (native)                           |
| Role prompts  | 33 TOML-generated prompts    | 20 markdown prompts with XML sections                |
| State         | `.omx/`                      | `.omr/`                                              |
| Install       | `npm install -g oh-my-codex` | `npm install -g oh-my-cursor`                        |


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and how to add skills, roles, or CLI commands.

## License

[MIT](LICENSE)
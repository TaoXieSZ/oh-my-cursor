# oh-my-cursor (OMC)

> Start Cursor stronger, then let OMC add better workflows, skills, and runtime state when the work grows.

[![CI](https://github.com/TaoXieSZ/oh-my-cursor/actions/workflows/ci.yml/badge.svg)](https://github.com/TaoXieSZ/oh-my-cursor/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/oh-my-cursor)](https://www.npmjs.com/package/oh-my-cursor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

OMC is a workflow layer for [Cursor IDE](https://cursor.sh).

It keeps Cursor as the execution engine and makes it easier to:

- start a stronger Cursor session by default
- run one consistent workflow from clarification to completion
- invoke canonical skills with `$deep-interview`, `$blueprint`, `$forge`, and `$team`
- keep project state, plans, logs, and memory in `.omc/`

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

## Recommended workflow

1. **`/deep-interview`** — clarify scope when the request or boundaries are vague
2. **`/blueprint`** — approve the implementation plan and review tradeoffs
3. **`/forge`** or **`/team`** — execute with a persistent loop or parallel coordination

```text
/deep-interview "clarify the authentication change"
/blueprint "approve the safest implementation path"
/forge "carry the approved plan to completion"
/team 3:executor "execute the approved plan in parallel"
```

Use `/team` when the plan has independent parallel lanes. Use `/forge` when one owner should push to completion.

> **Tip**: type `/skills` in Cursor chat to see all available skills. Both `/name` and `$name` work — they are equivalent.

## What OMC installs

| Component | Location | Purpose |
|-----------|----------|---------|
| Rules | `~/.cursor/rules/omc-*.mdc` | Orchestration contract, workflow, state management |
| Skills | `~/.cursor/skills/omc-*/` | Workflow skills (deep-interview, blueprint, forge, team, ...) |
| Prompts | `~/.cursor/omc-prompts/*.md` | Role prompts for agent personalities |
| MCP servers | Cursor MCP config | State and memory management tools |
| State | `.omc/` (project root) | Plans, logs, session state, project memory |

### Scopes

- **User scope** (default): installs to `~/.cursor/` — available in all projects
- **Project scope**: installs to `.cursor/` in the project — scoped to one project

```bash
omc setup --scope project
```

## A simple mental model

OMC does **not** replace Cursor.

It adds a better working layer around it:
- **Cursor** does the actual AI agent work
- **OMC rules** make the agent follow a consistent workflow
- **OMC skills** make common workflows reusable
- **`.omc/`** stores plans, logs, memory, and runtime state

Think of OMC as **better task routing + better workflow + durable state**, not as a command surface to operate manually.

## Skills reference

Type `/skills` in Cursor chat or run `omc skills` in the terminal to see all installed skills.

### Core workflow

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/deep-interview` | "clarify", "don't assume" | Socratic interview to clarify scope |
| `/blueprint` | "plan this", "blueprint" | Consensus planning with tradeoff review |
| `/forge` | "keep going", "don't stop" | Persistent completion loop |
| `/team` | "team", "parallel" | Multi-agent parallel coordination |

### Advanced

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `$autopilot` | "build me", "autopilot" | Full lifecycle: idea → spec → plan → build → QA → validate |
| `$web-clone` | "clone site", "web-clone" | Clone a website from URL with visual/functional verification |

### Observability

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `$dashboard` | "dashboard", "show status" | Live workflow dashboard (Canvas or web server) |

### Supporting

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `$analyze` | "analyze", "investigate" | Deep investigation and root cause analysis |
| `$plan` | "plan this" (small tasks) | Lightweight planning |
| `$tdd` | "tdd", "test first" | Test-driven development cycle |
| `$code-review` | "review code" | Structured code review |
| `$cancel` | "cancel", "stop" | Clean cancellation of active modes |
| `$ecomode` | "eco", "budget" | Token-efficient mode |

## Roles

OMC ships 10 role prompts that define agent "personalities" — each with a focused identity, constraints, execution loop, and output contract. Roles are used by `$team` when dispatching workers and can be referenced in any skill.

### Core roles

| Role | Posture | Purpose |
|------|---------|---------|
| `executor` | deep-worker | Implementation: explore, implement, verify, finish |
| `architect` | read-only | Analysis: diagnose, recommend with file:line evidence |
| `debugger` | deep-worker | Root cause: multi-hypothesis approach, no fix without cause |
| `verifier` | read-only | Completion check: PASS/FAIL/PARTIAL with evidence |
| `explorer` | fast-lane | Codebase search: find files, map structure, answer questions |
| `planner` | read-only | Plan creation: architecture, sequencing, tradeoffs |

### Specialist roles

| Role | Posture | Purpose |
|------|---------|---------|
| `code-reviewer` | read-only | Diff review: correctness, safety, style |
| `test-engineer` | deep-worker | Test writing: coverage analysis, test-first approach |
| `writer` | deep-worker | Documentation and prose |
| `security-reviewer` | read-only | Security audit: OWASP, auth, secrets |

### Using roles with `$team`

```text
$team 3:executor "implement the three API endpoints"
$team 2:test-engineer "write tests for auth and billing"
$team 1:security-reviewer "audit the payment module"
```

Each role prompt is a markdown file with `<identity>`, `<constraints>`, `<execution_loop>`, and `<output_contract>` sections. The `$team` skill reads the prompt and injects it into the Task tool invocation, giving each worker a distinct behavioral profile.

### Role routing

When no role is specified, keywords in the task description route to the appropriate role:

| Keywords | Role |
|----------|------|
| "implement", "build", "create" | `executor` |
| "analyze", "diagnose" | `architect` |
| "debug", "fix bug", "root cause" | `debugger` |
| "verify", "check", "validate" | `verifier` |
| "explore", "find", "search" | `explorer` |
| "plan", "design" | `planner` |
| "review", "code review" | `code-reviewer` |
| "test", "write tests" | `test-engineer` |
| "document", "readme" | `writer` |
| "security", "audit" | `security-reviewer` |

## Dashboard

OMC includes a live web dashboard that visualizes your workflow state in real time.

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

You can also invoke `$dashboard` inside Cursor to render the dashboard as an inline Canvas.

## CLI reference

```bash
omc setup [--scope user|project] [--force]    # Install rules, skills, MCP
omc doctor [--scope user|project] [--verbose] # Verify installation
omc status                                    # Show active mode and state
omc skills                                    # List all installed skills
omc dashboard [--port <number>]               # Launch live web dashboard
omc archive                                   # Archive session → .omc/archive/
omc archives                                  # List archived sessions
omc notify slack [message]                  # Test Slack webhook (forge-related URL)
omc notify forge                              # Push forge-state snapshot to Slack
omc help                                      # Show help
omc version                                   # Print version
```

Run `omc help` for the full command list and notify options.

### Slack notifications (optional)

OMC can post to a [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks) when **forge** workflow state is saved through the OMC state API (including MCP `state_write` for mode `forge`). Configure `OMC_SLACK_WEBHOOK_URL`, `OMC_FORGE_SLACK_WEBHOOK_URL`, or `notifications.slack_webhook_url` in `.omc/omc-config.json`.

**Other modes** (`deep-interview`, `blueprint`, `team`, etc.) **do not** trigger that automatic webhook. To send a manual message or a snapshot of current forge state, use `omc notify slack` or `omc notify forge`. See `skills/omc-forge/SKILL.md` for details.

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

## MCP servers

OMC registers two MCP servers in Cursor:

- **omc-state** — read/write `.omc/` state, plans, and notepad
- **omc-memory** — cross-session project memory (key-value store)

These allow skills to persist state across conversations without filesystem hacks in prompts.

## Compared to oh-my-codex

OMC is inspired by [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) and shares the same workflow philosophy. Key differences:

| | oh-my-codex | oh-my-cursor |
|---|---|---|
| Target | Codex CLI | Cursor IDE |
| Orchestration | `AGENTS.md` (monolithic) | `.cursor/rules/*.mdc` (modular) |
| Team mode | tmux sessions | Cursor Task tool (subagents) |
| Skills format | `.codex/skills/` | `.cursor/skills/` (native) |
| Role prompts | 33 TOML-generated prompts | 10 markdown prompts with XML sections |
| State | `.omx/` | `.omc/` |
| Install | `npm install -g oh-my-codex` | `npm install -g oh-my-cursor` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and how to add skills, roles, or CLI commands.

## License

[MIT](LICENSE)

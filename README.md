# oh-my-cursor (OMC)

> Start Cursor stronger, then let OMC add better workflows, skills, and runtime state when the work grows.

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

1. **`$deep-interview`** — clarify scope when the request or boundaries are vague
2. **`$blueprint`** — approve the implementation plan and review tradeoffs
3. **`$forge`** or **`$team`** — execute with a persistent loop or parallel coordination

```text
$deep-interview "clarify the authentication change"
$blueprint "approve the safest implementation path"
$forge "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Use `$team` when the plan has independent parallel lanes. Use `$forge` when one owner should push to completion.

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

### Core workflow

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `$deep-interview` | "clarify", "don't assume" | Socratic interview to clarify scope |
| `$blueprint` | "plan this", "blueprint" | Consensus planning with tradeoff review |
| `$forge` | "keep going", "don't stop" | Persistent completion loop |
| `$team` | "team", "parallel" | Multi-agent parallel coordination |

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

## CLI reference

```bash
omc setup [--scope user|project] [--force]   # Install rules, skills, MCP
omc doctor [--scope user|project] [--verbose] # Verify installation
omc status                                    # Show active mode and state
omc help                                      # Show help
omc version                                   # Print version
```

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

## License

MIT

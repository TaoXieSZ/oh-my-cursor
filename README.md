# oh-my-cursor (OMC)

> Cursor 3 gives you a powerful engine. OMC gives you a better way to drive it.

[CI](https://github.com/TaoXieSZ/oh-my-cursor/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/oh-my-cursor)
[License: MIT](https://opensource.org/licenses/MIT)
[Node.js](https://nodejs.org)

OMC is a workflow layer for [Cursor IDE](https://cursor.sh).

Cursor 3 introduced the Agents Window, `/worktree`, `/best-of-n`, and native Plan Mode — great low-level primitives. OMC builds on top of these to provide:

- **A structured workflow pipeline**: clarify → plan → execute → verify
- **Durable project state**: plans, logs, cross-session memory in `.omc/`
- **20 role prompts**: specialized agent personalities for different task types
- **Keyword-driven skill routing**: say "don't assume" and the right workflow activates

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

1. `**/omc-deep-interview**` — clarify scope when the request or boundaries are vague
2. `**/omc-blueprint**` — approve the implementation plan and review tradeoffs
3. `**/omc-forge**` — execute with a persistent verify-fix loop until done

```text
/omc-deep-interview "clarify the authentication change"
/omc-blueprint "approve the safest implementation path"
/omc-forge "carry the approved plan to completion"
```

For tasks with independent parallel lanes, use `/omc-team` to decompose work and assign roles, then execute via Cursor's Agents Window.

> **Tip**: type `/skills` in Cursor chat to see all available skills. In Cursor's slash picker, you'll typically see `/omc-`* command names.

## When to use which slash command

Use this as a quick decision guide before you invoke a workflow:


| Command               | Use when                                                    | Avoid when                                       |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `/omc-deep-interview` | Requirement is vague, user says "don't assume"              | Task is already fully scoped                     |
| `/omc-blueprint`      | Need a reviewed plan before coding                          | One-file trivial changes                         |
| `/omc-forge`          | Plan is approved and one owner should push to done          | Work splits cleanly into independent lanes       |
| `/omc-team`           | Task has parallel lanes and clear file ownership boundaries | Changes are tightly coupled                      |
| `/omc-analyze`        | Need root-cause analysis or architecture mapping            | You already know exactly what to implement       |
| `/omc-tdd`            | You want test-first implementation and regression safety    | Throwaway prototypes                             |
| `/omc-code-review`    | You want a structured pre-merge review                      | No code changes yet                              |
| `/omc-dashboard`      | You want runtime visibility into active modes/state         | You only need a one-off status check             |
| `/omc-cancel`         | You need to stop active OMC modes cleanly                   | You still expect the current loop to continue    |
| `/omc-ecomode`        | You need lower token/tool usage                             | You need maximal depth and verbosity             |
| `/omc-autopilot`      | You want end-to-end execution from idea to validation       | You want tight manual control at each step       |
| `/omc-web-clone`      | You need to recreate a site from URL                        | You only need small UI tweaks in an existing app |


### Copy-paste examples

```text
# 1) Requirement is unclear
/omc-deep-interview "we need to improve onboarding, clarify scope and acceptance criteria first"

# 2) Medium task, want lightweight planning
/omc-blueprint --quick "add API pagination for /users and /orders with backward compatibility"

# 3) Complex task, need full planning + risks
/omc-blueprint "design a safe migration from local cache to redis with rollback plan"

# 4) Approved plan, single-owner execution
/omc-forge "execute the approved redis migration plan to completion with full verification"

# 5) Parallelizable feature
/omc-team "split auth revamp into backend, frontend, and tests with clear file ownership"

# 6) Bug/incident investigation
/omc-analyze "investigate why webhook retries spike after deploy and identify root cause"

# 7) Test-first delivery
/omc-tdd "add rate limiting middleware for login endpoint using test-first workflow"

# 8) Pre-merge safety check
/omc-code-review "review current diff for correctness, regressions, and missing tests"

# 9) Observe workflow state
/omc-dashboard "show active modes and plan/test artifact status"

# 10) Abort active workflow
/omc-cancel "cancel current forge run and mark state as cancelled"

# 11) Budget mode
/omc-ecomode "enable token-efficient mode for this debugging session"

# 12) Full automatic pipeline
/omc-autopilot "build a minimal internal changelog viewer from markdown files"
```

## What OMC installs


| Component   | Location                     | Purpose                                                       |
| ----------- | ---------------------------- | ------------------------------------------------------------- |
| Rules       | `~/.cursor/rules/omc-*.mdc`  | Orchestration contract, workflow, state management            |
| Skills      | `~/.cursor/skills/omc-*/`    | Workflow skills (deep-interview, blueprint, forge, team, ...) |
| Prompts     | `~/.cursor/omc-prompts/*.md` | Role prompts for agent personalities                          |
| MCP servers | Cursor MCP config            | State and memory management tools                             |
| Hooks       | `~/.cursor/hooks/omc/`       | Lifecycle automation (session init, auto-archive)             |
| State       | `.omc/` (project root)       | Plans, logs, session state, project memory                    |


### Scopes

- **User scope** (default): installs to `~/.cursor/` — available in all projects
- **Project scope**: installs to `.cursor/` in the project — scoped to one project

```bash
omc setup --scope project
```

## How OMC relates to Cursor 3

OMC does **not** replace Cursor — it adds a structured workflow layer around it.


| Concern         | Cursor 3 native                 | OMC adds                                                                    |
| --------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Parallel agents | Agents Window                   | Work decomposition, role assignment, file ownership                         |
| Planning        | Plan Mode (`Shift+Tab`)         | Structured deliberation with PRD artifacts, tradeoff review, approval gates |
| Persistence     | Session handoff (local ↔ cloud) | Cross-session project memory, PRDs, test specs, archived sessions           |
| Completion      | Single agent chat               | `/omc-forge` — persistent verify-fix loop that doesn't stop until done      |
| Clarification   | Ad hoc                          | `/omc-deep-interview` — Socratic interview with ambiguity scoring           |
| Roles           | Generic agents                  | 20 specialized role prompts with identity, constraints, execution loop      |


Think of OMC as **better task routing + better workflow + durable state**, not as a command surface to operate manually.

## Skills reference

Type `/skills` in Cursor chat or run `omc skills` in the terminal to see all installed skills.

### Core workflow


| Skill                 | Trigger                    | Purpose                                                                |
| --------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `/omc-deep-interview` | "clarify", "don't assume"  | Socratic interview to clarify scope                                    |
| `/omc-blueprint`      | "plan this", "blueprint"   | Structured planning with tradeoff review (`--quick` for lighter tasks) |
| `/omc-forge`          | "keep going", "don't stop" | Persistent completion loop                                             |
| `/omc-team`           | "team", "parallel"         | Work decomposition and role assignment for parallel execution          |


### Advanced


| Skill            | Trigger                   | Purpose                                                      |
| ---------------- | ------------------------- | ------------------------------------------------------------ |
| `/omc-autopilot` | "build me", "autopilot"   | Full lifecycle: idea → spec → plan → build → QA → validate   |
| `/omc-web-clone` | "clone site", "web-clone" | Clone a website from URL with visual/functional verification |


### Observability


| Skill            | Trigger                    | Purpose                                        |
| ---------------- | -------------------------- | ---------------------------------------------- |
| `/omc-dashboard` | "dashboard", "show status" | Live workflow dashboard (Canvas or web server) |


### Supporting


| Skill              | Trigger                  | Purpose                                    |
| ------------------ | ------------------------ | ------------------------------------------ |
| `/omc-analyze`     | "analyze", "investigate" | Deep investigation and root cause analysis |
| `/omc-tdd`         | "tdd", "test first"      | Test-driven development cycle              |
| `/omc-code-review` | "review code"            | Structured code review                     |
| `/omc-cancel`      | "cancel", "stop"         | Clean cancellation of active modes         |
| `/omc-ecomode`     | "eco", "budget"          | Token-efficient mode                       |


> **Compatibility note**: if you previously used `/plan`, use `/omc-blueprint --quick` for the same lightweight planning intent.

## Roles

OMC ships 20 role prompts that define agent "personalities" — each with a focused identity, constraints, execution loop, and output contract. Roles are used by `$team` when decomposing work and can be referenced in any skill.

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

Each role prompt is a markdown file with `<identity>`, `<constraints>`, `<execution_loop>`, and `<output_contract>` sections. The `/omc-team` skill reads the prompt and includes it in the lane brief.

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

You can also invoke `/omc-dashboard` inside Cursor to render the dashboard as an inline Canvas.

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

## Hooks

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
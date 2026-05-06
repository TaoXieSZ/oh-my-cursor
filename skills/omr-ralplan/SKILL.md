---
name: omr-ralplan
description: Consensus planning that runs Planner → Architect → Critic until the plan is approved. Includes a vague-execution gate that intercepts under-specified $forge / $team / $autopilot requests and redirects them through planning first.
argument-hint: "[--interactive] [--deliberate] <task to plan>"
---

# Ralplan — Consensus Planning Loop

Ralplan is a heavier sibling of `$blueprint`. Where blueprint produces a single PRD from one planner pass, ralplan iterates a **Planner → Architect → Critic** loop until the critic approves, optionally with explicit user gates and deliberate-mode pre-mortem.

It also acts as the **vague-execution gate**: when a user types `$forge fix this` or `$team improve performance` without concrete anchors, ralplan intercepts and redirects them through planning first.

## When to use

- Multiple valid approaches exist with real tradeoffs (auth strategy, migration path, caching layer).
- The plan touches multiple subsystems and one planner pass is not enough.
- High-risk work: migrations, auth/security, destructive changes, public API breakage, production incidents, compliance/PII.
- A `$forge` / `$team` / `$autopilot` request is too vague to execute safely (the gate auto-redirects here).

## When NOT to use

- The path is obvious — use `$blueprint --quick` or just execute directly.
- Requirements themselves are unclear — use `$deep-interview` first, then come back here.
- A plan already exists and was approved — go to `$forge` or `$team`.

## Difference from `$blueprint`

| | `$blueprint` | `$ralplan` |
|---|---|---|
| Loop | Single planner pass | Planner → Architect → Critic, iterate until APPROVE |
| Tradeoff coverage | Tradeoff table | Steelman antithesis + tension + synthesis |
| Risk gate | Risk assessment | Pre-mortem (deliberate mode) + expanded test plan |
| Output | PRD + test spec | PRD + test spec + ADR + staffing roster |
| When | Most planning tasks | High-risk or multi-approach planning |

## Flags

- `--interactive`: surface user gates at draft-review (step 2) and final approval (step 6) using AskQuestion. Without this flag, the loop runs fully automated and emits the final approved plan.
- `--deliberate`: force deliberate mode (pre-mortem with 3 failure scenarios + expanded test plan covering unit / integration / e2e / observability). Auto-enables when the request mentions auth, security, migration, destructive change, production, compliance, PII, or public API breakage.

## Vague Execution Gate

Ralplan auto-triggers when a user invokes an execution skill on an under-specified prompt.

### When the gate fires

The gate fires when ALL of:
- The user message contains an execution keyword: `forge`, `team`, `autopilot`, `parallel`, `keep going`, `must complete`, `build me`.
- The effective prompt has fewer than 15 words (after stripping the keyword).
- No concrete anchor is present.

### Concrete anchors that bypass the gate

Any one of these is enough to bypass:

| Signal | Example | Why it passes |
|---|---|---|
| File path | `forge fix src/auth/jwt.ts` | Names a specific file |
| Issue/PR number | `forge implement #42` | Concrete work item |
| camelCase symbol | `team fix processWebhook` | Names a function |
| PascalCase symbol | `forge update UserModel` | Names a class |
| snake_case symbol | `team fix user_model` | Names an identifier |
| Test target | `forge npm test && fix failures` | Explicit verification target |
| Numbered steps | `forge do:\n1. Add X\n2. Test Y` | Structured deliverables |
| Acceptance criteria | `forge add login - acceptance: ...` | Explicit success definition |
| Error reference | `forge fix TypeError in auth` | Specific error to address |
| Code block | ` ```ts ... ``` ` in prompt | Concrete code provided |
| Escape prefix | `force: forge do it` or `! forge do it` | Explicit override |

### Examples

**Gated** (redirected to ralplan):
- `forge fix this`
- `team improve performance`
- `autopilot build the app`
- `forge add authentication`

**Passes** (execute directly):
- `forge fix the null check in src/hooks/bridge.ts:326`
- `team add validation to processKeywordDetector`
- `autopilot implement issue #42`

When the gate fires, tell the user briefly:

> Your request is vague enough that direct execution would waste cycles on scope discovery. Routing through ralplan first to lock scope and acceptance criteria. Reply with `force:` prefix to bypass.

## Execution Protocol

### Phase 1 — Pre-context Intake

Before the loop starts, ground the work in context:

1. Derive a task slug from the request (kebab-case, ~3-6 words).
2. Reuse the latest snapshot under `.omr/context/{slug}-*.md` if one exists.
3. Otherwise create `.omr/context/{slug}-{YYYYMMDDTHHMMSSZ}.md` with:
   - Task statement
   - Desired outcome
   - Known facts / evidence
   - Constraints
   - Unknowns / open questions
   - Likely codebase touchpoints
4. If ambiguity is still high, run `$deep-interview --quick` first.
5. If the plan depends on official docs / framework versions / external dependency behavior, dispatch a `researcher` lane before finalizing the plan.

Do not enter the loop until intake is complete.

### Phase 2 — Planner pass

The planner produces an adaptive plan (size to scope, do not default to exactly N steps) and a compact **RALPLAN-DR summary**:

```markdown
## RALPLAN-DR Summary

### Principles (3-5)
- ...

### Decision Drivers (top 3)
- ...

### Viable Options (≥2)
| Option | Pros | Cons |
|---|---|---|
| A: ... | ... | ... |
| B: ... | ... | ... |

(If only one viable option remains, include explicit invalidation rationale for alternatives.)

### Pre-mortem (deliberate mode only)
Failure scenario 1: ...
Failure scenario 2: ...
Failure scenario 3: ...

### Expanded test plan (deliberate mode only)
- Unit: ...
- Integration: ...
- E2E: ...
- Observability: ...
```

If `--interactive`, present the draft plan + RALPLAN-DR summary using AskQuestion: **Proceed to review** / **Request changes** / **Skip review**. Otherwise auto-proceed.

### Phase 3 — Architect review (READ-ONLY)

Dispatch an `architect` subagent. The architect must:

- Provide the **strongest steelman antithesis** to the recommended approach.
- Surface at least **one real tradeoff tension** the planner under-weighted.
- Where possible, propose a **synthesis** that combines the best of competing options.
- In deliberate mode, explicitly flag any principle violations.

**Wait for architect to complete before invoking critic.** Do NOT batch architect + critic in parallel.

### Phase 4 — Critic review (READ-ONLY)

Dispatch a `critic` subagent. The critic enforces:

- **Principle-option consistency**: do the chosen options follow the stated principles?
- **Fair alternatives**: were rejected options dismissed honestly?
- **Risk mitigation clarity**: are risks named with concrete mitigations?
- **Testable acceptance criteria**: can a verifier check each item?
- **Concrete verification steps**: is "done" defined operationally?
- In deliberate mode: reject the plan if pre-mortem or expanded test plan is missing or weak.

Critic returns one of: `APPROVE` / `ITERATE` / `REJECT` with reasons.

### Phase 5 — Re-review loop (max 5 iterations)

If critic returns anything other than `APPROVE`:

a. Collect architect + critic feedback.
b. Revise plan with planner.
c. Return to Phase 3 (architect).
d. Return to Phase 4 (critic).
e. Repeat until `APPROVE` or 5 iterations reached.
f. If 5 iterations exhausted without `APPROVE`, present the best version with a note about unresolved critic concerns.

### Phase 6 — Approval gate (`--interactive` only)

Use AskQuestion to present the approved plan:

- **Approve and execute via `$forge`** (single owner)
- **Approve and execute via `$team`** (parallel lanes)
- **Request changes** (back to Phase 2)
- **Reject** (cancel)

Without `--interactive`, output the final plan and stop.

### Phase 7 — Persist artifacts

On approval, write to `.omr/plans/`:

- `prd-{task-slug}.md` — the approved PRD with full RALPLAN-DR summary, ADR section, staffing roster, and verification path.
- `test-spec-{task-slug}.md` — the approved test specification.

The PRD must include an **ADR block**:

```markdown
## ADR

- **Decision**: [what was chosen]
- **Drivers**: [top 3 decision drivers]
- **Alternatives considered**: [list with one-line invalidation rationale]
- **Why chosen**: [grounded reasoning]
- **Consequences**: [what becomes easier / harder]
- **Follow-ups**: [deferred items, future revisits]
```

And a **staffing roster** suggesting which roles each lane should use:

```markdown
## Staffing roster

| Lane | Role | Reasoning level | Verification path |
|---|---|---|---|
| Backend changes | executor | standard | Unit + integration tests |
| Frontend changes | designer + executor | standard | Visual review + tests |
| Security hardening | security-reviewer | high | OWASP audit |
```

### Phase 8 — Hand-off

Hand off to the chosen execution mode (`$forge` or `$team`). Never implement directly from ralplan.

## State Management

Use `omr-state` MCP to track ralplan state:

- **On start**: `state_write({ mode: "ralplan", active: true, started_at: "<now>", phase: "intake" })`
- **On phase change**: `state_write({ mode: "ralplan", phase: "planner|architect|critic|re-review|approval|persisted" })`
- **On iteration**: `state_write({ mode: "ralplan", iteration: <n> })`
- **On completion**: `state_write({ mode: "ralplan", active: false, completed_at: "<now>", plan_file: "prd-<slug>.md" })`
- **On cancel**: run `$cancel`.

## Sequential Execution Rule

> **Important**: Architect (Phase 3) and Critic (Phase 4) must run **sequentially**. Do NOT batch their tool calls in the same parallel group. The critic must see the architect's antithesis before reviewing.

## Anti-patterns

- Do NOT skip Phase 3 to "save time" — the architect's antithesis is the whole point.
- Do NOT accept the first planner draft without critic review — that's just `$blueprint`.
- Do NOT loop more than 5 times — present the best version and stop.
- Do NOT implement in this skill — ralplan produces plans, not code.
- Do NOT bypass the vague-execution gate silently — tell the user it fired and how to override.
- Do NOT spawn nested ralplan from inside another OMR workflow (recursion guard) — record the finding and attach it to the active plan instead.

## Scenario examples

**Good**: User says `forge add caching layer`. Gate fires (vague). Ralplan runs, planner proposes 3 options (Redis / in-memory / file-based), architect surfaces tradeoff between latency and operational complexity, critic flags missing eviction strategy, second pass adds it, approve, hand off to `$forge` with concrete PRD.

**Good**: User says `ralplan migrate from MySQL to Postgres`. Deliberate mode auto-enables (migration keyword). Pre-mortem covers data loss, downtime, and rollback. Expanded test plan covers unit + integration + e2e + observability. Plan approved on second iteration.

**Bad**: Planner produces a plan, you immediately tell the user "approved" without running architect or critic. That's blueprint, not ralplan.

**Bad**: Architect and critic invoked in the same parallel batch. Critic sees no antithesis to evaluate against.

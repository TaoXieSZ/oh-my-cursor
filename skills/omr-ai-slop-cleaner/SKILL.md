---
name: omr-ai-slop-cleaner
description: Disciplined cleanup workflow for AI-generated slop — duplicate code, dead code, fallback masking, needless abstraction, weak boundaries. Locks behavior with regression tests first, then applies one smell-pass at a time. Wraps the code-simplifier role with a structured procedure.
argument-hint: "[--scope <files-or-area>] <cleanup target>"
---

# AI Slop Cleaner — Regression-Safe Anti-Slop Workflow

A disciplined cleanup workflow for AI-generated code that "works but feels off" — bloated, repetitive, over-abstracted, or full of fallback paths that hide failures. Distinct from a quick refactor: this skill enforces a **regression-tests-first** behavior lock, a **fallback inventory**, and **one smell pass at a time** with verification between passes.

Think of it as `code-simplifier` with rails: you can't accidentally rewrite architecture or lose behavior on the way to "cleaner".

## When to use

- Code path works but feels bloated, noisy, repetitive, or over-abstracted.
- User asks to "cleanup", "refactor", "deslop", or "simplify this AI-generated code".
- An autopilot / forge / agent-window run left duplicate code, dead code, weak boundaries, missing tests, fallback-like code, or unnecessary wrapper layers.
- You need a disciplined cleanup workflow without broad rewrites.

## When NOT to use

- The code is broken — fix the bug first using `$debugger` or `$forge`, then come back.
- A wholesale architectural rewrite is needed — propose a new design via `$blueprint` or `$ralplan`.
- The cleanup target is unknown or huge — narrow scope first using `$analyze`.
- Behavior is intentionally weird and the user wants it that way — don't "cleanup" intentional design.

## Scoped cleanup (recommended)

Whenever possible, run with an explicit file or directory scope:

```
$ai-slop-cleaner --scope src/auth/ "deslop the auth module"
$ai-slop-cleaner --scope "src/api/users.ts,src/api/orders.ts" "remove duplication"
```

When invoked from inside `$forge` after a verify-fix loop, this skill should run on the **forge-owned changed files only**, in standard mode unless the caller explicitly requests broader scope.

## Procedure

### Step 1 — Lock behavior with regression tests first

Before editing any cleanup candidate:

- Identify the behavior that must not change.
- Run existing tests covering the cleanup scope; record which pass.
- If behavior is **untested**, write the narrowest tests needed to lock current behavior **before** any cleanup edit.
- For fallback-like code, cover both the **primary path** and any preserved compatibility/fail-safe path.

If you can't lock behavior with tests, escalate — don't proceed.

### Step 2 — Create a cleanup plan before code

Output an explicit plan listing:

- The smells you intend to remove (categorized — see Step 4).
- The files in scope.
- Order: safest / highest-signal first, riskiest last.
- Fallback findings (from Step 3) and how each is classified.

Do not start editing until the plan is written down.

### Step 3 — Inventory fallback-like code

Scan the cleanup scope for fallback-like signals:

- "Quick hack" / "temporary workaround" / "temporary fallback" / "just bypass" / "just skip"
- "Fallback if it fails"
- Swallowed errors (caught and ignored)
- Silent defaults
- Broad compatibility shims
- Duplicate alternate execution paths

Classify each finding:

| Classification | Definition | Action |
|---|---|---|
| **Masking fallback slop** | Hides errors, suppresses tests, silently defaults, swallows failures, adds untested alternate paths | Remove and repair the root cause, OR make failure explicit |
| **Grounded compatibility/fail-safe fallback** | Scoped to an external/version/fail-safe boundary, documented rationale, preserves failure evidence, has tests for both primary and fallback | Keep, document, ensure tests exist |

For broad / ambiguous / cross-layer / architectural fallback-like code, **invoke `$ralplan` for consensus resolution before edits**.

> **Recursion guard**: when this skill runs inside `$forge`, `$ralplan`, `$team`, or another OMR workflow, do NOT spawn nested `$ralplan`. Record the finding and attach it to the active plan instead.

### Step 4 — Categorize remaining issues

Group findings by smell type:

| Category | Examples |
|---|---|
| **Fallback-like code** | Masking fallbacks, workaround branches, bypasses, swallowed errors, silent defaults, broad shims |
| **Duplication** | Repeated logic, copy-paste branches, redundant helpers |
| **Dead code** | Unused functions, unreachable branches, stale flags, debug leftovers |
| **Needless abstraction** | Pass-through wrappers, speculative indirection, single-use helper layers |
| **Boundary violations** | Hidden coupling, leaky responsibilities, wrong-layer imports or side effects |
| **Missing tests** | Behavior not locked, weak regression coverage, gaps around edge cases |

### Step 5 — Execute passes ONE smell at a time

Run passes in this order, **re-verifying after each**:

1. **Fallback-like code resolution gate** — remove masking slop, repair root causes, or escalate ambiguous cases. If anything ambiguous remains, stop here and escalate.
2. **Pass 1: Dead code deletion** — remove unused code first (lowest risk, highest signal).
3. **Pass 2: Duplicate removal** — extract or inline duplicates.
4. **Pass 3: Naming + error handling cleanup** — clarify names, surface errors that were silently swallowed.
5. **Pass 4: Test reinforcement** — add tests around edges exposed during cleanup.

**Do not bundle unrelated refactors into the same edit set.** One smell type per commit-equivalent change.

### Step 6 — Run quality gates after EACH pass

Between every pass:

- Regression tests stay green.
- Lint passes.
- Typecheck passes.
- Relevant unit / integration tests pass.
- Static analysis / security scan passes when available.
- Diff stays minimal and scoped to the current pass.
- No new abstractions or dependencies introduced unless explicitly required.

If any gate fails, fix or revert that pass before proceeding to the next.

### Step 7 — Finish with an evidence-dense report

Required output format:

```markdown
## AI SLOP CLEANUP REPORT

**Scope**: [files or feature area]
**Behavior lock**: [tests added / run to lock behavior]
**Cleanup plan**: [bounded smells and order]

### Fallback findings
| Finding | Classification | Action / Escalation |
|---|---|---|
| ... | masking / grounded | repaired / kept / escalated to ralplan |

### Passes completed
- Fallback resolution gate: [status]
1. Dead code deletion: [concise summary]
2. Duplicate removal: [concise summary]
3. Naming + error handling: [concise summary]
4. Test reinforcement: [concise summary]

### Quality gates
- Regression tests: PASS / FAIL
- Lint: PASS / FAIL
- Typecheck: PASS / FAIL
- Tests: PASS / FAIL
- Static / security scan: PASS / FAIL / N/A

### Changed files
- [path] — [simplification]

### Remaining risks
- [none, or short deferred items]
```

## State Management

Use `omr-state` MCP for cleanup state:

- **On start**: `state_write({ mode: "ai-slop-cleaner", active: true, started_at: "<now>", phase: "behavior-lock", scope: <files> })`
- **On phase change**: `state_write({ mode: "ai-slop-cleaner", phase: "behavior-lock|plan|fallback-inventory|pass-1|pass-2|pass-3|pass-4|report" })`
- **On pass completion**: `state_write({ mode: "ai-slop-cleaner", passes_completed: <n> })`
- **On completion**: `state_write({ mode: "ai-slop-cleaner", active: false, completed_at: "<now>" })`
- **On cancel**: run `$cancel`.

## Anti-patterns

- Do NOT start rewriting architecture before protecting behavior with tests.
- Do NOT collapse multiple smell categories into one large refactor with no intermediate verification.
- Do NOT keep a `fallback if it fails` branch that silently defaults after a swallowed error — fix the root cause or make failure explicit.
- Do NOT skip the fallback inventory — masking fallbacks are the most dangerous slop.
- Do NOT spawn nested `$ralplan` when this skill runs inside another OMR workflow.
- Do NOT introduce new abstractions in the name of cleanup — cleanup means *less* code, not differently-shaped code.
- Do NOT claim done without the evidence-dense report.

## Scenario examples

**Good**: User runs `$ai-slop-cleaner --scope src/auth/`. Step 1 adds 3 missing tests for the auth happy path. Step 3 finds a `try { ... } catch { return defaultUser }` that masks DB failures — classified as masking slop, removed and replaced with explicit error propagation. Pass 1 deletes 80 lines of unused helpers. Pass 2 collapses two near-identical token validators. Quality gates pass. Report cites 8 deleted files, 2 simplified, no new dependencies.

**Good**: A version-specific compatibility shim for Node 18 vs 20 is found. Classified as **grounded compatibility/fail-safe** because it's narrow, documented, preserves error evidence, and has tests for both branches. Reported as kept.

**Bad**: Step 1 skipped because "the code is simple enough". Step 2 invents 4 new abstraction layers in the name of "cleanup". Tests fail silently. Report claims success.

**Bad**: Pass 1 deletes dead code, Pass 2 renames functions, Pass 3 changes architecture — all in one edit set with no intermediate verification. Lint failure can't be attributed to a specific pass.

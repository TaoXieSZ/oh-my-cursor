---
name: omr-blueprint
description: Structured planning with deliberation. Produces an approved PRD and test spec before implementation begins. Supports quick mode for simpler tasks.
argument-hint: "[--quick] <task to plan>"
---

# Blueprint — Structured Planning

Structured deliberation that produces an approved plan with architecture, tradeoffs, and test strategy. Distinct from Cursor's built-in Plan Mode: Blueprint produces persistent PRD artifacts, requires explicit approval gates, and includes tradeoff analysis and verification criteria.

## When to use

- Requirements are clear enough but the implementation path needs review.
- Tradeoffs exist between approaches (performance vs simplicity, etc.).
- The task touches multiple files/systems and needs coordination.
- Coming out of `$deep-interview` with a clarified brief.

## When NOT to use

- The task is trivial and the path is obvious (1-2 steps, single file) — just execute directly.
- The user explicitly says "just do it" or "skip planning".
- You're already inside an active `$forge` execution.

## Modes

| Mode | Flag | Use when |
|------|------|----------|
| Quick | `--quick` | 3-8 step tasks touching 2-5 files, path mostly clear |
| Standard | (default) | Complex tasks, multiple approaches, multi-system |

## Execution protocol

### Phase 1: Analyze

1. Read the task description (or clarified brief from `$deep-interview` at `.omr/plans/interview-brief-*.md`).
2. Explore the relevant codebase areas to understand current state.
3. Identify: affected files, dependencies, risks, test surface.
4. Check for existing tests that cover the affected code — these must not regress.

### Phase 2: Deliberate

**Standard mode** — present a full structured analysis:

```markdown
## Plan: [task name]

### Approach
[Describe the implementation approach in 3-5 bullets]

### Architecture
[Key components, data flow, interfaces affected]

### Tradeoffs
| Option | Pros | Cons | Risk | Effort |
|--------|------|------|------|--------|
| A: ... | ... | ... | low | 2h |
| B: ... | ... | ... | med | 4h |

**Recommendation**: [which option and why]

### Risk assessment
- [Risk 1]: [likelihood] / [impact] — [mitigation]
- [Risk 2]: [likelihood] / [impact] — [mitigation]

### Test strategy
- **Existing tests to protect**: [tests that must not break]
- **New tests needed**: [what to add]
- **Edge cases**: [specific edge cases to cover]

### Verification criteria
For each implementation item, define how to verify it succeeds:
| Item | Verification | Tier |
|------|-------------|------|
| [Item 1] | [How to verify] | quick / standard / full |
| [Item 2] | [How to verify] | quick / standard / full |

### Implementation sequence
1. [Step 1] — depends on: nothing
2. [Step 2] — depends on: Step 1
...

### Rollback plan
If the change causes issues: [how to safely revert]
```

**Quick mode** (`--quick`) — abbreviated output:

```markdown
## Plan: [task name]

### Steps
1. [Step]
2. [Step]
...

### Key risks
- [Risk if any]

### Verification
- [How to verify the change works]

### Ready to execute?
```

### Phase 3: Approve

Ask the user to approve, modify, or reject the plan using the AskQuestion tool. Do NOT proceed to implementation without explicit approval.

### Phase 4: Persist

On approval, write artifacts to `.omr/plans/`:
- `prd-{task-slug}.md` — the approved plan (includes verification criteria).
- `test-spec-{task-slug}.md` — the approved test specification (standard mode; quick mode may skip for small tasks).

The PRD should be self-contained: a new `$forge` session should be able to execute the plan by reading only this file.

Update `.omr/state/blueprint-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "task": "task description",
  "mode": "standard | quick",
  "phase": "analyze | deliberate | approved",
  "plan_file": "prd-{slug}.md",
  "test_spec_file": "test-spec-{slug}.md",
  "completed_at": "ISO timestamp or null",
  "status": "active | approved | cancelled"
}
```

### Phase 5: Hand off

Suggest `$forge` for single-owner execution. If the plan has independent parallel lanes, mention `$team` for work decomposition.

## Anti-patterns

- Do NOT implement during planning — this skill produces plans, not code.
- Do NOT skip the approval gate.
- Do NOT produce vague plans ("refactor things") — be specific about files and changes.
- Do NOT omit verification criteria — every plan item must have a way to check if it succeeded.
- Do NOT ignore existing tests — identify which tests protect the affected code.

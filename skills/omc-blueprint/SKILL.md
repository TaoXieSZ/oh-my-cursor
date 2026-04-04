---
name: omc-blueprint
description: Consensus planning with structured deliberation. Produces an approved PRD and test spec before implementation begins.
argument-hint: "<task to plan>"
---

# Blueprint — Consensus Planning

Structured deliberation that produces an approved plan with architecture, tradeoffs, and test strategy.

## When to use

- Requirements are clear enough but the implementation path needs review.
- Tradeoffs exist between approaches (performance vs simplicity, etc.).
- The task touches multiple files/systems and needs coordination.
- Coming out of `$deep-interview` with a clarified brief.

## When NOT to use

- The task is trivial and the path is obvious.
- The user explicitly says "just do it" or "skip planning".
- You're already inside an active `$forge` or `$team` execution.

## Execution protocol

### Phase 1: Analyze

1. Read the task description (or clarified brief from `$deep-interview`).
2. Explore the relevant codebase areas to understand current state.
3. Identify: affected files, dependencies, risks, test surface.

### Phase 2: Deliberate

Present a structured analysis:

```markdown
## Plan: [task name]

### Approach
[Describe the implementation approach in 3-5 bullets]

### Architecture
[Key components, data flow, interfaces affected]

### Tradeoffs
| Option | Pros | Cons |
|--------|------|------|
| A: ... | ... | ... |
| B: ... | ... | ... |

**Recommendation**: [which option and why]

### Risk assessment
- [Risk 1]: [mitigation]
- [Risk 2]: [mitigation]

### Test strategy
- [What to test and how]
- [Edge cases to cover]

### Implementation sequence
1. [Step 1]
2. [Step 2]
...
```

### Phase 3: Approve

Ask the user to approve, modify, or reject the plan. Do NOT proceed to implementation without explicit approval.

### Phase 4: Persist

On approval, write artifacts to `.omc/plans/`:
- `prd-{task-slug}.md` — the approved plan.
- `test-spec-{task-slug}.md` — the approved test specification.

Update `.omc/state/blueprint-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "task": "task description",
  "phase": "analyze | deliberate | approved",
  "plan_file": "prd-{slug}.md",
  "test_spec_file": "test-spec-{slug}.md",
  "completed_at": "ISO timestamp or null",
  "status": "active | approved | cancelled"
}
```

### Phase 5: Hand off

Suggest: `$forge` for single-owner execution, or `$team` for parallel execution.

## Anti-patterns

- Do NOT implement during planning — this skill produces plans, not code.
- Do NOT skip the approval gate.
- Do NOT produce vague plans ("refactor things") — be specific about files and changes.

---
name: omc-plan
description: Lightweight planning for tasks that need structure but not the full blueprint deliberation. Use for medium-complexity tasks.
argument-hint: "<task to plan>"
---

# Plan — Lightweight Planning

A streamlined planning step for tasks that benefit from a brief plan but don't warrant full `$blueprint` deliberation.

## When to use

- The task has 3-8 steps and touches 2-5 files.
- The path is mostly clear but writing it down prevents mistakes.
- `$blueprint` would be overkill.

## When NOT to use

- Trivial tasks (1-2 steps) — just execute directly.
- Complex tasks with tradeoffs — use `$blueprint` instead.

## Execution protocol

1. Assess the task scope.
2. List the implementation steps (3-8 bullets).
3. Note any risks or edge cases.
4. Ask for quick approval, then execute.

Output format:

```markdown
## Plan: [task]

### Steps
1. [Step]
2. [Step]
...

### Risks
- [Risk if any]

### Ready to execute?
```

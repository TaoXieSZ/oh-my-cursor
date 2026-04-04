---
name: omc-tdd
description: Test-driven development workflow. Write tests first, then implement to make them pass. Use when the user says "tdd" or "test first".
argument-hint: "<feature to build with TDD>"
---

# TDD — Test-Driven Development

Red-green-refactor cycle. Tests first, implementation second.

## When to use

- The user says "tdd", "test first", or "test driven".
- Building a well-defined feature where the expected behavior is clear.
- Refactoring where existing behavior must be preserved.

## Execution protocol

### Cycle: Red → Green → Refactor

```
for each behavior:
    1. RED:      Write a failing test for the next behavior
    2. GREEN:    Write the minimum code to make the test pass
    3. REFACTOR: Clean up without changing behavior, ensure tests still pass
```

### Rules

- Write exactly one test before writing implementation code.
- The test must fail before you write the implementation (prove it tests something real).
- Write the simplest code that makes the test pass — no speculative features.
- Refactor only when tests are green.
- Commit after each green-refactor cycle when possible.

### State tracking

Track progress in `.omc/state/tdd-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "feature": "feature description",
  "cycles_completed": 3,
  "current_phase": "red | green | refactor",
  "tests_written": 5,
  "tests_passing": 5,
  "status": "active | complete"
}
```

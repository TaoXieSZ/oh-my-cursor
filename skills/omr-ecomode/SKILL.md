---
name: omr-ecomode
description: Token-efficient mode that minimizes output verbosity and tool usage. Use when asked for "eco", "budget", or "ecomode".
argument-hint: ""
---

# Ecomode — Token-Efficient Operation

Reduce token usage by being concise, batching operations, and avoiding unnecessary output.

## When to use

- The user says "eco", "budget", or "ecomode".
- Working on a long session where token budget matters.
- The task is straightforward and doesn't need verbose explanation.

## Behavior changes when active

1. **Concise responses**: No preamble, no recap. State the action and result.
2. **Batch operations**: Combine related file reads/writes into fewer tool calls.
3. **Skip verbose verification**: Run tests once, not repeatedly.
4. **Minimal planning**: For small tasks, skip formal planning and execute directly.
5. **No progress narration**: Don't explain what you're about to do — just do it.

## State

Write to `.omr/state/ecomode-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "status": "active",
  "mode": "ecomode"
}
```

## Deactivation

Ecomode stays active until:
- The user says `$cancel` or "stop ecomode".
- The session ends.

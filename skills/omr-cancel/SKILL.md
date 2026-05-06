---
name: omr-cancel
description: Cancel the currently active OMR workflow mode. Use when the user says "cancel", "stop", or "abort".
argument-hint: "[mode to cancel]"
---

# Cancel — Clean Mode Termination

Cleanly cancel the active OMR workflow mode and reset state.

## When to use

- The user says "cancel", "stop", or "abort".
- A mode is stuck with no recovery path.
- The user wants to switch to a different approach.

## Execution protocol

1. Identify the active mode(s) from `.omr/state/*-state.json`.
2. For each active mode:
   - Set `status: "cancelled"` and `cancelled_at: <timestamp>`.
   - Write the updated state.
3. Report what was cancelled.
4. Suggest next steps if appropriate.

## Output

```
Cancelled: [mode name] (was: [phase])
State saved to: .omr/state/{mode}-state.json

Ready for new instructions.
```

## Rules

- Always write the final state before reporting cancellation.
- Do NOT delete state files — mark them cancelled for audit trail.
- If no active mode exists, say so rather than erroring.

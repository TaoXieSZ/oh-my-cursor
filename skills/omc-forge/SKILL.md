---
name: omc-forge
description: Persistent completion loop that keeps working until the task is verified done. Use when an approved plan needs single-owner execution with a verify-fix cycle.
argument-hint: "<task to complete>"
---

# Forge — Persistent Completion Loop

A relentless execution mode. Forge does not stop until the work is verified complete, the user cancels, or no recovery path remains.

## When to use

- An approved plan exists (from `$blueprint`) and needs one owner to carry it to completion.
- A task is well-scoped but requires multiple iterations of implement-verify-fix.
- The user says "don't stop", "keep going", or "must complete".

## When NOT to use

- The task needs parallel execution across independent lanes (use `$team`).
- Requirements are still unclear (use `$deep-interview` first).
- No plan exists for a non-trivial task (use `$blueprint` first).

## Planning gate

Before starting implementation, verify that plan artifacts exist:
- `.omc/plans/prd-*.md` — the approved PRD.
- `.omc/plans/test-spec-*.md` — the approved test spec.

If missing and the task is non-trivial, run `$blueprint` first.
Skip the gate only for tasks small enough to need no formal plan.

## Execution protocol

### Loop: implement → verify → fix

```
while not done:
    1. Pick the next work item from the plan
    2. Implement it
    3. Verify (run tests, lint, check behavior)
    4. If verification fails → diagnose and fix
    5. Update progress state
    6. Check: all items done + all verifications pass?
       → yes: mark complete
       → no: continue loop
```

### Slack notifications (optional)

When a Slack Incoming Webhook URL is configured, OMC posts updates when forge state is saved through the OMC state API (including MCP `state_write`).

**Configure (pick one):**

- Environment: `OMC_SLACK_WEBHOOK_URL` or forge-only `OMC_FORGE_SLACK_WEBHOOK_URL`
- Or in `.omc/omc-config.json`: `notifications.slack_webhook_url`

**Behavior:** notifies on start, status changes (complete / cancelled / blocked), phase changes, task or blocker changes. Pure iteration bumps are skipped unless `OMC_SLACK_FORGE_VERBOSE=1`.

**If you edit `forge-state.json` directly** (not via MCP), webhooks do not run automatically — use `omc notify forge` to push a snapshot to Slack.

**Test webhook:** `omc notify slack "hello from OMC"`

### Progress tracking

State is written to `.omc/state/forge-{runId}-state.json` (each forge invocation gets a unique `runId`). Use MCP `state_write` with mode `"forge"` — the system auto-assigns a `runId` on the first write and reuses it for subsequent updates.

State transitions (phase changes, status changes, iteration bumps) are automatically logged as events in `.omc/logs/{runId}.jsonl`. Custom events (tool calls, file edits, milestones) can be injected via MCP `event_append`. Events are visible in the dashboard timeline and embedded in archives.

```json
{
  "mode": "forge",
  "runId": "a1b2c3d4",
  "started_at": "ISO timestamp",
  "status": "active | complete | blocked | cancelled",
  "task": "task description",
  "plan_file": "prd-{slug}.md",
  "iteration": 5,
  "items_total": 8,
  "items_completed": 5,
  "current_item": "Implement auth middleware",
  "blockers": [],
  "completed_at": null
}
```

### Continuation check

Before claiming done, confirm ALL of these:
- [ ] Every plan item is implemented.
- [ ] Tests pass.
- [ ] Lint/typecheck passes.
- [ ] No known errors or regressions.
- [ ] Verification evidence exists for each item.

If ANY check fails, continue the loop. Do NOT claim done prematurely.

### Stop conditions

Stop only when:
1. All items verified complete (success).
2. User explicitly cancels (`$cancel`).
3. A hard blocker with no recovery path exists (escalate to user).

### Escalation

Escalate to the user only for:
- Irreversible or destructive actions.
- Ambiguous requirements not covered by the plan.
- External dependencies that are blocked.

## Anti-patterns

- Do NOT stop after implementing but before verifying.
- Do NOT claim done with failing tests.
- Do NOT silently skip plan items.
- Do NOT expand scope beyond the approved plan without user approval.

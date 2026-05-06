---
name: omr-forge
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

- The task has independent parallel lanes (use `$team` to decompose first).
- Requirements are still unclear (use `$deep-interview` first).
- No plan exists for a non-trivial task (use `$blueprint` first).

## Planning gate

Before starting implementation, verify that plan artifacts exist:
- `.omr/plans/prd-*.md` — the approved PRD.
- `.omr/plans/test-spec-*.md` — the approved test spec.

If missing and the task is non-trivial, run `$blueprint` first.
Skip the gate only for tasks small enough to need no formal plan.

## Execution protocol

### Loop: implement → verify → fix

```
while not done:
    1. Pick the next work item from the plan
    2. Implement it
    3. Verify (run verification tier appropriate to the item)
    4. If verification fails → diagnose and fix (apply retry strategy)
    5. Update progress state
    6. Check: all items done + all verifications pass?
       → yes: run final verification, then mark complete
       → no: continue loop
```

### Verification tiers

Apply the appropriate level of verification for each item:

| Tier | When to use | What to check |
|------|-------------|---------------|
| **Quick** | Small, isolated changes | Lint + typecheck |
| **Standard** | Most implementation items | Lint + typecheck + unit tests |
| **Full** | Integration points, final check | Lint + typecheck + all tests + manual behavior check |

Run **full** verification at least once before claiming completion.

### Retry and rollback strategy

When a fix attempt fails:

1. **First failure**: Diagnose, fix, re-verify.
2. **Second failure on same item**: Try a different approach. Record the failed approach to avoid repeating it.
3. **Third failure on same item**: Revert changes for this item to the last known good state (`git stash` or `git checkout`). Reassess the approach. If the plan item seems fundamentally flawed, mark it as blocked and move to the next item.
4. **Blocked items**: After completing all other items, revisit blocked items with fresh context. If still blocked after one more attempt, escalate to the user.

### Checkpoint and resume

Forge state is designed for cross-session continuity:
- Progress is persisted after every iteration via MCP `state_write`.
- If a session is interrupted, the next `$forge` invocation reads existing state and resumes from the last completed item.
- The `items_completed` and `current_item` fields enable seamless resume.

### Slack notifications (optional)

When a Slack Incoming Webhook URL is configured, OMR posts updates when forge state is saved through the OMR state API (including MCP `state_write`).

**Configure (pick one):**

- Environment: `OMR_SLACK_WEBHOOK_URL` or forge-only `OMR_FORGE_SLACK_WEBHOOK_URL`
- Or in `.omr/omr-config.json`: `notifications.slack_webhook_url`

**Behavior:** notifies on start, status changes (complete / cancelled / blocked), phase changes, task or blocker changes. Pure iteration bumps are skipped unless `OMR_SLACK_FORGE_VERBOSE=1`.

**If you edit `forge-state.json` directly** (not via MCP), webhooks do not run automatically — use `omr notify forge` to push a snapshot to Slack.

**Test webhook:** `omr notify slack "hello from OMR"`

### Progress tracking

State is written to `.omr/state/forge-{runId}-state.json` (each forge invocation gets a unique `runId`). Use MCP `state_write` with mode `"forge"` — the system auto-assigns a `runId` on the first write and reuses it for subsequent updates.

State transitions (phase changes, status changes, iteration bumps) are automatically logged as events in `.omr/logs/{runId}.jsonl`. Custom events (tool calls, file edits, milestones) can be injected via MCP `event_append`. Events are visible in the dashboard timeline and embedded in archives.

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
  "blocked_items": [],
  "failed_approaches": {
    "item-name": ["approach 1 description", "approach 2 description"]
  },
  "verification_tier": "quick | standard | full",
  "blockers": [],
  "completed_at": null
}
```

### Continuation check

Before claiming done, confirm ALL of these:
- [ ] Every plan item is implemented (or explicitly marked as blocked with user acknowledgment).
- [ ] Tests pass (full suite, not just related tests).
- [ ] Lint/typecheck passes.
- [ ] No known errors or regressions.
- [ ] Verification evidence exists for each item.

If ANY check fails, continue the loop. Do NOT claim done prematurely.

### Final summary

On completion, produce a concise summary:

```markdown
## Forge Complete

**Task**: [description]
**Items**: [completed]/[total] ([blocked] blocked)
**Iterations**: [count]
**Files changed**: [list]
**Verification**: All tests pass, lint clean
**Blocked items** (if any): [list with reasons]
```

### Stop conditions

Stop only when:
1. All items verified complete (success).
2. User explicitly cancels (`$cancel`).
3. A hard blocker with no recovery path exists (escalate to user with evidence).

### Escalation

Escalate to the user only for:
- Irreversible or destructive actions.
- Ambiguous requirements not covered by the plan.
- External dependencies that are blocked.
- Items that failed 3+ approaches and need human judgment.

## Anti-patterns

- Do NOT stop after implementing but before verifying.
- Do NOT claim done with failing tests.
- Do NOT silently skip plan items.
- Do NOT expand scope beyond the approved plan without user approval.
- Do NOT retry the exact same approach that already failed — try something different.
- Do NOT continue retrying indefinitely on one item — move on and revisit.

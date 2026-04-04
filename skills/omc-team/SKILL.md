---
name: omc-team
description: Multi-agent parallel coordination using Cursor's Task tool. Dispatches independent work lanes to subagents, coordinates through shared state.
argument-hint: "<N>:<role> \"<task description>\""
---

# Team — Parallel Multi-Agent Coordination

Dispatch work to parallel subagents via Cursor's Task tool. The leader agent coordinates, workers execute bounded slices.

## When to use

- The approved plan has 2+ independent work lanes.
- Parallel execution would meaningfully reduce total time.
- The user says "team", "parallel", or "swarm".

## When NOT to use

- The task is sequential (each step depends on the previous).
- Only one file or module is involved.
- The overhead of coordination exceeds the benefit of parallelism.

## Invocation format

```
$team <count>:<role> "<task description>"
```

Examples:
- `$team 3:executor "implement the three API endpoints in parallel"`
- `$team 2:executor "frontend and backend changes simultaneously"`

## Execution protocol

### Phase 1: Plan dispatch

1. Read the approved plan from `.omc/plans/`.
2. Split work into independent lanes (max 6 workers).
3. For each lane, define: scope, assigned files, expected output, verification criteria.

### Phase 2: Launch workers

Use Cursor's **Task tool** to spawn parallel subagents:

```
For each worker:
  Task(subagent_type="generalPurpose", prompt="""
    You are Worker {N} in a team of {total}.
    
    Your assignment:
    - Scope: {lane_scope}
    - Files: {assigned_files}
    - Expected output: {expected_output}
    
    Rules:
    - Stay inside your assigned file scope.
    - Do NOT modify files assigned to other workers.
    - Report blockers by writing to .omc/state/team/{worker_id}/progress.json
    - When done, write completion status to your progress file.
  """)
```

### Phase 3: Coordinate

The leader agent:
1. Monitors `.omc/state/team/` for worker progress.
2. Resolves conflicts if workers report shared-file issues.
3. Handles blockers escalated by workers.

### Phase 4: Integrate and verify

1. Review all worker outputs.
2. Resolve any integration issues.
3. Run full test suite.
4. Verify the complete change against the plan.

### State management

Write to `.omc/state/team/team-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "name": "team-{timestamp}",
  "task": "task description",
  "worker_count": 3,
  "workers": [
    {
      "id": "worker-1",
      "role": "executor",
      "scope": "API endpoint /users",
      "status": "active | complete | blocked",
      "assigned_files": ["src/api/users.ts"]
    }
  ],
  "phase": "dispatch | executing | integrating | verifying | complete",
  "status": "active | complete | failed | cancelled",
  "completed_at": null
}
```

Per-worker progress in `.omc/state/team/{worker_id}/progress.json`:
```json
{
  "worker_id": "worker-1",
  "status": "active | complete | blocked",
  "items_completed": 2,
  "items_total": 3,
  "blockers": [],
  "updated_at": "ISO timestamp"
}
```

## Leader responsibilities

1. Pick the dispatch plan and keep the brief current.
2. Only delegate bounded, verifiable subtasks with clear file ownership.
3. Integrate results, decide follow-up, and own final verification.

## Worker responsibilities

1. Execute the assigned slice — do not rewrite the plan.
2. Stay inside the assigned write scope.
3. Report blockers and recommended handoffs upward (via progress file).
4. Do NOT modify files outside your assignment.

## Anti-patterns

- Do NOT dispatch dependent tasks in parallel.
- Do NOT let workers modify the same files.
- Do NOT skip the integration/verification phase.
- Do NOT spawn more than 6 workers.

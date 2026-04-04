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

The `<role>` maps to a role prompt file installed by `omc setup`. Available roles:

**Core**: `executor`, `architect`, `debugger`, `verifier`, `explorer`, `planner`
**Specialist**: `code-reviewer`, `test-engineer`, `writer`, `security-reviewer`

Default role if omitted: `executor`.

Examples:
- `$team 3:executor "implement the three API endpoints in parallel"`
- `$team 2:executor "frontend and backend changes simultaneously"`
- `$team 2:test-engineer "write tests for auth and billing modules"`

## Role prompt loading

Role prompts are markdown files with identity, constraints, execution loop, and output contract sections. They are loaded at runtime from the install location:

- **User scope**: `~/.cursor/omc-prompts/{role}.md`
- **Project scope**: `.omc/prompts/{role}.md`

The leader reads the role prompt file and injects it into the Task tool's `prompt` parameter when spawning each worker. If a role prompt file is not found, fall back to the generic worker instructions below.

## Execution protocol

### Phase 1: Plan dispatch

1. Read the approved plan from `.omc/plans/`.
2. Split work into independent lanes (max 6 workers).
3. For each lane, define: scope, assigned files, expected output, verification criteria.
4. Determine the role for each lane (from invocation or keyword routing).

### Phase 2: Launch workers

For each worker, read the role prompt and compose the Task tool invocation:

```
For each worker:
  1. Read role prompt from ~/.cursor/omc-prompts/{role}.md (or .omc/prompts/{role}.md)
  2. Spawn via Task tool:

  Task(subagent_type="generalPurpose", prompt="""
    {contents of prompts/{role}.md}

    --- ASSIGNMENT ---
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

**Model routing**: Use the role's `complexity` metadata to choose the Task model parameter:
- `low` complexity → `model: "fast"`
- `standard` complexity → omit model (inherit parent)
- `high` complexity → omit model (inherit parent, or use more capable if available)

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

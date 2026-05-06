---
name: omr-team
description: Work decomposition and role assignment for parallel execution. Produces a team brief with task lanes, role assignments, and file ownership — designed for use with Cursor's Agents Window.
argument-hint: "<task description>"
---

# Team — Work Decomposition and Role Assignment

Decomposes a task into independent parallel lanes with role assignments and file ownership boundaries. Produces a structured team brief that can be executed in Cursor's Agents Window or via the Task tool.

> **Cursor 3 note**: Parallel agent execution is now native via the Agents Window. This skill focuses on the _planning_ layer — what to parallelize, who owns what, and how to integrate — not the dispatch mechanics.

## When to use

- The approved plan has 2+ independent work lanes.
- Parallel execution would meaningfully reduce total time.
- The user says "team", "parallel", or "swarm".

## When NOT to use

- The task is sequential (each step depends on the previous).
- Only one file or module is involved.
- The overhead of decomposition exceeds the benefit of parallelism.

## Available roles

Roles map to prompt files installed by `omr setup`:

**Core**: `executor`, `architect`, `debugger`, `verifier`, `explorer`, `planner`
**Specialist**: `code-reviewer`, `test-engineer`, `writer`, `security-reviewer`, `designer`, `build-fixer`

Default role if omitted: `executor`.

Role prompts are loaded from:
- **User scope**: `~/.cursor/omr-prompts/{role}.md`
- **Project scope**: `.omr/prompts/{role}.md`

## Execution protocol

### Phase 1: Decompose

1. Read the approved plan from `.omr/plans/`.
2. Identify independent work lanes (max 6).
3. For each lane, define: scope, assigned files, expected output, verification criteria.
4. Determine the role for each lane (from task keywords or explicit assignment).
5. Verify no two lanes share write ownership of the same files.

### Phase 2: Produce team brief

Output a structured team brief:

```markdown
## Team Brief: [task name]

### Lane 1: [description]
- **Role**: executor
- **Files**: src/api/users.ts, src/api/users.test.ts
- **Expected output**: Working CRUD endpoints with tests
- **Verification**: Tests pass, endpoint responds correctly

### Lane 2: [description]
- **Role**: executor
- **Files**: src/ui/UserForm.tsx, src/ui/UserList.tsx
- **Expected output**: React components for user management
- **Verification**: Components render, form validation works

### Integration plan
1. [How lanes connect after completion]
2. [Integration tests to run]
3. [Who verifies the combined result]
```

### Phase 3: Execute

The team brief can be executed two ways:

**Option A: Agents Window (recommended)**
The user opens multiple agents in Cursor's Agents Window, gives each agent its lane description and role prompt.

**Option B: Task tool (automated)**
The leader spawns workers via the Task tool, injecting the role prompt plus the shared `_team-protocol.md` partial into each:

```
For each lane:
  1. Read role prompt from ~/.cursor/omr-prompts/{role}.md
  2. Read team-protocol partial from ~/.cursor/omr-prompts/_team-protocol.md
  3. Stamp lane id as TEAM_LANE_ID = "<runId>-lane-{N}" and role as TEAM_ROLE_NAME
  4. Task(subagent_type="generalPurpose", prompt="""
    {role prompt contents}

    {team-protocol partial contents}

    --- ASSIGNMENT ---
    You are working on Lane {N} of {total}.
    TEAM_LANE_ID = "{runId}-lane-{N}"
    TEAM_ROLE_NAME = "{role}"
    Scope: {lane_scope}
    Files: {assigned_files}
    Expected output: {expected_output}

    Rules:
    - Stay inside your assigned file scope.
    - Do NOT modify files assigned to other lanes.
    - Follow the <team_protocol> — post your start / claim / progress /
      handoff / release / complete events to the blackboard so the leader
      can echo them into the chat session.
  """)
```

**Subagent type mapping**: Use the role's `mode` metadata to choose the Task tool parameters:
- `mode: readonly` → `readonly: true` (the subagent runs in read-only/ask mode — for reviewers, architects, verifiers)
- `mode: agent` → `readonly: false` (the subagent can make changes — for executors, debuggers, designers)

**Model routing**: Use the role's `complexity` and `model` metadata:
- `model: "fast"` (explicit) → `model: "fast"`
- `low` complexity → `model: "fast"`
- `standard` / `high` complexity → omit model (inherit parent)

**Role composition**: When a lane needs multiple perspectives (e.g. security + API review), compose roles by loading both prompts and combining their constraints. Use `composeRoles()` from the role registry.

### Coordination via shared blackboard

When lanes execute in parallel, agents coordinate through the shared blackboard (MCP tools `blackboard_post` / `blackboard_tail` / `blackboard_read`):

- **status**: Agent reports start / complete lifecycle ticks.
- **claim**: Agent announces it is working on specific files → prevents conflicts.
- **progress**: Agent reports completion of sub-items.
- **blocker**: Agent reports a blocker for the leader to resolve.
- **handoff**: Agent hands off a dependency to another lane.
- **release**: Agent announces it has finished with specific files.

Example: `blackboard_post(agent="lane-1-executor", lane="run123-lane-1", role="executor", kind="claim", content="src/api/users.ts")`

Every lane post MUST set `lane` and `role` — those fields power the leader's chat rendering (below). The `_team-protocol.md` partial injected into every lane prompt enforces this.

### Chat rendering protocol

A team dispatch is only useful if the human in the main chat can actually see the team working. After Phase 3 dispatches lanes, the leader enters a **standup loop** and echoes every new blackboard message into the chat composer so the session feels like the oh-my-codex tmux panes.

1. **Tail the blackboard.** Call `blackboard_tail(cursor)` via the `omr-state` MCP server. Pass `undefined` the first time, then feed `nextCursor` back on each subsequent call so polls are incremental.
2. **Render two blocks into the chat message.** Whenever the tail returns messages:

   **Lane status table** — one row per lane, latest status only:

   ```text
   | Lane | Role          | State     | Last update              |
   | ---- | ------------- | --------- | ------------------------ |
   | 1    | executor      | active    | claim src/api/users.ts   |
   | 2    | designer      | progress  | form draft complete      |
   | 3    | test-engineer | waiting   | —                        |
   ```

   **Team-chatter log** — chronological, newest at bottom, one line per message using the canonical format `[HH:MM:SS] <lane>·<role>  <kind>  <content>`:

   ```text
   [14:22:01] run123-lane-1·executor      status    started
   [14:22:03] run123-lane-1·executor      claim     src/api/users.ts
   [14:22:18] run123-lane-2·designer      progress  form draft complete
   [14:22:30] run123-lane-1·executor      release   src/api/users.ts
   ```

3. **Render cadence.** Refresh both blocks:
   - Immediately after every Task tool return.
   - Once explicitly mid-run if any lane has been silent for a long stretch.
4. **Plain markdown only.** Write both blocks as part of the leader's chat message — no dashboard indirection — so the user sees them without opening the web view.
5. **Exit condition.** The standup loop ends when every lane has posted `release` or a `status` of `complete`, or when a `blocker` forces leader intervention.

The human watching chat should never wonder "what are the agents doing?" — the table answers _where_ each lane is, and the log answers _what just happened_.

### Phase 4: Integrate and verify

1. Review all lane outputs.
2. Check blackboard for any unresolved blockers or handoffs.
3. Resolve any integration issues.
4. Run full test suite.
5. Verify the complete change against the plan.
6. **Save the transcript.** Call `team_transcript_write({ runId })` (from the `omr-state` MCP server) to capture the full chatter log at `.omr/state/team/<runId>-transcript.md`. Cite that path in the leader's final summary so the user can re-read the run later or share it.
7. Clear the blackboard for the next session: `blackboard_clear`.

> Tip: users who want a side terminal panel of team chatter (closer to oh-my-codex tmux panes) can run `omr team watch --run <runId>` in a separate terminal while the leader runs in chat.

## State management

Write to `.omr/state/team-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "task": "task description",
  "lanes": [
    {
      "id": "lane-1",
      "role": "executor",
      "scope": "API endpoint /users",
      "assigned_files": ["src/api/users.ts"],
      "status": "pending | active | complete | blocked"
    }
  ],
  "phase": "decompose | briefed | executing | integrating | complete",
  "status": "active | complete | failed | cancelled",
  "completed_at": null
}
```

## Leader responsibilities

1. Produce the decomposition and team brief.
2. Only assign bounded, verifiable lanes with clear file ownership.
3. Integrate results and own final verification.

## Anti-patterns

- Do NOT assign dependent tasks to different lanes.
- Do NOT let multiple lanes write to the same files.
- Do NOT skip the integration/verification phase.
- Do NOT decompose into more than 6 lanes.

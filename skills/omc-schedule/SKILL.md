---
name: omc-schedule
description: Schedule periodic tasks that run in background subagents. Supports watching PRs, polling APIs, monitoring services, and Slack alerts. Use when asked to "schedule", "poll", "watch", "monitor", "check periodically", or "every N minutes".
argument-hint: "<task-description> [--every <interval>] [--until <condition>]"
---

# Schedule

A pure-Cursor scheduler that runs periodic tasks via background subagents. Tasks survive within a session and persist across sessions via hooks.

## When to use

- User says "check every 5 minutes", "poll until approved", "watch this PR", "monitor status"
- Any task that needs to repeat on a timer or until a condition is met
- Post-action verification that needs time to converge

## When NOT to use

- One-time checks (just run them directly)
- Tasks that need to run when Cursor is closed (use launchd/cron instead)

## Invocation

```
/omc-schedule "watch PR #42 merge" --every 2m --until merged
/omc-schedule "poll deploy status" --every 5m --until "status == healthy"
/omc-schedule "check CI pipeline" --every 3m
/omc-schedule list                    # show all scheduled tasks
/omc-schedule cancel <task-id>        # cancel a task
/omc-schedule resume                  # resume tasks from previous session
```

## Execution Protocol

### Step 1: Parse and register task

Extract from user request:
- **task_type**: Match to a known plugin (see Plugin Registry below), or use `custom` for free-form
- **interval**: Polling interval (default: 5m)
- **until_condition**: Stop condition (optional — runs until cancelled if not set)
- **params**: Task-specific parameters

### Step 2: Write state

Persist task to `.omc/state/schedule-state.json` via MCP `state_write` or direct file write:

```json
{
  "mode": "schedule",
  "status": "active",
  "started_at": "ISO timestamp",
  "tasks": [
    {
      "id": "task-uuid",
      "type": "check-pr-merge",
      "description": "watch PR #42 merge",
      "interval_seconds": 120,
      "until_condition": "state == MERGED",
      "params": {
        "pr_number": 42,
        "repo_dir": "."
      },
      "state": "running",
      "created_at": "ISO timestamp",
      "last_run_at": null,
      "last_result": null,
      "run_count": 0,
      "notify": {
        "slack_webhook_url": "https://hooks.slack.com/services/...",
        "mention_user": "@username"
      }
    }
  ]
}
```

### Step 3: Launch subagent polling loop

Use the Task tool to start a background subagent that runs the polling loop:

```
Task(subagent_type="generalPurpose", model="fast", description="Schedule: <task description>", prompt=<POLLING_PROMPT>)
```

The polling prompt instructs the subagent to:
1. Execute the task's check logic
2. Evaluate the until_condition
3. If condition met → report success and exit
4. If not → sleep for interval using `Await(block_until_ms=interval_ms)`
5. Update state file after each run
6. Repeat

### Step 4: Main agent continues

After launching the subagent, the main agent returns control to the user. The subagent runs independently.

### Step 5: Task completion

When a task's until_condition is met:
1. Subagent updates state to `"state": "completed"`
2. Subagent posts result to `.omc/state/schedule-state.json`
3. If notify config exists, sends Slack message / alerts user

### Step 6: Session boundary handling

**On session stop** (hook): The `session-end.mjs` hook reads `schedule-state.json`. Tasks with `"state": "running"` are marked `"state": "suspended"` with `suspended_at` timestamp.

**On session start** (hook): The `session-start.mjs` hook detects suspended tasks and writes a marker file `.omc/state/schedule-resume-pending.json`. The agent rule reads this and prompts the user: "You have N suspended scheduled tasks. Resume?"

## Plugin Registry

### `check-pr-merge`

Watch a GitHub PR until it's merged.

**Params:**
- `pr_number`: PR number
- `repo_dir`: Local repo path for `gh` CLI
- `gh_host`: GitHub host (default: `github.com`)

**Check logic:**
```bash
gh pr view <pr_number> --json state,mergedAt
```

**Success condition:** `state == "MERGED"`

**On success:** Record merge timestamp. If follow-up task configured, auto-register it.

### `poll-api`

Poll an HTTP endpoint for a specific response.

**Params:**
- `url`: Endpoint URL
- `method`: HTTP method (default: GET)
- `headers`: Optional headers object
- `expected_status`: Expected HTTP status code (default: 200)
- `jq_filter`: Optional jq expression to extract a value from JSON response
- `expected_value`: Value the jq_filter result should match

**Check logic:**
```bash
curl -s -o /tmp/poll-result.json -w "%{http_code}" "<url>"
# Then optionally: jq '<jq_filter>' /tmp/poll-result.json
```

**Success condition:** HTTP status matches AND (if jq_filter set) extracted value matches expected_value.

### `check-ci`

Watch CI pipeline status for a branch or commit.

**Params:**
- `repo_dir`: Local repo path
- `branch`: Branch name (default: current branch)
- `required_checks`: List of check names that must pass (optional — all checks if not set)

**Check logic:**
```bash
gh run list --branch <branch> --json status,conclusion,name --limit 10
```

**Success condition:** All required checks have `conclusion == "success"`.

### `poll-jira`

Poll a Jira ticket for status change.

**Params:**
- `issue_key`: Jira issue key (e.g., `PROJ-1234`)
- `target_status`: Status to wait for (default: any status change, typical: `Done`, `Approved`)

**Check logic:** Use MCP `jira_get_issue` or Jira REST API to read current status.

**Success condition:** Issue status matches target_status or issue has been approved/resolved.

### `alert-slack`

Send an alert to Slack. Not a polling task — used as a notification action by other plugins.

**Params:**
- `webhook_url`: Slack Incoming Webhook URL
- `message`: Alert message text
- `channel`: Optional channel override
- `thread_ts`: Optional thread timestamp for threading

**Execution:** Single-shot POST to webhook URL.

### `custom`

Free-form task. The agent interprets the description and runs appropriate checks.

**Params:**
- `description`: Natural language description of what to check
- `commands`: Optional list of shell commands to run

**Check logic:** Agent executes commands and evaluates output against the until_condition.

## Task Chaining

Tasks can trigger follow-up tasks on completion:

```json
{
  "type": "check-pr-merge",
  "params": { "pr_number": 42 },
  "on_complete": {
    "type": "poll-api",
    "params": { "url": "https://api.example.com/deploy/status", "expected_value": "healthy" },
    "delay_seconds": 300
  }
}
```

When check-pr-merge succeeds, it waits 5 minutes then starts poll-api.

## Commands

| Command | Action |
|---------|--------|
| `/omc-schedule "<task>"` | Register and start a new scheduled task |
| `/omc-schedule list` | Show all tasks (active, suspended, completed) |
| `/omc-schedule cancel <id>` | Cancel a running task |
| `/omc-schedule resume` | Resume all suspended tasks from previous session |
| `/omc-schedule status` | Show current task states with last results |

## State File

Path: `.omc/state/schedule-state.json`

The state file is the source of truth. Updated after every task run.

## Hook Integration

### session-start hook addition

Reads `schedule-state.json`. If any tasks have `"state": "suspended"`:
- Writes `.omc/state/schedule-resume-pending.json` with task summaries
- Agent reads this on startup and prompts user to resume

### session-end hook addition

Reads `schedule-state.json`. For tasks with `"state": "running"`:
- Updates to `"state": "suspended"`, adds `suspended_at`
- Preserves all task params and last results for resume

## Anti-patterns

- Do NOT schedule tasks with intervals < 1 minute (wastes resources)
- Do NOT run more than 5 concurrent scheduled tasks (subagent limit)
- Do NOT schedule tasks that modify files — scheduled tasks should be read-only + notify
- Do NOT keep polling after the until_condition is met
- Do NOT lose task state — always persist before and after each check

---
name: omc-autopilot
description: Full autonomous execution from idea to working code. Orchestrates the complete lifecycle — expansion, planning, implementation, QA, and validation.
argument-hint: "<product idea or task description>"
---

# Autopilot — Idea to Working Code

Takes a brief product idea and autonomously handles the full lifecycle: requirements expansion, planning, parallel implementation, QA cycling, and multi-perspective validation. Produces working, verified code from a short description.

## When to use

- The user wants end-to-end autonomous execution from an idea to working code.
- The user says "autopilot", "build me", "create me", "make me", or "full auto".
- The task requires multiple phases: planning, coding, testing, and validation.
- The user wants hands-off execution.

## When NOT to use

- The user wants to explore options or brainstorm — respond conversationally or use `$blueprint`.
- The user wants a single focused code change — use `$forge` or execute directly.
- The user says "just explain" or "what would you suggest" — answer directly.
- The task is a quick fix or small bug — execute directly.

## Execution protocol

### Phase 0: Expansion

Turn the user's idea into a detailed spec.

1. If the request is vague or ambiguous, run `$deep-interview --quick` first to clarify.
2. Extract requirements: functional requirements, constraints, tech stack, acceptance criteria.
3. Create a technical specification.
4. Write output to `.omc/plans/autopilot-spec.md`.

**Gate**: If the spec is unclear after expansion, stop and run `$deep-interview` before proceeding.

### Phase 1: Planning

Create an implementation plan from the spec.

1. Run `$blueprint` logic: architecture, tradeoffs, test strategy, implementation sequence.
2. Write plan to `.omc/plans/autopilot-impl.md`.
3. Write test spec to `.omc/plans/autopilot-test-spec.md`.

**Gate**: Plan must be coherent and implementable. If tradeoffs need user input, pause and ask.

### Phase 2: Execution

Implement the plan.

1. If the plan has independent work lanes → use `$team` for parallel execution.
2. Otherwise → use `$forge` for single-owner execution.
3. Apply role routing from the orchestration rule:
   - Simple tasks → `explorer` or `executor` roles (fast model)
   - Standard tasks → `executor` role
   - Complex tasks → `architect` + `executor` roles
4. Run independent tasks in parallel where possible.

### Phase 3: QA

Cycle until all tests pass.

1. Run the full test suite.
2. Run lint/typecheck.
3. Fix any failures.
4. Repeat up to **5 cycles**.
5. If the same error persists across **3 cycles**, stop and report the fundamental issue.

### Phase 4: Validation

Multi-perspective review using role prompts.

Launch up to 3 reviewers in parallel via the Task tool, each with their role prompt:

1. **Architect review** (role: `architect`): Functional completeness, design quality.
2. **Security review** (role: `security-reviewer`): Vulnerability check, secret exposure.
3. **Code review** (role: `code-reviewer`): Quality, maintainability, style.

All reviewers must approve. If any rejects, fix the issues and re-validate (max 3 rounds).

### Phase 5: Cleanup

On successful completion:
1. Mark all mode states as complete.
2. Write final summary to `.omc/state/autopilot-state.json`.
3. Report to user: what was built, files created, tests passing, any caveats.

## State management

Write to `.omc/state/autopilot-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "task": "task description",
  "current_phase": "expansion | planning | execution | qa | validation | complete",
  "spec_file": "autopilot-spec.md",
  "plan_file": "autopilot-impl.md",
  "qa_cycles": 0,
  "validation_rounds": 0,
  "status": "active | complete | blocked | cancelled",
  "completed_at": null
}
```

Update state on every phase transition.

## Recommended clarity pipeline

For ambiguous requests:

```
$deep-interview → $blueprint → $autopilot
```

But autopilot can handle this internally — it will trigger deep-interview and blueprint as needed.

## Examples

**Good**: `$autopilot "A REST API for a bookstore inventory with CRUD operations using TypeScript"`
— Specific domain, clear features, technology constraint.

**Good**: `$autopilot "build me a CLI tool that tracks daily habits with streak counting"`
— Clear product concept with a specific feature.

**Bad**: `$autopilot "fix the bug in the login page"`
— Single focused fix. Use `$forge` or execute directly.

**Bad**: `$autopilot "what are some good approaches for adding caching?"`
— Exploration request. Answer directly or use `$blueprint`.

## Stop conditions

- Same QA error persists across 3 cycles → stop and report.
- Validation keeps failing after 3 rounds → stop and report.
- User says "cancel", "stop", or "abort" → clean exit via `$cancel`.
- Requirements too vague after expansion → redirect to `$deep-interview`.

## Anti-patterns

- Do NOT skip the QA phase.
- Do NOT skip validation for non-trivial projects.
- Do NOT let QA cycle indefinitely — cap at 5.
- Do NOT proceed with a vague spec — clarify first.
- Do NOT expand scope beyond the original idea without asking.

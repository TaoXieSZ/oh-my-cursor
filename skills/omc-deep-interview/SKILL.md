---
name: omc-deep-interview
description: Socratic interview workflow that clarifies intent, scope, and boundaries before implementation. Use when the request is broad, ambiguous, or the user says "don't assume".
argument-hint: "<topic to clarify>"
---

# Deep Interview

A structured Socratic clarification workflow. This skill clarifies — it does NOT implement.

## When to use

- The request is broad or boundaries are unclear.
- The user says "don't assume", "interview me", or "clarify".
- Multiple valid interpretations exist and picking wrong would waste significant effort.

## When NOT to use

- The task is already scoped with clear acceptance criteria.
- The user explicitly asks to skip planning and just execute.
- The change is trivial (< 3 steps, single file).

## Depth profiles

| Profile | Rounds | Use when |
|---------|--------|----------|
| `--quick` | 2-3 | Minor ambiguity, just need 1-2 clarifications |
| `--standard` | 4-6 | Moderate ambiguity, need scope + boundaries |
| `--deep` | 7-10 | Major ambiguity, architectural decisions, multi-system impact |

Default: `--standard`

## Execution protocol

1. **Assess ambiguity**: Read the user's request. Identify what is unclear: intent, scope, constraints, success criteria, non-goals.

2. **One question per round**: Ask exactly ONE focused question per turn. Do not bundle multiple questions. Frame questions to expose hidden assumptions.

   Good: "Should the auth system support OAuth providers, or only email/password?"
   Bad: "What auth providers do you want, and should we add rate limiting, and what about session management?"

3. **Synthesize progressively**: After each answer, update your internal model. Show a running summary of what's been clarified so far.

4. **Ambiguity threshold gate**: After each round, assess remaining ambiguity on a 0-10 scale:
   - 0-2: Clear enough to proceed → hand off.
   - 3-5: A few more questions needed.
   - 6-10: Significant ambiguity remains.

5. **Produce clarified brief**: When ambiguity drops below threshold, output:

```markdown
## Clarified Task Brief

**Goal**: [one sentence]
**Scope**: [what's included]
**Non-goals**: [what's explicitly excluded]
**Acceptance criteria**: [how to verify success]
**Key decisions**: [choices made during interview]
**Suggested next step**: $blueprint / $forge / direct execution
```

6. **Hand off**: Do NOT start implementation. Suggest the next workflow stage.

## State

Write interview progress to `.omc/state/deep-interview-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "topic": "the clarification topic",
  "depth": "standard",
  "rounds_completed": 3,
  "ambiguity_score": 2,
  "brief": "the clarified brief markdown",
  "status": "active | complete | cancelled"
}
```

## Anti-patterns

- Do NOT ask more than one question per turn.
- Do NOT start coding during the interview.
- Do NOT skip the brief — always produce a written artifact.
- Do NOT re-ask questions the user already answered.

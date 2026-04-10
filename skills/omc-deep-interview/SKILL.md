---
name: omc-deep-interview
description: Socratic interview workflow that clarifies intent, scope, and boundaries before implementation. Use when the request is broad, ambiguous, or the user says "don't assume".
argument-hint: "[--quick|--deep] <topic to clarify>"
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

Default: `--standard`. Auto-upgrade to `--deep` if complexity is discovered during the interview.

## Execution protocol

### Step 0: Codebase reconnaissance

Before asking the first question, silently explore the relevant codebase to understand the current state. This prevents asking questions the code already answers.

- Read files mentioned or implied by the user's request.
- Check existing tests, configs, and documentation.
- Note patterns, conventions, and constraints already in place.

### Step 1: Assess ambiguity

Read the user's request. Categorize unknowns across these dimensions:

| Dimension | What to check |
|-----------|---------------|
| **Intent** | What outcome does the user actually want? |
| **Scope** | What's included vs. excluded? |
| **Constraints** | Performance, compatibility, deadlines, tech stack |
| **Success criteria** | How will we know it's done and correct? |
| **Non-goals** | What should we explicitly NOT do? |
| **Technical decisions** | Architecture choices, library selection, patterns |

### Step 2: One question per round

Ask exactly ONE focused question per turn using the AskQuestion tool when discrete options exist. Frame questions to expose hidden assumptions.

Good: "Should the auth system support OAuth providers, or only email/password?"
Bad: "What auth providers do you want, and should we add rate limiting, and what about session management?"

**Question prioritization**: Ask questions in order of impact — start with questions where the wrong assumption would waste the most effort.

### Step 3: Show clarification tracker

After each answer, display a running tracker showing what's clarified and what remains:

```markdown
### Clarification Tracker (Round N/max)

| Dimension | Status | Summary |
|-----------|--------|---------|
| Intent | Clarified | Build a REST API for inventory management |
| Scope | Clarified | CRUD operations, no reporting |
| Constraints | Needs clarification | Tech stack undecided |
| Success criteria | Needs clarification | — |
| Non-goals | Clarified | No frontend, no auth |
| Technical decisions | Needs clarification | — |

**Ambiguity score**: N/10
```

### Step 4: Ambiguity threshold gate

After each round, assess remaining ambiguity on a 0-10 scale:
- **0-2**: Clear enough to proceed — produce brief and hand off.
- **3-5**: A few more questions needed — continue.
- **6-10**: Significant ambiguity remains — continue.
- If ambiguity drops by less than 1 point for two consecutive rounds, escalate by asking a more fundamental question or suggest moving forward with stated assumptions.

**Auto-depth upgrade**: If at round 3 of `--standard` the ambiguity score is still above 6, automatically upgrade to `--deep` and inform the user.

### Step 5: Produce clarified brief

When ambiguity drops below threshold, output a structured brief:

```markdown
## Clarified Task Brief

**Goal**: [one sentence]
**Scope**: [what's included]
**Non-goals**: [what's explicitly excluded]
**Constraints**: [technical and non-technical constraints]
**Acceptance criteria**:
- [ ] [Verifiable criterion 1]
- [ ] [Verifiable criterion 2]
**Key decisions**: [choices made during interview with rationale]
**Open assumptions**: [anything assumed but not explicitly confirmed]
**Suggested next step**: $blueprint / $forge / direct execution
```

### Step 6: Persist and hand off

Write the brief to `.omc/plans/interview-brief-{slug}.md` for downstream skills to consume. Do NOT start implementation. Suggest the next workflow stage:
- Complex task → `$blueprint`
- Clear, scoped task → `$forge`
- Trivial task → direct execution

## Slack / notifications

`$deep-interview` persists state to `deep-interview-state.json`. **Automatic Slack webhooks are not wired for this mode** — only **forge** state writes (via the OMC state API / MCP) trigger optional Incoming Webhook posts. Use `omc notify slack` to test your webhook, or extend OMC in a future change if you need interview milestones in Slack.

## State

Write interview progress to `.omc/state/deep-interview-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "topic": "the clarification topic",
  "depth": "standard",
  "rounds_completed": 3,
  "ambiguity_score": 2,
  "dimensions": {
    "intent": "clarified",
    "scope": "clarified",
    "constraints": "needs_clarification",
    "success_criteria": "clarified",
    "non_goals": "clarified",
    "technical_decisions": "needs_clarification"
  },
  "brief_file": "interview-brief-{slug}.md",
  "brief": "the clarified brief markdown",
  "status": "active | complete | cancelled"
}
```

## Anti-patterns

- Do NOT ask more than one question per turn.
- Do NOT start coding during the interview.
- Do NOT skip the brief — always produce a written artifact.
- Do NOT re-ask questions the user already answered.
- Do NOT ask questions the codebase already answers — do reconnaissance first.
- Do NOT continue asking after ambiguity reaches 0-2 — produce the brief and hand off.

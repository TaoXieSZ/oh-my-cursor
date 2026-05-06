---
name: omr-ask
description: Get a second opinion from another local CLI assistant (claude, codex, gemini). Captures the question, raw response, and a summary as a reusable artifact under .omr/artifacts/.
argument-hint: "<backend: claude|codex|gemini> <question or task>"
---

# Ask — External CLI Second Opinion

Use a locally installed external assistant CLI (Claude, Codex, or Gemini) for focused questions, reviews, brainstorming, or second opinions on tricky decisions. Cursor is your primary workspace; this skill borrows another model's perspective when adversarial review or independent reasoning materially helps.

The question, the raw response, and a concise summary are saved as a markdown artifact under `.omr/artifacts/` so the conversation is reviewable later and citable in PRDs, ADRs, or wiki pages.

## When to use

- You want an **independent second opinion** on a tricky design or debugging question.
- You're stuck and want a model with **different training biases** to weigh in.
- The user explicitly says "ask claude", "ask codex", "ask gemini", "second opinion", or "what does X think".
- A `$ralplan` architect-vs-critic loop hits a 50/50 split and an external tiebreaker would help.

## When NOT to use

- The question is fully answerable inside Cursor — just answer it.
- The other CLI isn't installed locally — say so, don't silently switch to a remote provider or web fetch.
- You need a tool that operates in your repo (edits files, runs commands) — that's a different agent, not a second opinion.

## Backend selection

| Trigger | Backend |
|---|---|
| User says "claude" / "anthropic" | `claude` |
| User says "codex" / "openai codex" | `codex` |
| User says "gemini" / "google" | `gemini` |
| No backend specified, multiple installed | Pick the one whose strengths match the question (claude for nuanced reasoning, codex for code-heavy questions, gemini for breadth/research) |
| No backend specified, only one installed | Use the installed one |
| None installed | Tell the user to install one; do not fall back to a remote provider |

Detect installation with a quick `command -v claude`, `command -v codex`, `command -v gemini` check.

## Local CLI invocation

Use the standard prompt flag for each CLI:

```bash
# Claude CLI
claude -p "<your question>"

# Codex CLI
codex exec "<your question>"
# or, if the user has oh-my-codex installed:
omx ask claude "<your question>"
omx ask gemini "<your question>"

# Gemini CLI
gemini -p "<your question>"
```

If the installed binary uses a different flag (older versions, distro variants), adapt to it but **keep local execution as the default path**. Do not silently switch to an MCP server or remote API when the local binary is missing.

## Artifact requirement

After execution, save a markdown artifact at:

```
.omr/artifacts/ask-{backend}-{slug}-{YYYYMMDDTHHMMSSZ}.md
```

Where `{slug}` is a 3-6 word kebab-case summary of the question.

Required artifact sections:

```markdown
---
backend: claude | codex | gemini
asked_at: 2026-05-06T13:00:00Z
slug: <slug>
---

## Original task
[verbatim user task or question that triggered this ask]

## Final prompt sent to CLI
[the exact prompt sent to the external CLI, including any added context]

## Raw CLI output
[verbatim output from the CLI — do not paraphrase]

## Summary
[3-5 sentence concise summary of the response]

## Action items / next steps
- [ ] [concrete next step 1]
- [ ] [concrete next step 2]

## Confidence
[low | medium | high] — [one-line justification]
```

The artifact is the durable record. Anyone can `grep .omr/artifacts/` later to find what an external model said about a problem.

## Prompt construction

Before invoking the CLI, build a focused prompt:

1. **State the question crisply** — one sentence if possible, three at most.
2. **Add minimum necessary context** — only what the external CLI needs to answer well. Don't dump the entire codebase.
3. **Specify the desired output shape** — "list 3 tradeoffs", "give a yes/no with reasoning", "propose 2 alternatives".
4. **Frame the external model's role** — "You are an independent reviewer of this design. Be skeptical."

Example:

```text
You are an independent reviewer.

Context: We're deciding between Redis vs in-memory cache for an API layer
serving 100 RPS with cache hit ratio ~80%. Latency budget is 50ms p99.
Persistence is not required across restarts.

Question: Which would you choose, and what's the strongest argument
against your choice?

Output format: 1) recommendation, 2) reasoning (3 bullets), 3) strongest counter-argument.
```

## Multi-model second opinion (advanced)

For high-stakes decisions, ask 2-3 backends in parallel and compare:

```bash
# Run in background terminals
claude -p "<question>" > .omr/artifacts/ask-claude-<slug>-<ts>.raw &
codex exec "<question>" > .omr/artifacts/ask-codex-<slug>-<ts>.raw &
gemini -p "<question>" > .omr/artifacts/ask-gemini-<slug>-<ts>.raw &
wait
```

Then write a synthesis artifact at `.omr/artifacts/ask-synthesis-{slug}-{ts}.md` that:

- Cites all 3 raw artifacts.
- Notes where they agreed.
- Notes where they disagreed and which argument was strongest.
- States your final recommendation with reasoning.

This is the "tribunal" pattern — three independent perspectives + a synthesis judge.

## State Management

Use `omr-state` MCP for ask lifecycle:

- **On start**: `state_write({ mode: "ask", active: true, started_at: "<now>", backend: "<backend>", task: "<task>" })`
- **On completion**: `state_write({ mode: "ask", active: false, completed_at: "<now>", artifact_path: "<path>" })`
- **On cancel**: run `$cancel`.

The artifact itself is the primary record; state tracking is mostly for the dashboard.

## Anti-patterns

- Do NOT paraphrase the raw CLI output in the artifact — keep it verbatim and add the summary separately.
- Do NOT silently switch to a remote API when the local binary is missing — tell the user.
- Do NOT dump entire files into the prompt — extract and summarize the relevant slice.
- Do NOT ask the same question to 3 backends every time — only use multi-model for high-stakes decisions where the cost is justified.
- Do NOT treat the external CLI's answer as authoritative — it's a perspective, not a verdict. You still own the decision.
- Do NOT skip the artifact — the whole value of this skill is the durable, citable record.

## Scenario examples

**Good**: User asks "should we use Redis or in-memory cache?". You invoke `claude -p "..."` with a focused prompt, save the artifact, summarize: "Claude recommends Redis citing operational maturity; strongest counter-argument is overhead for our scale. Action: prototype both, measure p99."

**Good**: A `$ralplan` architect+critic loop disagrees on whether to migrate via dual-write or shadow-read. You invoke `omr-ask gemini` for a tiebreaker, save the artifact, cite it in the PRD's ADR section.

**Bad**: You paraphrase Claude's response without saving the raw output — three weeks later no one can verify what was actually said.

**Bad**: User asks a simple question, you delegate to Claude when Cursor's own answer would have been fine. Wasted CLI roundtrip and an artifact full of trivial content.

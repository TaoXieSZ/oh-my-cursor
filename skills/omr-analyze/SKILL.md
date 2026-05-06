---
name: omr-analyze
description: Deep investigation and analysis of code, bugs, or architecture. Use when asked to analyze, investigate, or understand a codebase area.
argument-hint: "<topic to analyze>"
---

# Analyze — Deep Investigation

Systematic analysis that produces a structured understanding before any changes are made.

## When to use

- The user says "analyze", "investigate", or "why is this broken".
- Root cause analysis is needed before fixing.
- Understanding code architecture or data flow before making changes.

## Execution protocol

1. **Scope**: Identify what to analyze — a bug, a module, a data flow, a performance issue.
2. **Gather evidence**: Read relevant code, logs, test output. Use search tools extensively.
3. **Map dependencies**: Trace the call chain, data flow, or error propagation path.
4. **Hypothesize**: Form 2-3 hypotheses ranked by likelihood.
5. **Verify**: Test each hypothesis against the evidence.
6. **Report**: Present findings in structured format:

```markdown
## Analysis: [topic]

### Summary
[One paragraph overview]

### Evidence
- [Finding 1]
- [Finding 2]

### Root cause / Key insight
[The core finding]

### Recommended action
[What to do next — fix, plan, or deeper investigation]
```

## Rules

- Do NOT fix anything during analysis — this skill is read-only.
- Present all evidence before conclusions.
- Rank hypotheses by likelihood, not by ease of fix.

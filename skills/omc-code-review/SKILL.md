---
name: omc-code-review
description: Structured code review analyzing diffs for correctness, safety, and style. Use when asked to review code or a PR.
argument-hint: "<what to review>"
---

# Code Review

Systematic review of code changes for correctness, safety, performance, and style.

## When to use

- The user says "review code", "code review", or "check my diff".
- Before merging or landing changes.
- After a significant implementation pass.

## Review checklist

For each file in the diff, check:

1. **Correctness**: Does the code do what it claims? Edge cases handled?
2. **Safety**: SQL injection, XSS, auth bypasses, secret exposure, destructive operations without guards.
3. **Performance**: N+1 queries, unbounded loops, missing indexes, large allocations.
4. **Error handling**: Are errors caught, logged, and propagated appropriately?
5. **Tests**: Are new behaviors tested? Are edge cases covered?
6. **Style**: Consistent with the codebase? No unnecessary complexity?

## Output format

```markdown
## Code Review: [scope]

### Summary
[Overall assessment: approve / request changes / needs discussion]

### Issues
- **[severity: critical|high|medium|low]** [file:line] — [description]

### Strengths
- [What's done well]

### Suggestions
- [Optional improvements]
```

## Rules

- Flag critical issues first.
- Be specific — cite file and line.
- Distinguish blocking issues from suggestions.
- Do NOT auto-fix during review unless asked.

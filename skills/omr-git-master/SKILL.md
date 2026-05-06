---
name: omr-git-master
description: Direct entry point to the git-master role for atomic commits, style-matched messages, rebasing, and history cleanup. Detects existing commit style, splits by logical concern, and uses safe history operations.
argument-hint: "<git task: split commits, rebase, clean history, etc.>"
---

# Git Master — Atomic Commits and Safe History

A focused entry point that hands off to the `git-master` role with a structured pre-flight, so common git operations get done with style-matched messages, atomic splits, and safe history ops — without you having to remember the role-routing keywords.

The role itself is defined in `prompts/git-master.md`. This skill is the one-screen wrapper that activates it.

## When to use

- You have a working tree with multiple unrelated changes and need to split them into atomic commits.
- You need to rebase, squash, reorder, or clean up local history before pushing.
- You want the commit message to match the project's existing style (semantic, plain, language) without manually inspecting `git log`.
- The user says "commit", "split commits", "rebase", "clean history", "git-master".

## When NOT to use

- The change is one tiny atomic edit — just commit it directly.
- You haven't yet verified the change works — run tests / lint / typecheck first via `$forge` or directly.
- The operation is destructive and irreversible (force-push to shared branch, hard reset on main) — escalate to the user, do not proceed without explicit approval.
- You need to write a commit but the user hasn't asked for a commit — per personal-coding-habits, never commit without explicit request.

## Pre-flight checklist

Before invoking the role, verify:

1. **Working tree state is what the user expects** — run `git status` and confirm the file list matches the task.
2. **No secrets in the diff** — quick scan for `.env`, `credentials`, API keys, tokens.
3. **Tests pass for the changes being committed** — if not, ask the user whether to commit anyway.
4. **You're on the right branch** — never operate on `main` / `master` directly without explicit approval.
5. **Remote state** — `git status` shows whether you're ahead / behind. If behind, decide whether to rebase before splitting.

## Execution

Hand off to the `git-master` role via the Task tool:

```
Task(
  subagent_type: "git-master",
  description: "Atomic git operation: <task>",
  prompt: """
    {git-master role prompt from ~/.cursor/omr-prompts/git-master.md}

    --- ASSIGNMENT ---
    Task: {{ARGUMENTS}}

    Pre-flight summary:
    - Branch: <current branch>
    - Working tree: <git status --short summary>
    - Recent commits: <last 3-5 commit subjects>
    - Detected style: <if known>

    Constraints:
    - Never operate on main/master directly without explicit user approval.
    - Never use --force; always --force-with-lease.
    - Never push to remote unless the user explicitly says push.
    - Stash dirty unrelated files before rebasing.
    - .omr/plans/ files are read-only.
    - Match the existing commit style detected from `git log -30`.
  """
)
```

The role will:

1. Detect commit style from the last 30 commits.
2. Analyze changes via `git status` + `git diff --stat`.
3. Split by logical concern (different dirs, different modules, independently revertable).
4. Create atomic commits in dependency order with style-matched messages.
5. Verify by showing `git log` as evidence.

## Splitting heuristic

The role uses this guide; surface it to the user when proposing a split:

| Files changed | Suggested commits |
|---|---|
| 1-2 files | 1 commit |
| 3+ files | Split into 2+ commits |
| 5+ files | Split into 3+ commits |
| 10+ files | Split into 5+ commits |

Within each tier, split when:

- Files belong to **different directories or modules**.
- Files belong to **different component types** (e.g., backend vs frontend, code vs docs).
- One commit could be **independently reverted** without breaking another.

## Common operations

### Split current working tree into atomic commits

```text
$omr-git-master "split current changes into atomic commits with style-matched messages"
```

### Rebase last N commits to clean up

```text
$omr-git-master "interactively rebase the last 5 commits to squash fixups and reorder by concern"
```

### Update a commit message to match style

```text
$omr-git-master "rewrite the last commit's message to match the project's semantic style"
```

### Pre-PR cleanup

```text
$omr-git-master "clean up branch before PR — squash fixups, atomic split, style-matched messages"
```

## Safety rails

The git-master role inherits these constraints from its prompt; this skill amplifies them:

- **Never** rebase `main` or `master`.
- **Never** use `--force` — always `--force-with-lease`.
- **Never** push to remote unless the user explicitly says push.
- **Never** commit without explicit user request (personal-coding-habits).
- **Never** skip hooks (`--no-verify`, `--no-gpg-sign`) unless the user explicitly requests it.
- **Stash** dirty unrelated files before rebasing.

If the user requests a destructive operation (force push to shared branch, hard reset on main, etc.), use AskQuestion to confirm explicitly before proceeding.

## Showing the result

After the role completes, surface to the user:

```markdown
## Git operation complete

**Style detected**: semantic (feat:, fix:) / plain / short — language: <lang>

**Commits created**:
1. `abc1234` — feat(auth): add JWT refresh — 3 files
2. `def5678` — test(auth): cover refresh edge cases — 2 files
3. `ghi9012` — docs(auth): document refresh flow — 1 file

**Verification**:
\`\`\`
<git log --oneline output for the new commits>
\`\`\`

**Next step**: review the commits with `git log -p HEAD~3..HEAD`. Push when ready (not done automatically).
```

## State Management

This skill is short-lived; state tracking is light:

- **On start**: `state_write({ mode: "git-master", active: true, started_at: "<now>", task: "<task>" })`
- **On completion**: `state_write({ mode: "git-master", active: false, completed_at: "<now>", commits_created: <n> })`

## Anti-patterns

- Do NOT push automatically after committing — let the user review the diff first.
- Do NOT bundle unrelated changes into one commit because "they're small".
- Do NOT use generic messages like `fix` or `update` — match the project style.
- Do NOT operate on `main` / `master` without explicit user approval.
- Do NOT use `--force` — always `--force-with-lease`.
- Do NOT skip the pre-flight checklist — secrets in the diff are the most expensive mistake.

## Scenario examples

**Good**: User has 8 changed files spanning auth, frontend, and docs. Pre-flight detects semantic commit style. Role splits into 3 atomic commits: `feat(auth): ...`, `feat(ui): ...`, `docs(auth): ...`. Commits shown to user with `git log --oneline` output. User reviews and pushes manually.

**Good**: User asks to rebase. Pre-flight detects you're on `main` — abort and ask for explicit approval before rebasing.

**Bad**: Skill commits and pushes in one go without showing the user the diff.

**Bad**: Skill bundles auth changes + frontend changes + docs into one commit "to keep the log short".

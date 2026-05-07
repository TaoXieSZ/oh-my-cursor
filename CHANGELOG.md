# Changelog

All notable changes to oh-my-cursor (OMR) are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project tracks [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — `omr setup` migrates legacy `.omc/` project state automatically

Running `omr setup --scope project` in a directory left over from a pre-rename
oh-my-cursor install now detects the legacy `.omc/` state directory and
performs the right action up-front (before installing rules / skills / hooks):

- `.omc/` exists, `.omr/` doesn't → `mv .omc/ .omr/` (data preserved). Renames
  the embedded `omc-config.json` to `omr-config.json` so the config file
  matches the new layout.
- `.omc/` exists, `.omr/` exists too → `mv .omc/ .omc.bak/` so the new install
  is not overwritten and the user can merge manually.
- `.omc/` exists but `.omc.bak/` already exists → leave `.omc/` alone with a
  warning, so a second setup run never clobbers the first backup.
- `.omc/` exists but doesn't look like an OMR state dir (no
  `setup-scope.json`, no `omc-config.json`, no `state/`/`plans/`/`logs/`)
  → leave it untouched with a warning. Avoids touching unrelated user data.

Skipped entirely under `--scope user`. Full coverage in `cli.test.ts` (4 new
test cases for the four branches above).

### Added — Five new skills ported from oh-my-codex 0.16.0

OMR ports five high-value skills from upstream oh-my-codex, adapted to
Cursor conventions (`.omr/`, `omr` CLI, `$forge` instead of `$ralph`,
Cursor MCP / Task tool instead of tmux):

- **`/omr-ralplan`** — consensus planning with a Planner→Architect→Critic
  loop and the **vague-execution gate** that intercepts under-specified
  `$forge` / `$team` / `$autopilot` requests and routes them through
  planning first. Sits alongside `/omr-blueprint` for high-risk or
  multi-approach work. Writes ADR + staffing roster into the PRD.

- **`/omr-ai-slop-cleaner`** — regression-tests-first cleanup workflow with
  fallback inventory, smell categorization (duplication / dead code /
  needless abstraction / boundary violations / missing tests), and one
  smell pass at a time with verification between passes. Wraps the
  existing `code-simplifier` role with structured rails.

- **`/omr-wiki`** — persistent markdown project knowledge base under
  `.omr/wiki/` with categories (`architecture`, `decision`, `pattern`,
  `debugging`, `environment`, `session-log`, `reference`, `convention`),
  `[[wiki-link]]` cross-references, and keyword + tag search via the
  `omr-state` MCP. Complements the milestone journal: journal records
  *what happened when*, wiki captures *what we now know*.

- **`/omr-ask`** — external CLI second opinion (claude / codex / gemini)
  with mandatory artifact capture under `.omr/artifacts/`. Includes a
  multi-model "tribunal" pattern for high-stakes decisions.

- **`/omr-git-master`** — direct entry point to the `git-master` role with
  pre-flight checks (secrets scan, branch verification, working tree
  state) and atomic commit splitting heuristics. Saves you from
  remembering the role-routing keywords.

### Changed — Workflow rules

- `omr-orchestration.mdc` `/skills` table and keyword-detection table
  now include the five new skills.
- `omr-workflow.mdc` Stage 2 (Plan) documents both `$blueprint` and
  `$ralplan` and when to choose each.
- The "Entry point selection" table now covers slop cleanup, second
  opinions, git operations, and wiki management.
- `src/cli/skills.ts` categorizes the new skills into Core Path
  (`omr-ralplan`), Supporting Tools (`omr-ai-slop-cleaner`, `omr-ask`),
  and Optional Extras (`omr-git-master`, `omr-wiki`).
- `src/cli/__tests__/cli.test.ts` skill-list assertion updated to cover
  the new skills.

### Added — Team chatter in chat

OMR's `/omr-team` dispatch is now visible in the main Cursor chat session,
similar to the multi-pane experience in oh-my-codex. The team feels like a
team instead of a silent set of subagents.

- **Blackboard core** (`src/state/blackboard.ts`)
  - `BlackboardMessage` gains optional `lane` and `role` fields so each post
    carries enough context to render a lane status table and a chronological
    chatter log.
  - `tailSince(cursor)` — incremental polling helper for the leader's standup
    loop. Returns new messages plus a `nextCursor` to feed back on the next
    call.
  - `formatLine(msg)` — canonical one-line renderer
    `[HH:MM:SS] <lane>·<role>  <kind>  <content>` shared by chat, transcript,
    and CLI surfaces.
  - `writeTranscript(runId)` — saves a per-run markdown transcript to
    `.omr/state/team/<runId>-transcript.md`.

- **Role-registry partials** (`src/state/role-registry.ts`)
  - `discoverRoles` now skips files whose basename starts with `_`, treating
    them as shared partials rather than standalone roles.
  - `loadTeamProtocol(promptsDirs)` and `withTeamProtocol(role, promptsDirs)`
    inject the new `_team-protocol.md` partial into a role's prompt at
    dispatch time, so any role can be used as a team lane without editing
    individual role files.

- **Shared team protocol** (`prompts/_team-protocol.md`)
  - New partial that defines required blackboard posts for team lanes:
    `start`, `claim`, `progress`, `handoff`, `blocker`, `release`, `complete`.
  - Mandates `lane` and `role` on every post and limits content to short
    status lines.

- **`/omr-team` skill** (`skills/omr-team/SKILL.md`)
  - Phase 3 documents how the leader injects `_team-protocol.md` and stamps
    `TEAM_LANE_ID`/`TEAM_ROLE_NAME` on each lane brief.
  - New "Chat rendering protocol" section: the leader runs a standup loop
    that polls the blackboard and renders **two blocks** in chat — a compact
    lane status table for at-a-glance state, plus a chronological team
    chatter log — until every lane releases or completes.
  - Phase 4 saves the transcript via `team_transcript_write` for post-run
    review.

- **`omr team watch` CLI** (`src/cli/team.ts`)
  - New `omr team watch [--run <id>] [--no-follow]` command that tails
    `.omr/state/blackboard.jsonl` in a side terminal with role-colored
    output, providing a tmux-pane-like experience alongside the in-chat
    rendering.

### Tests

- New tests cover `tailSince` cursor advancement, `formatLine` output,
  `writeTranscript` filtering, partial discovery / injection, and the
  `omr team watch` CLI. Full suite passes (`npm test`).

# Changelog

All notable changes to oh-my-cursor (OMC) are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project tracks [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Team chatter in chat

OMC's `/omc-team` dispatch is now visible in the main Cursor chat session,
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
    `.omc/state/team/<runId>-transcript.md`.

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

- **`/omc-team` skill** (`skills/omc-team/SKILL.md`)
  - Phase 3 documents how the leader injects `_team-protocol.md` and stamps
    `TEAM_LANE_ID`/`TEAM_ROLE_NAME` on each lane brief.
  - New "Chat rendering protocol" section: the leader runs a standup loop
    that polls the blackboard and renders **two blocks** in chat — a compact
    lane status table for at-a-glance state, plus a chronological team
    chatter log — until every lane releases or completes.
  - Phase 4 saves the transcript via `team_transcript_write` for post-run
    review.

- **`omc team watch` CLI** (`src/cli/team.ts`)
  - New `omc team watch [--run <id>] [--no-follow]` command that tails
    `.omc/state/blackboard.jsonl` in a side terminal with role-colored
    output, providing a tmux-pane-like experience alongside the in-chat
    rendering.

### Tests

- New tests cover `tailSince` cursor advancement, `formatLine` output,
  `writeTranscript` filtering, partial discovery / injection, and the
  `omc team watch` CLI. Full suite passes (`npm test`).

---
name: omr-wiki
description: Persistent project knowledge base under .omr/wiki/ — structured markdown pages with categories, tags, [[wiki-links]], and keyword search. Complements the milestone journal with durable, queryable knowledge.
argument-hint: "[add|query|read|list|delete|lint|refresh] [arguments]"
---

# Wiki — Persistent Project Knowledge Base

A self-maintained markdown knowledge base for project knowledge that should compound across sessions. Where `milestone-journal` is an append-only timeline (流水账), wiki is a queryable, structured library of pages organized by category and tag.

## When to use

- A discovered architecture, decision, pattern, or debugging note will be useful weeks or months later.
- Information needs to be **looked up by keyword or tag**, not just read chronologically.
- Multiple sessions need to share the same body of knowledge.
- A pattern shows up 3+ times — promote it from milestone journal to a wiki page.

## When NOT to use

- One-off observation that doesn't need re-reading — use the milestone journal.
- Project-wide policy that should bind agent behavior — promote to a `.cursor/rules/*.mdc` rule.
- Code that should live in source — write the code, not a wiki page about it.

## Difference from milestone-journal

| | `milestone-journal` | `omr-wiki` |
|---|---|---|
| Shape | Append-only timeline | Curated pages by topic |
| Access | Read chronologically | Query by keyword + tag + category |
| Lifecycle | Add only | Add / read / update / delete |
| Granularity | One milestone per record | One topic per page (can grow) |
| Cross-reference | Implicit (same project) | Explicit `[[wiki-link]]` |

Use both: journal captures *what happened when*, wiki captures *what we now know*.

## Storage

```
.omr/wiki/
├── index.md          # Auto-maintained index of all pages
├── log.md            # Audit log of add / update / delete operations
└── *.md              # Individual wiki pages (one per topic)
```

Each page has YAML frontmatter:

```yaml
---
title: Authentication Architecture
slug: auth-architecture
category: architecture
tags: [auth, security, jwt]
created_at: 2026-05-06T13:00:00Z
updated_at: 2026-05-06T13:00:00Z
---
```

## Categories

Use one of:

| Category | Use for |
|---|---|
| `architecture` | System design, component layout, data flow |
| `decision` | ADR-style decisions with rationale |
| `pattern` | Reusable code or design patterns observed in the codebase |
| `debugging` | Solved bugs and how they were diagnosed |
| `environment` | Setup steps, required env vars, tooling quirks |
| `session-log` | Session-end auto-captures (lifecycle) |
| `reference` | External API references, command cheatsheets |
| `convention` | Naming, formatting, project-specific style |

## Operations

Wiki operations are exposed via the `omr-state` MCP server. Skill-level operations:

### Add / Ingest a page

```text
wiki_ingest({
  title: "Auth Architecture",
  content: "## Overview\n\nWe use JWT with refresh tokens...\n\nSee [[token-rotation]] for rotation strategy.",
  tags: ["auth", "security"],
  category: "architecture"
})
```

### Query

```text
wiki_query({ query: "authentication", tags: ["auth"], category: "architecture" })
```

Query uses **keyword + tag matching** only — no vector embeddings. Match is on title, tags, category, and full-text body.

### Read a specific page

```text
wiki_read({ page: "auth-architecture" })
```

### List all pages

```text
wiki_list()
```

### Delete an outdated page

```text
wiki_delete({ page: "outdated-page" })
```

### Lint

```text
wiki_lint()
```

Checks for:
- Broken `[[wiki-link]]` references
- Pages without category or tags
- Duplicate slugs
- Orphan pages (not referenced anywhere)

### Refresh index

```text
wiki_refresh()
```

Rebuilds `index.md` from current pages.

## Cross-references

Use `[[page-slug]]` syntax inside any page body to link to another wiki page. Lint will warn if the target doesn't exist.

```markdown
We use JWT (see [[auth-architecture]]) with rotation handled by [[token-rotation]].
```

## Auto-capture (optional)

At session end, the OMR stop hook can capture session discoveries as `session-log-{YYYYMMDDTHHMMSS}` pages. Configure in `.omr/omr-config.json`:

```json
{
  "wiki": {
    "autoCapture": true,
    "autoCaptureCategory": "session-log"
  }
}
```

When enabled, the agent should write a brief end-of-session wiki page summarizing decisions made, patterns spotted, and open questions — not raw transcript.

## Promotion path

Wiki sits between milestone-journal and `.cursor/rules/*.mdc`:

```
milestone-journal  →  omr-wiki  →  .cursor/rules
   (one event)        (curated      (binding behavior
                       knowledge)    for the agent)
```

When the same lesson appears 3+ times in milestone-journal, promote to a wiki page. When a wiki page describes a pattern the agent should always follow, propose promotion to a `.cursor/rules` file.

## State Management

Use `omr-state` MCP for wiki lifecycle:

- **On add**: `wiki_ingest` writes the page, updates `index.md`, appends to `log.md`.
- **On update**: rewrites the page in place, bumps `updated_at`, appends to `log.md`.
- **On delete**: removes the page, removes from `index.md`, appends to `log.md`.

No mode state is needed — wiki is a passive store, not a workflow mode.

## Hard constraints

- **No vector embeddings** — queries use keyword + tag matching only. Keep wiki searchable with grep.
- **Local only** — wiki pages stay under `.omr/wiki/` in the project. Never sync to remote unless the user explicitly asks.
- **One topic per page** — split a page when it grows past ~300 lines or covers >1 topic.
- **Slugs are immutable** — once a page is created, its slug stays stable (so `[[wiki-link]]` references don't break). Title can change.

## Anti-patterns

- Do NOT use wiki as a session notepad — that's `.omr/notepad.md`.
- Do NOT dump conversation transcripts into wiki — extract the lesson.
- Do NOT create a wiki page for every milestone — only promote recurring or high-value knowledge.
- Do NOT add pages without category or tags — they become invisible to query.
- Do NOT link to non-existent pages without creating them — lint will flag.

## Scenario examples

**Good**: After debugging a tricky CORS issue, add a `debugging` page titled "CORS preflight failures with credentials" with the symptoms, root cause, fix, and a `[[cors-architecture]]` link.

**Good**: After three sessions hit the same Chef proxy issue, promote the milestone-journal entries into one `debugging` wiki page, then propose adding a Chef-proxy hint to `~/.cursor/knowledge/general-sre-knowledge.md`.

**Bad**: Create a wiki page after every conversation that just summarizes the chat — this is noise, not knowledge.

**Bad**: Use wiki to store a TODO list — that belongs in `notepad.md` or a real task tracker.

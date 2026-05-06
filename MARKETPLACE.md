# Cursor Marketplace Plugin Packaging

This document tracks what's needed to publish oh-my-cursor as a Cursor Marketplace plugin.

## Current status: Draft

The `.cursor-plugin/plugin.json` manifest exists. The plugin components are structured for marketplace compatibility.

## Plugin components bundled

| Component | Path | Count | Notes |
|-----------|------|-------|-------|
| Rules | `rules/*.mdc` | 4 | Orchestration, workflow, state, interactive options |
| Skills | `skills/omr-*/SKILL.md` | 12 | Core workflow + supporting skills |
| Prompts | `prompts/*.md` | 20 | Role prompts with mode/complexity metadata |
| Hooks | `hooks/*.mjs` | 2 | Session start/end lifecycle automation |
| MCP Servers | `src/mcp/` | 2 | omr-state (14 tools), omr-memory (5 tools) |

## Pre-submission checklist

- [ ] Plugin name `oh-my-cursor` is unique in the marketplace
- [ ] All `.mdc` files have valid frontmatter with `description` and `alwaysApply`
- [ ] All `SKILL.md` files have valid frontmatter with `name` and `description`
- [ ] All role prompts have `name`, `description`, `complexity`, `posture`, `mode`
- [ ] Logo file committed at `.cursor-plugin/logo.png` (256x256 recommended)
- [ ] `plugin.json` passes validation (`cursor plugin validate`)
- [ ] MCP servers build and run correctly (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] README reflects the current feature set
- [ ] Version bumped appropriately

## Architecture for marketplace

The marketplace install should replicate what `omr setup` does:

1. Rules → copied to user or project `.cursor/rules/`
2. Skills → copied to `.cursor/skills/`
3. Prompts → copied to `~/.cursor/omr-prompts/` or `.omr/prompts/`
4. Hooks → copied to `~/.cursor/hooks/omr/`, registered in `hooks.json`
5. MCP → registered in `mcp.json` with correct server paths
6. State dirs → `.omr/` created in project root

The `omr` CLI remains available as an optional companion tool for:
- `omr dashboard` — live web dashboard
- `omr archive` / `omr archives` — session archiving
- `omr notify` — Slack notifications
- `omr doctor` — health checks

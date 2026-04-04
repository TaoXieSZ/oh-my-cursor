# Contributing to oh-my-cursor

Thanks for your interest in contributing! This guide covers how to get started.

## Development setup

```bash
git clone https://github.com/TaoXieSZ/oh-my-cursor.git
cd oh-my-cursor
npm install
npm run build
npm test
```

Requirements: Node.js 20+.

## Project structure

```
src/
├── cli/          # omc CLI commands (setup, doctor, status, dashboard)
├── mcp/          # MCP servers (omc-state, omc-memory)
├── state/        # State management runtime (paths, mode lifecycle, session)
└── utils/        # Shared utilities (fs, paths, log)
rules/            # Cursor rules (.mdc files)
skills/           # Cursor skills (SKILL.md per skill)
prompts/          # Agent role prompts (markdown)
templates/        # Starter templates for custom skills, prompts, configs
```

## How to contribute

### Adding a new skill

1. Copy `templates/skill/SKILL.md` to `skills/omc-<name>/SKILL.md`
2. Fill in the skill definition following the template
3. Add keyword routing to `rules/omc-orchestration.mdc`
4. Update the Skills reference table in `README.md`

### Adding a new role prompt

1. Copy `templates/prompt/role.md` to `prompts/<role>.md`
2. Fill in the four sections: `<identity>`, `<constraints>`, `<execution_loop>`, `<output_contract>`
3. Add the role to the catalog in `rules/omc-orchestration.mdc`
4. Update the Roles section in `README.md`

### Adding a CLI command

1. Create `src/cli/<command>.ts`
2. Add the command to the switch in `src/cli/index.ts`
3. Add tests in `src/cli/__tests__/<command>.test.ts`
4. Update help text and `README.md`

### Fixing a bug or improving code

1. Create a branch: `git checkout -b fix/description`
2. Make your changes
3. Run `npm test` — all tests must pass
4. Run `npm run lint` — no type errors
5. Open a PR with a clear description

## Testing

```bash
npm test          # Build + run all tests
npm run test:quick # Run tests without rebuild (after manual build)
npm run lint      # TypeScript type check only
```

Tests use Node.js built-in `node:test` — no test framework needed.

Every PR must pass all tests. Add tests for new functionality.

## Code style

- TypeScript with strict mode
- ESM modules (`import`/`export`)
- No runtime dependencies beyond `@modelcontextprotocol/sdk`
- Prefer Node.js built-in modules
- No comments that just narrate what code does
- Keep functions small and focused

## Commit messages

Use conventional commits:

```
feat: add new skill for X
fix: handle edge case in timeAgo
docs: update README skills table
test: add tests for dashboard collectState
refactor: simplify mode state lifecycle
```

## Pull request checklist

- [ ] `npm test` passes (all tests green)
- [ ] `npm run lint` passes (no type errors)
- [ ] New features have tests
- [ ] README updated if user-facing behavior changed
- [ ] Skill/rule changes reflected in orchestration rule

## Questions?

Open an issue on [GitHub](https://github.com/TaoXieSZ/oh-my-cursor/issues).

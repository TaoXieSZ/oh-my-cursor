# OMC Templates

Starter templates for extending oh-my-cursor.

## Contents

### `skill/SKILL.md`

Template for creating a custom OMC skill. Copy to your skills directory and modify:

```bash
cp -r templates/skill ~/.cursor/skills/omc-my-skill
```

### `prompt/role.md`

Template for creating a custom role prompt. Copy and modify:

```bash
cp templates/prompt/role.md prompts/my-role.md
```

Then add the role to `omc-orchestration.mdc`'s routing table.

### `init/omc-config.json`

Reference configuration for OMC project settings. This file documents the available configuration options — it is not currently read by the CLI but serves as a schema reference for future versions.

## Creating a custom skill

1. Copy `skill/SKILL.md` to `~/.cursor/skills/omc-<name>/SKILL.md`
2. Update the frontmatter (`name`, `description`, `argument-hint`)
3. Write the execution protocol
4. Add a keyword trigger to `omc-orchestration.mdc` if desired

## Creating a custom role prompt

1. Copy `prompt/role.md` to `prompts/<name>.md`
2. Fill in `<identity>`, `<constraints>`, `<execution_loop>`, `<output_contract>`
3. Set `complexity` (low/standard/high) and `posture` (deep-worker/read-only/fast-lane)
4. Add to the role catalog in `omc-orchestration.mdc`
5. Run `omc setup` to install

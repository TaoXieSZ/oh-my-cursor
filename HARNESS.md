# OMC Product Guardrails

`oh-my-cursor` should stay closer to `oh-my-codex` and `oh-my-claudecode` than to a full agent platform.

## Core promise

OMC should do one thing extremely well:

- preserve durable context across Cursor sessions

That means the core product is:

- `omc setup`
- `omc doctor`
- `.omc/` as the durable home for plans, notes, logs, and memory
- a narrow workflow spine: `deep-interview`, `blueprint`, `forge`, `cancel`

## What is optional

These can exist, but they should not define the product:

- dashboards
- scheduling
- notifications
- advanced MCP coordination
- multi-agent/team orchestration
- highly autonomous workflows

If they grow, they should be treated as optional extras, advanced surfaces, or eventually separate packages.

## Simplicity rule

When deciding whether something belongs in OMC core, use this test:

1. Does it directly strengthen durable context or the core workflow spine?
2. Can it be explained to a new user in one or two sentences?
3. Would OMC still feel coherent if this feature were absent?

If the answer is `no` to the first two, or `yes` to the third, it probably does not belong in core.

## Product direction rules

- Prefer small defaults over broad capability.
- Prefer file conventions over runtime machinery.
- Prefer optional extras over platform expansion.
- Prefer a shorter explanation over a richer feature matrix.
- Prefer downstream specialization outside OMC core.

## Working loop

When changing OMC, keep the loop simple:

1. Start from `README.md`, `CONTRIBUTING.md`, this file, and `.omc/`.
2. Ask whether the change makes durable context or the core workflow path better.
3. If it mainly adds orchestration, observability, or automation surface area, treat it as optional first.
4. Keep the public story compact enough that a new user can understand OMC quickly.

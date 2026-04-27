/**
 * Role registry — discovers, parses, and composes role prompts.
 * Supports inheritance via the `extends` frontmatter field and
 * composition by merging multiple role constraints.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

export interface RoleMetadata {
  name: string;
  description: string;
  complexity: "low" | "standard" | "high";
  posture: "read-only" | "deep-worker" | "fast-lane";
  mode: "readonly" | "agent";
  model?: string;
  extends?: string;
}

export interface Role {
  metadata: RoleMetadata;
  content: string;
  filePath: string;
}

function mergeInheritedRole(base: Role, child: Role): Role {
  const baseBody = parseRoleFrontmatter(base.content).body.trim();
  const childBody = parseRoleFrontmatter(child.content).body.trim();
  const mergedBody = [baseBody, childBody].filter(Boolean).join("\n\n");

  return {
    ...child,
    metadata: {
      ...base.metadata,
      ...child.metadata,
      name: child.metadata.name,
      extends: child.metadata.extends,
    },
    content: mergedBody,
  };
}

/**
 * Parse YAML frontmatter from a role prompt file.
 * Handles the simple key: value format used in role prompts.
 */
export function parseRoleFrontmatter(raw: string): { metadata: Partial<RoleMetadata>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: raw };

  const frontmatter = match[1];
  const body = match[2];
  const metadata: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*"?(.+?)"?\s*$/);
    if (kv) {
      metadata[kv[1]] = kv[2];
    }
  }

  return {
    metadata: metadata as unknown as Partial<RoleMetadata>,
    body,
  };
}

/**
 * Load a single role from a file path.
 */
export function loadRole(filePath: string): Role | null {
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  const { metadata, body } = parseRoleFrontmatter(raw);

  if (!metadata.name) return null;

  return {
    metadata: {
      name: metadata.name,
      description: metadata.description ?? "",
      complexity: (metadata.complexity ?? "standard") as RoleMetadata["complexity"],
      posture: (metadata.posture ?? "deep-worker") as RoleMetadata["posture"],
      mode: (metadata.mode ?? "agent") as RoleMetadata["mode"],
      model: metadata.model,
      extends: metadata.extends,
    },
    content: raw,
    filePath,
  };
}

/**
 * Discover all role prompts in a directory.
 *
 * Files whose basename begins with `_` are treated as shared partials (e.g.
 * `_team-protocol.md`) and skipped — they are not standalone roles.
 */
export function discoverRoles(promptsDir: string): Role[] {
  if (!existsSync(promptsDir)) return [];

  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".md") && !basename(f).startsWith("_"));
  const roles: Role[] = [];

  for (const file of files) {
    const role = loadRole(join(promptsDir, file));
    if (role) roles.push(role);
  }

  return roles;
}

/**
 * Load the shared `_team-protocol.md` partial from the first prompts dir
 * that contains it. Returns the partial body (without YAML frontmatter if
 * any) or `null` when the file is missing.
 */
export function loadTeamProtocol(promptsDirs: string[]): string | null {
  for (const dir of promptsDirs) {
    const path = join(dir, "_team-protocol.md");
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf-8");
    const { body } = parseRoleFrontmatter(raw);
    return body.trim() || raw.trim();
  }
  return null;
}

/**
 * Append the team-protocol partial to a role's body so the subagent knows to
 * post its claim / progress / handoff / release events to the blackboard.
 * Use this when composing the lane prompt for an `/omc-team` dispatch — the
 * unmodified role is still returned to single-owner callers like `/omc-forge`.
 */
export function withTeamProtocol(role: Role, promptsDirs: string[]): string {
  const protocol = loadTeamProtocol(promptsDirs);
  if (!protocol) return role.content;
  return `${role.content.trimEnd()}\n\n${protocol}\n`;
}

/**
 * Resolve role inheritance. If a role has `extends: base-role`,
 * its content is prepended with the base role's content.
 */
export function resolveInheritance(role: Role, promptsDir: string, visiting: Set<string> = new Set()): Role {
  if (!role.metadata.extends) return role;
  if (visiting.has(role.metadata.name)) return role;
  visiting.add(role.metadata.name);

  try {
    const basePath = join(promptsDir, `${role.metadata.extends}.md`);
    const baseRole = loadRole(basePath);
    if (!baseRole) return role;

    const resolvedBase = resolveInheritance(baseRole, promptsDir, visiting);
    return mergeInheritedRole(resolvedBase, role);
  } finally {
    visiting.delete(role.metadata.name);
  }
}

/**
 * Compose two roles into a combined prompt.
 * Useful for `$team` when assigning hybrid roles like "security + api reviewer".
 */
export function composeRoles(roles: Role[]): string {
  if (roles.length === 0) return "";
  if (roles.length === 1) return roles[0].content;

  const parts = roles.map((r) => {
    const { body } = parseRoleFrontmatter(r.content);
    return `## Role: ${r.metadata.name}\n\n${body.trim()}`;
  });

  return `# Composed Role\n\nYou are operating with multiple role profiles. Follow all constraints from each role.\n\n${parts.join("\n\n---\n\n")}`;
}

/**
 * Build a role registry from multiple search paths.
 * Later paths override earlier ones (project scope overrides user scope).
 */
export function buildRegistry(promptsDirs: string[]): Map<string, Role> {
  const registry = new Map<string, Role>();

  for (const dir of promptsDirs) {
    const roles = discoverRoles(dir);
    for (const role of roles) {
      registry.set(role.metadata.name, role);
    }
  }

  const cache = new Map<string, Role>();
  const resolving = new Set<string>();

  function resolveByName(name: string): Role | null {
    if (cache.has(name)) return cache.get(name)!;
    const role = registry.get(name);
    if (!role) return null;
    if (!role.metadata.extends) {
      cache.set(name, role);
      return role;
    }
    if (resolving.has(name)) {
      return role;
    }

    resolving.add(name);
    const base = resolveByName(role.metadata.extends);
    resolving.delete(name);

    const resolved = base ? mergeInheritedRole(base, role) : role;
    cache.set(name, resolved);
    return resolved;
  }

  for (const name of Array.from(registry.keys())) {
    const resolved = resolveByName(name);
    if (resolved) {
      registry.set(name, resolved);
    }
  }

  return registry;
}

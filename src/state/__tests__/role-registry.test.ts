import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseRoleFrontmatter,
  loadRole,
  discoverRoles,
  resolveInheritance,
  composeRoles,
  buildRegistry,
  loadTeamProtocol,
  withTeamProtocol,
} from "../role-registry.js";

describe("role-registry", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "omc-role-test-"));
  });

  afterEach(() => {
    try { rmSync(tempDir, { recursive: true }); } catch { /* ignore */ }
  });

  it("parseRoleFrontmatter extracts metadata and body", () => {
    const raw = `---
name: executor
description: "Implementation agent"
complexity: standard
posture: deep-worker
mode: agent
---

<identity>You are Executor.</identity>`;

    const { metadata, body } = parseRoleFrontmatter(raw);
    assert.equal(metadata.name, "executor");
    assert.equal(metadata.complexity, "standard");
    assert.equal(metadata.mode, "agent");
    assert.ok(body.includes("<identity>"));
  });

  it("parseRoleFrontmatter handles missing frontmatter", () => {
    const raw = "Just a plain file.";
    const { metadata, body } = parseRoleFrontmatter(raw);
    assert.deepEqual(metadata, {});
    assert.equal(body, raw);
  });

  it("loadRole returns role object from file", () => {
    const content = `---
name: test-role
description: "Test"
complexity: low
posture: read-only
mode: readonly
---

<identity>Test role.</identity>`;

    const filePath = join(tempDir, "test-role.md");
    writeFileSync(filePath, content);

    const role = loadRole(filePath);
    assert.ok(role);
    assert.equal(role.metadata.name, "test-role");
    assert.equal(role.metadata.mode, "readonly");
    assert.equal(role.metadata.complexity, "low");
  });

  it("loadRole returns null for missing file", () => {
    const role = loadRole(join(tempDir, "nonexistent.md"));
    assert.equal(role, null);
  });

  it("discoverRoles finds all .md files in directory", () => {
    const roles = [
      { name: "role-a", content: '---\nname: role-a\ndescription: "A"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\nBody A' },
      { name: "role-b", content: '---\nname: role-b\ndescription: "B"\ncomplexity: low\nposture: read-only\nmode: readonly\n---\n\nBody B' },
    ];

    for (const r of roles) {
      writeFileSync(join(tempDir, `${r.name}.md`), r.content);
    }

    const discovered = discoverRoles(tempDir);
    assert.equal(discovered.length, 2);
    const names = discovered.map((r) => r.metadata.name).sort();
    assert.deepEqual(names, ["role-a", "role-b"]);
  });

  it("discoverRoles returns empty for missing directory", () => {
    assert.deepEqual(discoverRoles(join(tempDir, "nope")), []);
  });

  it("composeRoles merges multiple role contents", () => {
    const role1 = loadRole(join(tempDir, "a.md"));
    const role2 = loadRole(join(tempDir, "b.md"));

    // Create files first
    writeFileSync(join(tempDir, "a.md"), '---\nname: security-reviewer\ndescription: "Sec"\ncomplexity: high\nposture: read-only\nmode: readonly\n---\n\n<identity>Security</identity>');
    writeFileSync(join(tempDir, "b.md"), '---\nname: api-reviewer\ndescription: "API"\ncomplexity: standard\nposture: read-only\nmode: readonly\n---\n\n<identity>API</identity>');

    const roles = discoverRoles(tempDir);
    const composed = composeRoles(roles);

    assert.ok(composed.includes("# Composed Role"));
    assert.ok(composed.includes("## Role: security-reviewer") || composed.includes("## Role: api-reviewer"));
  });

  it("composeRoles returns single role content for one role", () => {
    writeFileSync(join(tempDir, "single.md"), '---\nname: single\ndescription: "S"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\nBody');
    const roles = discoverRoles(tempDir);
    const composed = composeRoles(roles);
    assert.ok(composed.includes("Body"));
    assert.ok(!composed.includes("# Composed Role"));
  });

  it("buildRegistry merges from multiple directories", () => {
    const dir1 = join(tempDir, "user");
    const dir2 = join(tempDir, "project");
    mkdirSync(dir1, { recursive: true });
    mkdirSync(dir2, { recursive: true });

    writeFileSync(join(dir1, "executor.md"), '---\nname: executor\ndescription: "User executor"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\nUser version');
    writeFileSync(join(dir2, "executor.md"), '---\nname: executor\ndescription: "Project executor"\ncomplexity: high\nposture: deep-worker\nmode: agent\n---\n\nProject version');

    const registry = buildRegistry([dir1, dir2]);
    const executor = registry.get("executor");
    assert.ok(executor);
    assert.equal(executor.metadata.description, "Project executor");
  });

  it("parseRoleFrontmatter handles extends field", () => {
    const raw = `---
name: secure-executor
description: "Security-focused executor"
complexity: high
posture: deep-worker
mode: agent
extends: executor
---

<identity>Secure executor.</identity>`;

    const { metadata } = parseRoleFrontmatter(raw);
    assert.equal(metadata.extends, "executor");
  });

  it("resolveInheritance prepends base role body", () => {
    writeFileSync(
      join(tempDir, "executor.md"),
      '---\nname: executor\ndescription: "Base"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\n<identity>Base identity</identity>'
    );
    writeFileSync(
      join(tempDir, "secure-executor.md"),
      '---\nname: secure-executor\ndescription: "Child"\ncomplexity: high\nposture: deep-worker\nmode: agent\nextends: executor\n---\n\n<constraints>Security constraints</constraints>'
    );

    const child = loadRole(join(tempDir, "secure-executor.md"));
    assert.ok(child);
    const resolved = resolveInheritance(child!, tempDir);
    assert.ok(resolved.content.includes("Base identity"));
    assert.ok(resolved.content.includes("Security constraints"));
    assert.equal(resolved.metadata.complexity, "high");
  });

  it("discoverRoles skips underscore-prefixed partials", () => {
    writeFileSync(
      join(tempDir, "executor.md"),
      '---\nname: executor\ndescription: "Base"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\n<identity>Base</identity>'
    );
    writeFileSync(
      join(tempDir, "_team-protocol.md"),
      "<team_protocol>Do not load as a role</team_protocol>"
    );
    const roles = discoverRoles(tempDir);
    assert.equal(roles.length, 1);
    assert.equal(roles[0].metadata.name, "executor");
  });

  it("loadTeamProtocol returns the partial body", () => {
    writeFileSync(
      join(tempDir, "_team-protocol.md"),
      "<team_protocol>\nPost claim/progress/release to blackboard.\n</team_protocol>"
    );
    const body = loadTeamProtocol([tempDir]);
    assert.ok(body);
    assert.ok(body!.includes("Post claim"));
  });

  it("loadTeamProtocol prefers the first matching dir", () => {
    const dir1 = join(tempDir, "user");
    const dir2 = join(tempDir, "project");
    mkdirSync(dir1, { recursive: true });
    mkdirSync(dir2, { recursive: true });
    writeFileSync(join(dir1, "_team-protocol.md"), "<team_protocol>user-level</team_protocol>");
    writeFileSync(join(dir2, "_team-protocol.md"), "<team_protocol>project-level</team_protocol>");
    const body = loadTeamProtocol([dir1, dir2]);
    assert.ok(body!.includes("user-level"));
  });

  it("loadTeamProtocol returns null when the partial is missing", () => {
    assert.equal(loadTeamProtocol([tempDir]), null);
  });

  it("withTeamProtocol appends the partial to a role body", () => {
    writeFileSync(
      join(tempDir, "executor.md"),
      '---\nname: executor\ndescription: "E"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\n<identity>Executor.</identity>'
    );
    writeFileSync(
      join(tempDir, "_team-protocol.md"),
      "<team_protocol>\nPOST_TO_BLACKBOARD\n</team_protocol>"
    );
    const role = loadRole(join(tempDir, "executor.md"))!;
    const composed = withTeamProtocol(role, [tempDir]);
    assert.ok(composed.includes("<identity>Executor.</identity>"));
    assert.ok(composed.includes("POST_TO_BLACKBOARD"));
  });

  it("withTeamProtocol returns the role unchanged when partial missing", () => {
    writeFileSync(
      join(tempDir, "executor.md"),
      '---\nname: executor\ndescription: "E"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\nBody only'
    );
    const role = loadRole(join(tempDir, "executor.md"))!;
    const composed = withTeamProtocol(role, [tempDir]);
    assert.equal(composed, role.content);
  });

  it("buildRegistry resolves extends across directories", () => {
    const dir1 = join(tempDir, "user");
    const dir2 = join(tempDir, "project");
    mkdirSync(dir1, { recursive: true });
    mkdirSync(dir2, { recursive: true });

    writeFileSync(
      join(dir1, "executor.md"),
      '---\nname: executor\ndescription: "User executor"\ncomplexity: standard\nposture: deep-worker\nmode: agent\n---\n\n<identity>User base executor</identity>'
    );
    writeFileSync(
      join(dir2, "secure-executor.md"),
      '---\nname: secure-executor\ndescription: "Project secure"\ncomplexity: high\nposture: deep-worker\nmode: agent\nextends: executor\n---\n\n<constraints>Project secure constraints</constraints>'
    );

    const registry = buildRegistry([dir1, dir2]);
    const secure = registry.get("secure-executor");
    assert.ok(secure);
    assert.ok(secure!.content.includes("User base executor"));
    assert.ok(secure!.content.includes("Project secure constraints"));
  });
});

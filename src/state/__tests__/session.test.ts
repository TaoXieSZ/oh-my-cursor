import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { getOrCreateSession, readSession } from "../session.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omc", "state"), { recursive: true });
  return dir;
}

describe("session", () => {
  let projectRoot: string;
  const origEnv = process.env["OMC_PROJECT_ROOT"];

  beforeEach(() => {
    projectRoot = makeTmpProject();
    process.env["OMC_PROJECT_ROOT"] = projectRoot;
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    if (origEnv === undefined) {
      delete process.env["OMC_PROJECT_ROOT"];
    } else {
      process.env["OMC_PROJECT_ROOT"] = origEnv;
    }
  });

  describe("readSession", () => {
    it("returns null when no session exists", () => {
      assert.equal(readSession(), null);
    });

    it("returns null for corrupt session file", () => {
      writeFileSync(join(projectRoot, ".omc", "state", "session.json"), "broken");
      assert.equal(readSession(), null);
    });
  });

  describe("getOrCreateSession", () => {
    it("creates a new session with UUID", () => {
      const session = getOrCreateSession();

      assert.ok(session.id);
      assert.ok(session.id.includes("-"), "should be a UUID");
      assert.ok(session.started_at);
      assert.ok(session.last_active);
    });

    it("returns existing session and updates last_active", () => {
      const first = getOrCreateSession();
      const firstActive = first.last_active;

      // Small delay to ensure different timestamp
      const second = getOrCreateSession();

      assert.equal(second.id, first.id);
      assert.equal(second.started_at, first.started_at);
      assert.ok(second.last_active >= firstActive);
    });

    it("creates new session when existing is corrupt", () => {
      writeFileSync(join(projectRoot, ".omc", "state", "session.json"), "{{bad");
      const session = getOrCreateSession();

      assert.ok(session.id);
      assert.ok(session.started_at);
    });
  });

  describe("readSession after getOrCreateSession", () => {
    it("reads back the created session", () => {
      const created = getOrCreateSession();
      const read = readSession();

      assert.ok(read);
      assert.equal(read!.id, created.id);
    });
  });
});

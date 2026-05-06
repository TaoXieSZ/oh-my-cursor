import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { appendMemoryIndex, readMemoryIndex, getKeysForRun, getRunsForKey } from "../memory-index.js";
import { getMemoryIndexPath } from "../paths.js";

let tmp: string;
const origEnv = process.env["OMR_PROJECT_ROOT"];

beforeEach(() => {
  tmp = join(tmpdir(), "omr-memidx-test-" + randomUUID().slice(0, 8));
  mkdirSync(tmp, { recursive: true });
  process.env["OMR_PROJECT_ROOT"] = tmp;
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (origEnv !== undefined) process.env["OMR_PROJECT_ROOT"] = origEnv;
  else delete process.env["OMR_PROJECT_ROOT"];
});

describe("memory-index", () => {
  it("appendMemoryIndex creates file and directory", () => {
    appendMemoryIndex("project.name", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z" });
    const path = getMemoryIndexPath();
    assert.ok(existsSync(path));
    const index = readMemoryIndex();
    assert.equal(index["project.name"]!.length, 1);
    assert.equal(index["project.name"]![0].runId, "r1");
    assert.equal(index["project.name"]![0].key, "project.name");
  });

  it("appends multiple entries for same key", () => {
    appendMemoryIndex("foo", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z" });
    appendMemoryIndex("foo", { runId: "r2", mode: "blueprint", action: "set", ts: "2026-04-07T10:01:00Z" });
    const index = readMemoryIndex();
    assert.equal(index["foo"]!.length, 2);
    assert.equal(index["foo"]![0].runId, "r1");
    assert.equal(index["foo"]![1].runId, "r2");
  });

  it("readMemoryIndex returns {} for missing file", () => {
    const index = readMemoryIndex();
    assert.deepEqual(index, {});
  });

  it("readMemoryIndex returns {} for corrupt JSON", () => {
    const dir = join(tmp, ".omr");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "memory-index.json"), "not json");
    const index = readMemoryIndex();
    assert.deepEqual(index, {});
  });

  it("caps entries per key at 20", () => {
    for (let i = 0; i < 25; i++) {
      appendMemoryIndex("capped", { runId: `r${i}`, mode: "forge", action: "set", ts: `2026-04-07T10:${String(i).padStart(2, "0")}:00Z` });
    }
    const index = readMemoryIndex();
    assert.equal(index["capped"]!.length, 20);
    assert.equal(index["capped"]![0].runId, "r5");
    assert.equal(index["capped"]![19].runId, "r24");
  });

  it("getKeysForRun returns matching keys", () => {
    appendMemoryIndex("a", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z" });
    appendMemoryIndex("b", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:01:00Z" });
    appendMemoryIndex("c", { runId: "r2", mode: "forge", action: "set", ts: "2026-04-07T10:02:00Z" });
    const keys = getKeysForRun("r1");
    assert.deepEqual(keys.sort(), ["a", "b"]);
  });

  it("getKeysForRun returns [] for unknown run", () => {
    appendMemoryIndex("a", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z" });
    assert.deepEqual(getKeysForRun("r99"), []);
  });

  it("getRunsForKey returns entry history", () => {
    appendMemoryIndex("x", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z" });
    appendMemoryIndex("x", { runId: "r2", mode: null, action: "delete", ts: "2026-04-07T10:01:00Z" });
    const entries = getRunsForKey("x");
    assert.equal(entries.length, 2);
    assert.equal(entries[0].action, "set");
    assert.equal(entries[1].action, "delete");
  });

  it("getRunsForKey returns [] for unknown key", () => {
    assert.deepEqual(getRunsForKey("nonexistent"), []);
  });

  it("handles multiple keys with multiple runs", () => {
    appendMemoryIndex("a", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:00:00Z" });
    appendMemoryIndex("b", { runId: "r1", mode: "forge", action: "set", ts: "2026-04-07T10:01:00Z" });
    appendMemoryIndex("a", { runId: "r2", mode: "blueprint", action: "set", ts: "2026-04-07T10:02:00Z" });
    appendMemoryIndex("c", { runId: "r2", mode: "blueprint", action: "set", ts: "2026-04-07T10:03:00Z" });

    assert.deepEqual(getKeysForRun("r1").sort(), ["a", "b"]);
    assert.deepEqual(getKeysForRun("r2").sort(), ["a", "c"]);
    assert.equal(getRunsForKey("a").length, 2);
    assert.equal(getRunsForKey("b").length, 1);
    assert.equal(getRunsForKey("c").length, 1);
  });
});

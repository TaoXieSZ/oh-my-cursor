import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { appendEvent, readEvents, tailEvents } from "../event-log.js";
import type { RunEvent } from "../event-log.js";

describe("event-log", () => {
  let tmp: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tmp = join(tmpdir(), `omc-eventlog-test-${randomUUID()}`);
    mkdirSync(tmp, { recursive: true });
    origEnv = process.env["OMC_PROJECT_ROOT"];
    process.env["OMC_PROJECT_ROOT"] = tmp;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (origEnv === undefined) delete process.env["OMC_PROJECT_ROOT"];
    else process.env["OMC_PROJECT_ROOT"] = origEnv;
  });

  it("appends a single event and reads it back", () => {
    const ev: RunEvent = { ts: "2026-04-07T10:00:00Z", kind: "status", summary: "Started forge" };
    appendEvent("run1", ev);
    const events = readEvents("run1");
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "status");
    assert.equal(events[0].summary, "Started forge");
  });

  it("appends multiple events", () => {
    appendEvent("run2", { ts: "2026-04-07T10:00:00Z", kind: "status", summary: "Started" });
    appendEvent("run2", { ts: "2026-04-07T10:01:00Z", kind: "phase", summary: "Phase: init → verify" });
    appendEvent("run2", { ts: "2026-04-07T10:02:00Z", kind: "iteration", summary: "Iteration 1" });
    const events = readEvents("run2");
    assert.equal(events.length, 3);
    assert.equal(events[2].kind, "iteration");
  });

  it("creates log dir if missing", () => {
    const logDir = join(tmp, ".omc", "logs");
    assert.ok(!existsSync(logDir));
    appendEvent("run3", { ts: "2026-04-07T10:00:00Z", kind: "note", summary: "Test" });
    assert.ok(existsSync(logDir));
  });

  it("readEvents returns [] for missing file", () => {
    assert.deepEqual(readEvents("nonexistent"), []);
  });

  it("readEvents returns [] for empty file", () => {
    mkdirSync(join(tmp, ".omc", "logs"), { recursive: true });
    writeFileSync(join(tmp, ".omc", "logs", "empty.jsonl"), "");
    assert.deepEqual(readEvents("empty"), []);
  });

  it("readEvents skips corrupt JSONL lines", () => {
    mkdirSync(join(tmp, ".omc", "logs"), { recursive: true });
    writeFileSync(join(tmp, ".omc", "logs", "corrupt.jsonl"),
      JSON.stringify({ ts: "2026-04-07T10:00:00Z", kind: "status", summary: "ok" }) + "\n" +
      "NOT JSON\n" +
      JSON.stringify({ ts: "2026-04-07T10:01:00Z", kind: "phase", summary: "next" }) + "\n"
    );
    const events = readEvents("corrupt");
    assert.equal(events.length, 2);
  });

  it("tailEvents returns last N events", () => {
    for (let i = 0; i < 10; i++) {
      appendEvent("tail-run", { ts: `2026-04-07T10:0${i}:00Z`, kind: "iteration", summary: `Iteration ${i}` });
    }
    const last3 = tailEvents("tail-run", 3);
    assert.equal(last3.length, 3);
    assert.equal(last3[0].summary, "Iteration 7");
    assert.equal(last3[2].summary, "Iteration 9");
  });

  it("tailEvents returns all if fewer than N", () => {
    appendEvent("few", { ts: "2026-04-07T10:00:00Z", kind: "note", summary: "A" });
    appendEvent("few", { ts: "2026-04-07T10:01:00Z", kind: "note", summary: "B" });
    const all = tailEvents("few", 20);
    assert.equal(all.length, 2);
  });

  it("tailEvents returns [] for missing file", () => {
    assert.deepEqual(tailEvents("missing"), []);
  });

  it("event preserves detail field", () => {
    appendEvent("detail-run", {
      ts: "2026-04-07T10:00:00Z", kind: "tool_call", summary: "Called tool X",
      detail: { tool: "search", args: { query: "test" } },
    });
    const events = readEvents("detail-run");
    assert.equal(events[0].detail?.tool, "search");
  });

  it("truncates log when exceeding 1000 events", () => {
    const logDir = join(tmp, ".omc", "logs");
    mkdirSync(logDir, { recursive: true });
    const lines: string[] = [];
    for (let i = 0; i < 1001; i++) {
      lines.push(JSON.stringify({ ts: `2026-01-01T00:00:${String(i).padStart(2, "0")}Z`, kind: "note", summary: `Event ${i}` }));
    }
    writeFileSync(join(logDir, "bigrun.jsonl"), lines.join("\n") + "\n");

    appendEvent("bigrun", { ts: "2026-04-07T10:00:00Z", kind: "note", summary: "Trigger truncation" });

    const events = readEvents("bigrun");
    assert.ok(events.length <= 801, `Expected <= 801 events, got ${events.length}`);
    assert.equal(events[events.length - 1].summary, "Trigger truncation");
  });
});

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  postMessage,
  readMessages,
  getAgentStatuses,
  clearBlackboard,
  tailSince,
  formatLine,
  writeTranscript,
} from "../blackboard.js";

describe("blackboard", () => {
  let tempDir: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "omr-bb-test-"));
    origEnv = process.env["OMR_PROJECT_ROOT"];
    process.env["OMR_PROJECT_ROOT"] = tempDir;
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["OMR_PROJECT_ROOT"];
    } else {
      process.env["OMR_PROJECT_ROOT"] = origEnv;
    }
    try {
      rmSync(tempDir, { recursive: true });
    } catch { /* ignore */ }
  });

  it("post and read messages", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "lane-1", kind: "status", content: "Starting work" });
    postMessage({ ts: "2026-01-01T00:01:00Z", agent: "lane-2", kind: "claim", content: "Claiming src/api.ts" });

    const all = readMessages();
    assert.equal(all.length, 2);
    assert.equal(all[0].agent, "lane-1");
    assert.equal(all[1].kind, "claim");
  });

  it("filters by since", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "a", kind: "status", content: "old" });
    postMessage({ ts: "2026-01-01T01:00:00Z", agent: "b", kind: "status", content: "new" });

    const filtered = readMessages({ since: "2026-01-01T00:30:00Z" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].agent, "b");
  });

  it("filters by agent", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "lane-1", kind: "status", content: "a" });
    postMessage({ ts: "2026-01-01T00:01:00Z", agent: "lane-2", kind: "status", content: "b" });

    const filtered = readMessages({ agent: "lane-1" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].content, "a");
  });

  it("getAgentStatuses returns latest per agent", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "lane-1", kind: "status", content: "starting" });
    postMessage({ ts: "2026-01-01T00:05:00Z", agent: "lane-1", kind: "status", content: "halfway" });
    postMessage({ ts: "2026-01-01T00:01:00Z", agent: "lane-2", kind: "status", content: "working" });

    const statuses = getAgentStatuses();
    assert.equal(statuses.length, 2);

    const lane1 = statuses.find((s) => s.agent === "lane-1");
    assert.equal(lane1?.status, "halfway");
  });

  it("clearBlackboard empties the file", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "a", kind: "note", content: "test" });
    assert.equal(readMessages().length, 1);

    clearBlackboard();
    assert.equal(readMessages().length, 0);
  });

  it("returns empty array for missing file", () => {
    assert.deepEqual(readMessages(), []);
  });

  it("persists lane and role fields", () => {
    postMessage({
      ts: "2026-01-01T00:00:00Z",
      agent: "lane-1",
      kind: "claim",
      content: "src/api/users.ts",
      lane: "lane-1",
      role: "executor",
    });

    const all = readMessages();
    assert.equal(all.length, 1);
    assert.equal(all[0].lane, "lane-1");
    assert.equal(all[0].role, "executor");
  });

  it("filters by lane", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "a", kind: "status", content: "one", lane: "lane-1" });
    postMessage({ ts: "2026-01-01T00:01:00Z", agent: "b", kind: "status", content: "two", lane: "lane-2" });

    const filtered = readMessages({ lane: "lane-1" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].content, "one");
  });

  it("tailSince returns only messages newer than cursor and reports nextCursor", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "a", kind: "status", content: "old" });
    postMessage({ ts: "2026-01-01T00:05:00Z", agent: "b", kind: "status", content: "mid" });
    postMessage({ ts: "2026-01-01T00:10:00Z", agent: "c", kind: "status", content: "new" });

    const first = tailSince();
    assert.equal(first.messages.length, 3);
    assert.equal(first.nextCursor, "2026-01-01T00:10:00Z");

    const second = tailSince(first.nextCursor ?? undefined);
    assert.equal(second.messages.length, 0);
    assert.equal(second.nextCursor, "2026-01-01T00:10:00Z");

    const partial = tailSince("2026-01-01T00:02:00Z");
    assert.equal(partial.messages.length, 2);
    assert.equal(partial.messages[0].content, "mid");
  });

  it("tailSince handles empty blackboard", () => {
    const result = tailSince("2026-01-01T00:00:00Z");
    assert.deepEqual(result.messages, []);
    assert.equal(result.nextCursor, "2026-01-01T00:00:00Z");
  });

  it("formatLine renders the canonical team-chatter format", () => {
    const line = formatLine({
      ts: "2026-04-07T14:22:01Z",
      agent: "lane-1",
      lane: "lane-1",
      role: "executor",
      kind: "claim",
      content: "src/api/users.ts",
    });
    assert.match(line, /^\[14:22:01\]\s+lane-1·executor\s+claim\s+src\/api\/users\.ts$/);
  });

  it("formatLine falls back to agent when lane/role are missing", () => {
    const line = formatLine({
      ts: "2026-04-07T14:22:01Z",
      agent: "leader",
      kind: "note",
      content: "Dispatching lanes",
    });
    assert.match(line, /^\[14:22:01\]\s+leader\s+note\s+Dispatching lanes$/);
  });

  it("writeTranscript filters by runId prefix and writes markdown", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "l", kind: "status", content: "go", lane: "run123-lane-1", role: "executor" });
    postMessage({ ts: "2026-01-01T00:01:00Z", agent: "l", kind: "claim", content: "src/a.ts", lane: "run123-lane-1", role: "executor" });
    postMessage({ ts: "2026-01-01T00:02:00Z", agent: "l", kind: "status", content: "other run", lane: "other-lane-1", role: "designer" });

    const path = writeTranscript("run123");
    const body = readFileSync(path, "utf-8");
    assert.match(body, /# Team transcript — run run123/);
    assert.match(body, /src\/a\.ts/);
    assert.doesNotMatch(body, /other run/);
  });

  it("writeTranscript without runId captures the full blackboard", () => {
    postMessage({ ts: "2026-01-01T00:00:00Z", agent: "l", kind: "status", content: "hello" });
    const path = writeTranscript();
    const body = readFileSync(path, "utf-8");
    assert.match(body, /hello/);
  });

  it("writeTranscript notes when there are no messages for a run", () => {
    const path = writeTranscript("empty-run");
    const body = readFileSync(path, "utf-8");
    assert.match(body, /No blackboard messages recorded/);
  });
});

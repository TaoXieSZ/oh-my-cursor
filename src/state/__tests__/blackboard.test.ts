import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { postMessage, readMessages, getAgentStatuses, clearBlackboard } from "../blackboard.js";

describe("blackboard", () => {
  let tempDir: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "omc-bb-test-"));
    origEnv = process.env["OMC_PROJECT_ROOT"];
    process.env["OMC_PROJECT_ROOT"] = tempDir;
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["OMC_PROJECT_ROOT"];
    } else {
      process.env["OMC_PROJECT_ROOT"] = origEnv;
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
});

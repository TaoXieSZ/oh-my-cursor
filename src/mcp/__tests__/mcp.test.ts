import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("file://" + join(import.meta.dirname, "..", "..", "package.json"))
);
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const STATE_SERVER = join(import.meta.dirname, "..", "state-server.js");
const MEMORY_SERVER = join(import.meta.dirname, "..", "memory-server.js");

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-mcp-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omc", "state"), { recursive: true });
  mkdirSync(join(dir, ".omc", "plans"), { recursive: true });
  writeFileSync(join(dir, ".omc", "notepad.md"), "# Test Notepad\n");
  writeFileSync(join(dir, ".omc", "project-memory.json"), "{}\n");
  return dir;
}

async function createClient(serverPath: string, projectRoot: string) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: { ...process.env, OMC_PROJECT_ROOT: projectRoot },
  });
  const client = new Client({ name: "test", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

describe("omc-state MCP server", () => {
  let tmp: string;
  let client: any;

  beforeEach(async () => {
    tmp = makeTmpProject();
    client = await createClient(STATE_SERVER, tmp);
  });

  afterEach(async () => {
    await client.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("lists 8 tools", async () => {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 8);
    const names = tools.map((t: any) => t.name).sort();
    assert.deepEqual(names, [
      "notepad_append", "notepad_read",
      "plan_list", "plan_read", "plan_write",
      "state_list", "state_read", "state_write",
    ]);
  });

  it("state_write + state_read roundtrip", async () => {
    const writeResult = await client.callTool({
      name: "state_write",
      arguments: {
        mode: "forge",
        state: { mode: "forge", status: "active", task: "test" },
      },
    });
    assert.ok(writeResult.content[0].text.includes("runId:"));

    const result = await client.callTool({
      name: "state_read",
      arguments: { mode: "forge" },
    });

    const state = JSON.parse(result.content[0].text);
    assert.equal(state.mode, "forge");
    assert.equal(state.status, "active");
    assert.ok(state.runId);
  });

  it("state_write auto-generates runId for new runs", async () => {
    await client.callTool({
      name: "state_write",
      arguments: { mode: "forge", state: { status: "active", task: "run1" } },
    });
    const result = await client.callTool({
      name: "state_read",
      arguments: { mode: "forge" },
    });
    const state = JSON.parse(result.content[0].text);
    assert.ok(state.runId);
    assert.equal(state.runId.length, 8);
  });

  it("state_write updates existing active run when no runId given", async () => {
    await client.callTool({
      name: "state_write",
      arguments: { mode: "forge", state: { status: "active", task: "run1", phase: "init" } },
    });
    const first = JSON.parse((await client.callTool({
      name: "state_read", arguments: { mode: "forge" },
    })).content[0].text);

    await client.callTool({
      name: "state_write",
      arguments: { mode: "forge", state: { status: "active", task: "run1", phase: "verify" } },
    });
    const second = JSON.parse((await client.callTool({
      name: "state_read", arguments: { mode: "forge" },
    })).content[0].text);

    assert.equal(first.runId, second.runId);
    assert.equal(second.phase, "verify");
  });

  it("state_write with explicit runId uses that runId", async () => {
    await client.callTool({
      name: "state_write",
      arguments: { mode: "forge", state: { status: "active", runId: "deadbeef", task: "specific" } },
    });
    const result = await client.callTool({
      name: "state_read", arguments: { mode: "forge", runId: "deadbeef" },
    });
    const state = JSON.parse(result.content[0].text);
    assert.equal(state.runId, "deadbeef");
  });

  it("state_read returns message for missing mode", async () => {
    const result = await client.callTool({
      name: "state_read",
      arguments: { mode: "nonexistent" },
    });
    assert.ok(result.content[0].text.includes("No state found"));
  });

  it("state_list shows written states with summary", async () => {
    await client.callTool({
      name: "state_write",
      arguments: { mode: "forge", state: { status: "active", task: "test" } },
    });

    const result = await client.callTool({ name: "state_list", arguments: {} });
    const summaries = JSON.parse(result.content[0].text);
    assert.ok(Array.isArray(summaries));
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].mode, "forge");
    assert.equal(summaries[0].status, "active");
    assert.ok(summaries[0].runId);
  });

  it("plan_write + plan_read + plan_list", async () => {
    await client.callTool({
      name: "plan_write",
      arguments: { filename: "prd-test.md", content: "# Test PRD\n" },
    });

    const readResult = await client.callTool({
      name: "plan_read",
      arguments: { filename: "prd-test.md" },
    });
    assert.equal(readResult.content[0].text, "# Test PRD\n");

    const listResult = await client.callTool({ name: "plan_list", arguments: {} });
    const plans = JSON.parse(listResult.content[0].text);
    assert.ok(plans.includes("prd-test.md"));
  });

  it("notepad_read + notepad_append", async () => {
    const readResult = await client.callTool({ name: "notepad_read", arguments: {} });
    assert.ok(readResult.content[0].text.includes("Test Notepad"));

    await client.callTool({
      name: "notepad_append",
      arguments: { text: "New note here" },
    });

    const afterAppend = await client.callTool({ name: "notepad_read", arguments: {} });
    assert.ok(afterAppend.content[0].text.includes("New note here"));
  });
});

describe("omc-memory MCP server", () => {
  let tmp: string;
  let client: any;

  beforeEach(async () => {
    tmp = makeTmpProject();
    client = await createClient(MEMORY_SERVER, tmp);
  });

  afterEach(async () => {
    await client.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("lists 5 tools", async () => {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 5);
    const names = tools.map((t: any) => t.name).sort();
    assert.deepEqual(names, [
      "memory_clear", "memory_delete", "memory_get", "memory_list", "memory_set",
    ]);
  });

  it("memory_set + memory_get roundtrip", async () => {
    await client.callTool({
      name: "memory_set",
      arguments: { key: "lang", value: "typescript" },
    });

    const result = await client.callTool({
      name: "memory_get",
      arguments: { key: "lang" },
    });
    assert.equal(JSON.parse(result.content[0].text), "typescript");
  });

  it("memory_get returns message for missing key", async () => {
    const result = await client.callTool({
      name: "memory_get",
      arguments: { key: "missing" },
    });
    assert.ok(result.content[0].text.includes("Key not found"));
  });

  it("memory_list shows stored keys", async () => {
    await client.callTool({ name: "memory_set", arguments: { key: "a", value: 1 } });
    await client.callTool({ name: "memory_set", arguments: { key: "b", value: 2 } });

    const result = await client.callTool({ name: "memory_list", arguments: {} });
    assert.ok(result.content[0].text.includes("a"));
    assert.ok(result.content[0].text.includes("b"));
  });

  it("memory_delete removes a key", async () => {
    await client.callTool({ name: "memory_set", arguments: { key: "x", value: "y" } });
    await client.callTool({ name: "memory_delete", arguments: { key: "x" } });

    const result = await client.callTool({ name: "memory_get", arguments: { key: "x" } });
    assert.ok(result.content[0].text.includes("Key not found"));
  });

  it("memory_clear removes all keys", async () => {
    await client.callTool({ name: "memory_set", arguments: { key: "a", value: 1 } });
    await client.callTool({ name: "memory_set", arguments: { key: "b", value: 2 } });
    await client.callTool({ name: "memory_clear", arguments: {} });

    const result = await client.callTool({ name: "memory_list", arguments: {} });
    assert.ok(result.content[0].text.includes("(empty)"));
  });
});

#!/usr/bin/env node

// OMC session-start hook
// Ensures .omc/ state dirs exist and initializes a session on agent start.
// Receives: { type: "sessionStart" } on stdin
// Responds: { continue: true } on stdout

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const projectRoot = process.env.OMC_PROJECT_ROOT || process.cwd();
const omcDir = join(projectRoot, ".omc");

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function initSession() {
  ensureDir(join(omcDir, "state"));
  ensureDir(join(omcDir, "plans"));
  ensureDir(join(omcDir, "logs"));

  const sessionPath = join(omcDir, "state", "session.json");

  let session;
  try {
    session = JSON.parse(readFileSync(sessionPath, "utf-8"));
  } catch {
    session = null;
  }

  const now = new Date().toISOString();

  if (!session || !session.id) {
    session = {
      id: randomUUID(),
      started_at: now,
      last_active: now,
    };
  } else {
    session.last_active = now;
  }

  writeFileSync(sessionPath, JSON.stringify(session, null, 2) + "\n");
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    initSession();
  } catch {
    // non-fatal — don't block the agent
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main();

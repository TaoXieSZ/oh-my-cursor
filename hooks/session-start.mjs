#!/usr/bin/env node

// OMR session-start hook
// Ensures .omr/ state dirs exist, initializes a session, and records schedule
// resume markers for suspended tasks.
// Receives: { type: "sessionStart" } on stdin
// Responds: { continue: true } on stdout

import { mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

const projectRoot = process.env.OMR_PROJECT_ROOT || process.cwd();
const omcDir = join(projectRoot, ".omr");
const userOmrDir = process.env.OMR_USER_DATA_ROOT || join(homedir(), ".cursor", "omr");

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function initSession() {
  ensureDir(join(omcDir, "state"));
  ensureDir(join(omcDir, "plans"));
  ensureDir(join(omcDir, "logs"));
  ensureDir(join(userOmrDir, "state"));

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

function refreshScheduleResumePending(scope, rootDir) {
  const statePath = join(rootDir, "state", "schedule-state.json");
  const pendingPath = join(rootDir, "state", "schedule-resume-pending.json");

  let tasks = [];
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf-8"));
    if (Array.isArray(parsed.tasks)) {
      tasks = parsed.tasks.filter((task) => task?.state === "suspended");
    }
  } catch {
    tasks = [];
  }

  if (tasks.length === 0) {
    try {
      unlinkSync(pendingPath);
    } catch {
      // non-fatal
    }
    return;
  }

  writeFileSync(pendingPath, JSON.stringify({
    scope,
    generated_at: new Date().toISOString(),
    tasks: tasks.map((task) => ({
      id: task.id,
      description: task.description,
      interval_seconds: task.interval_seconds,
      last_result: task.last_result ?? null,
    })),
  }, null, 2) + "\n");
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    initSession();
    refreshScheduleResumePending("project", omcDir);
    refreshScheduleResumePending("user", userOmrDir);
  } catch {
    // non-fatal — don't block the agent
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main();

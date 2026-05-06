#!/usr/bin/env node

// OMR session-end hook
// Archives completed runs, updates session state, and suspends running
// schedule tasks when the agent stops.
// Receives: { type: "stop" | "sessionEnd" } on stdin
// Responds: { continue: true } on stdout

import { existsSync, readFileSync, readdirSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const projectRoot = process.env.OMR_PROJECT_ROOT || process.cwd();
const omcDir = join(projectRoot, ".omr");
const stateDir = join(omcDir, "state");
const archiveDir = join(omcDir, "archive");
const userOmrDir = process.env.OMR_USER_DATA_ROOT || join(homedir(), ".cursor", "omr");

function archiveCompletedRuns() {
  if (!existsSync(stateDir)) return;

  const files = readdirSync(stateDir).filter(
    (f) => f.endsWith("-state.json") && f !== "session.json"
  );

  const toArchive = [];

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(stateDir, file), "utf-8"));
      if (data.status === "complete" || data.status === "cancelled") {
        toArchive.push({ file, data });
      }
    } catch {
      // skip corrupt files
    }
  }

  if (toArchive.length === 0) return;

  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  for (const { file, data } of toArchive) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const archiveName = `${ts}-${file}`;
    const archiveEntry = {
      ...data,
      archived_at: new Date().toISOString(),
      source_file: file,
    };
    writeFileSync(
      join(archiveDir, archiveName),
      JSON.stringify(archiveEntry, null, 2) + "\n"
    );
    // Remove from active state
    try {
      renameSync(join(stateDir, file), join(stateDir, `archived-${file}`));
      // Clean up the renamed file after a beat
      try {
        unlinkSync(join(stateDir, `archived-${file}`));
      } catch {
        // non-fatal
      }
    } catch {
      // non-fatal
    }
  }
}

function updateSession() {
  const sessionPath = join(stateDir, "session.json");
  if (!existsSync(sessionPath)) return;

  try {
    const session = JSON.parse(readFileSync(sessionPath, "utf-8"));
    session.last_active = new Date().toISOString();
    session.ended_at = new Date().toISOString();
    writeFileSync(sessionPath, JSON.stringify(session, null, 2) + "\n");
  } catch {
    // non-fatal
  }
}

function suspendRunningScheduleTasks(rootDir) {
  const schedulePath = join(rootDir, "state", "schedule-state.json");
  if (!existsSync(schedulePath)) return;

  try {
    const parsed = JSON.parse(readFileSync(schedulePath, "utf-8"));
    if (!Array.isArray(parsed.tasks)) return;

    const ts = new Date().toISOString();
    let changed = false;
    parsed.tasks = parsed.tasks.map((task) => {
      if (task?.state !== "running") {
        return task;
      }
      changed = true;
      return {
        ...task,
        state: "suspended",
        suspended_at: ts,
        next_run_at: null,
      };
    });

    if (!changed) return;
    writeFileSync(schedulePath, JSON.stringify(parsed, null, 2) + "\n");
  } catch {
    // non-fatal
  }
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    archiveCompletedRuns();
    updateSession();
    suspendRunningScheduleTasks(omcDir);
    suspendRunningScheduleTasks(userOmrDir);
  } catch {
    // non-fatal — don't block agent teardown
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main();

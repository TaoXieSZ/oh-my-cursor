#!/usr/bin/env node

// OMC session-end hook
// Archives completed runs and updates session state when agent stops.
// Receives: { type: "stop" | "sessionEnd" } on stdin
// Responds: { continue: true } on stdout

import { existsSync, readFileSync, readdirSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.env.OMC_PROJECT_ROOT || process.cwd();
const omcDir = join(projectRoot, ".omc");
const stateDir = join(omcDir, "state");
const archiveDir = join(omcDir, "archive");

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

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    archiveCompletedRuns();
    updateSession();
  } catch {
    // non-fatal — don't block agent teardown
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main();

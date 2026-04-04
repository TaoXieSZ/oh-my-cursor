import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { getSessionPath } from "./paths.js";
import { ensureDir } from "../utils/fs.js";

export interface Session {
  id: string;
  started_at: string;
  last_active: string;
}

export function getOrCreateSession(): Session {
  const path = getSessionPath();

  if (existsSync(path)) {
    try {
      const session = JSON.parse(readFileSync(path, "utf-8")) as Session;
      session.last_active = new Date().toISOString();
      writeFileSync(path, JSON.stringify(session, null, 2) + "\n");
      return session;
    } catch {
      // corrupt session, create new
    }
  }

  const session: Session = {
    id: randomUUID(),
    started_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };

  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(session, null, 2) + "\n");
  return session;
}

export function readSession(): Session | null {
  const path = getSessionPath();
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Session;
  } catch {
    return null;
  }
}

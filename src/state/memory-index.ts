import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getMemoryIndexPath } from "./paths.js";
import { ensureDir } from "../utils/fs.js";

export interface MemoryIndexEntry {
  runId: string | null;
  mode: string | null;
  action: "set" | "delete";
  ts: string;
  key: string;
}

export type MemoryIndexMap = Record<string, MemoryIndexEntry[]>;

const MAX_ENTRIES_PER_KEY = 20;

export function readMemoryIndex(): MemoryIndexMap {
  const path = getMemoryIndexPath();
  if (!existsSync(path)) return {};
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
    return data as MemoryIndexMap;
  } catch {
    return {};
  }
}

export function appendMemoryIndex(key: string, entry: Omit<MemoryIndexEntry, "key">): void {
  const path = getMemoryIndexPath();
  ensureDir(dirname(path));

  const index = readMemoryIndex();
  const fullEntry: MemoryIndexEntry = { ...entry, key };

  if (!index[key]) {
    index[key] = [fullEntry];
  } else {
    index[key].push(fullEntry);
    if (index[key].length > MAX_ENTRIES_PER_KEY) {
      index[key] = index[key].slice(-MAX_ENTRIES_PER_KEY);
    }
  }

  writeFileSync(path, JSON.stringify(index, null, 2) + "\n");
}

export function getKeysForRun(runId: string): string[] {
  const index = readMemoryIndex();
  const keys: string[] = [];
  for (const [key, entries] of Object.entries(index)) {
    if (entries.some(e => e.runId === runId)) {
      keys.push(key);
    }
  }
  return keys;
}

export function getRunsForKey(key: string): MemoryIndexEntry[] {
  const index = readMemoryIndex();
  return index[key] ?? [];
}

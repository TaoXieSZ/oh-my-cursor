import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function copyDir(src: string, dest: string): number {
  ensureDir(dest);
  let count = 0;
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyDir(srcPath, destPath);
    } else {
      ensureDir(dirname(destPath));
      copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return count;
}

export function copyFile(src: string, dest: string): void {
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
}

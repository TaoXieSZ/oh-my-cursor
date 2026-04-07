import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cursorSkillsDir, packageSkillsDir } from "../utils/paths.js";
import { heading, info, dim, warn } from "../utils/log.js";

interface SkillMeta {
  name: string;
  description: string;
  dir: string;
}

function parseSkillFrontmatter(skillDir: string): SkillMeta | null {
  const mdPath = join(skillDir, "SKILL.md");
  if (!existsSync(mdPath)) return null;

  const raw = readFileSync(mdPath, "utf-8");
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  if (!name) return null;

  return { name, description, dir: skillDir };
}

function scanSkillDirs(baseDir: string): SkillMeta[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("omc-"))
    .map((d) => parseSkillFrontmatter(join(baseDir, d.name)))
    .filter((s): s is SkillMeta => s !== null);
}

export async function skills(): Promise<void> {
  heading("OMC Skills");

  const seen = new Set<string>();
  const all: SkillMeta[] = [];

  for (const scope of ["user", "project"] as const) {
    const dir = cursorSkillsDir(scope);
    for (const s of scanSkillDirs(dir)) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        all.push(s);
      }
    }
  }

  const pkgDir = packageSkillsDir();
  for (const s of scanSkillDirs(pkgDir)) {
    if (!seen.has(s.name)) {
      seen.add(s.name);
      all.push(s);
    }
  }

  if (all.length === 0) {
    warn("No OMC skills found. Run 'omc setup' first.");
    return;
  }

  all.sort((a, b) => a.name.localeCompare(b.name));

  const maxName = Math.max(...all.map((s) => s.name.length));
  for (const s of all) {
    const cmd = `/${s.name.replace(/^omc-/, "")}`;
    const padded = cmd.padEnd(maxName + 2);
    info(`${padded} ${s.description}`);
  }

  console.log();
  dim(`${all.length} skills available. Use /$name or $name in Cursor chat to invoke.`);
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cursorSkillsDir, packageSkillsDir } from "../utils/paths.js";
import { heading, info, dim, warn } from "../utils/log.js";

interface SkillMeta {
  name: string;
  description: string;
  dir: string;
}

type SkillCategory = "Core Path" | "Supporting Tools" | "Optional Extras" | "Other";

const SKILL_CATEGORY_ORDER: SkillCategory[] = [
  "Core Path",
  "Supporting Tools",
  "Optional Extras",
  "Other",
];

const CORE_PATH_SKILLS = new Set([
  "omr-deep-interview",
  "omr-blueprint",
  "omr-ralplan",
  "omr-forge",
  "omr-cancel",
]);

const SUPPORTING_SKILLS = new Set([
  "omr-analyze",
  "omr-code-review",
  "omr-ai-slop-cleaner",
  "omr-ask",
  "omr-ecomode",
]);

const OPTIONAL_SKILLS = new Set([
  "omr-autopilot",
  "omr-dashboard",
  "omr-git-master",
  "omr-schedule",
  "omr-tdd",
  "omr-team",
  "omr-web-clone",
  "omr-wiki",
]);

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
    .filter((d) => d.isDirectory() && d.name.startsWith("omr-"))
    .map((d) => parseSkillFrontmatter(join(baseDir, d.name)))
    .filter((s): s is SkillMeta => s !== null);
}

function categorizeSkill(name: string): SkillCategory {
  if (CORE_PATH_SKILLS.has(name)) return "Core Path";
  if (SUPPORTING_SKILLS.has(name)) return "Supporting Tools";
  if (OPTIONAL_SKILLS.has(name)) return "Optional Extras";
  return "Other";
}

export async function skills(): Promise<void> {
  heading("OMR Skills");

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
    warn("No OMR skills found. Run 'omr setup' first.");
    return;
  }

  all.sort((a, b) => a.name.localeCompare(b.name));

  const maxCmdLen = Math.max(...all.map((s) => s.name.length + 1));
  for (const category of SKILL_CATEGORY_ORDER) {
    const skillsInCategory = all.filter((skill) => categorizeSkill(skill.name) === category);
    if (skillsInCategory.length === 0) continue;
    info(category);
    for (const s of skillsInCategory) {
      const cmd = `/${s.name}`;
      const padded = cmd.padEnd(maxCmdLen + 2);
      info(`${padded} ${s.description}`);
    }
    console.log();
  }

  dim("Start with the core path: /omr-deep-interview -> /omr-blueprint -> /omr-forge.");
  dim(`${all.length} skills available. Use /omr-name (primary), /name (legacy), or $name in Cursor chat.`);
}

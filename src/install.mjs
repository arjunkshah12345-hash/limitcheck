import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const START = "<!-- limitcheck:begin -->";
const END = "<!-- limitcheck:end -->";

function readPackageFile(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function relativePath(root, path) {
  return relative(root, path) || ".";
}

function writeIfMissing(root, path, content) {
  const absolutePath = resolve(root, path);
  if (existsSync(absolutePath)) {
    return { path: relativePath(root, absolutePath), status: "exists" };
  }
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  return { path: relativePath(root, absolutePath), status: "created" };
}

function upsertBlock(root, path, block) {
  const absolutePath = resolve(root, path);
  const current = existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
  const nextBlock = `${START}\n${block.trim()}\n${END}`;
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, nextBlock)
    : `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${nextBlock}\n`;

  if (next === current) return { path: relativePath(root, absolutePath), status: "exists" };
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, next);
  return { path: relativePath(root, absolutePath), status: "created" };
}

export function installAgentGuidance(workspace = process.cwd()) {
  const root = resolve(workspace);
  const skill = readPackageFile("../skills/limitcheck/SKILL.md");
  const cursorRule = readPackageFile("../templates/limitcheck.mdc");
  const body = skill.replace(/^---[\s\S]*?---\s*/, "").trim();

  return [
    writeIfMissing(root, ".agents/skills/limitcheck/SKILL.md", skill),
    writeIfMissing(root, ".claude/skills/limitcheck/SKILL.md", skill),
    writeIfMissing(root, ".opencode/skills/limitcheck/SKILL.md", skill),
    writeIfMissing(root, ".cursor/rules/limitcheck.mdc", cursorRule),
    upsertBlock(root, "AGENTS.md", body),
    upsertBlock(root, "CLAUDE.md", body),
  ];
}


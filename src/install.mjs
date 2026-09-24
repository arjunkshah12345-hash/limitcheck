import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, relative, resolve } from "node:path";

const START = "<!-- limitcheck:begin -->";
const END = "<!-- limitcheck:end -->";

function readPackageFile(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function readPackageJson() {
  return JSON.parse(readPackageFile("../package.json"));
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

function commandAvailable(command) {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [command], { stdio: "ignore" }).status === 0;
}

function globalPath(root, path) {
  return `~/${relativePath(root, resolve(root, path))}`;
}

export function installGlobalAgentGuidance(home = homedir()) {
  const root = resolve(home);
  const skill = readPackageFile("../skills/limitcheck/SKILL.md");
  const cursorRule = readPackageFile("../templates/limitcheck.mdc");
  const destinations = [
    { path: ".agents/skills/limitcheck/SKILL.md", content: skill, commands: [], always: true },
    { path: ".codex/skills/limitcheck/SKILL.md", content: skill, commands: ["codex"] },
    { path: ".claude/skills/limitcheck/SKILL.md", content: skill, commands: ["claude"] },
    { path: ".cursor/rules/limitcheck.mdc", content: cursorRule, commands: ["cursor", "cursor-agent"] },
    { path: ".opencode/skills/limitcheck/SKILL.md", content: skill, commands: ["opencode"] },
    { path: ".config/opencode/skills/limitcheck/SKILL.md", content: skill, commands: ["opencode"] },
    { path: ".croc/skills/limitcheck/SKILL.md", content: skill, commands: ["croc", "crocbot"] },
  ];

  return destinations
    .filter(({ path, commands, always }) => {
      const parentExists = existsSync(resolve(root, dirname(path)));
      return always || parentExists || commands.some(commandAvailable);
    })
    .map(({ path, content }) => {
      const result = writeIfMissing(root, path, content);
      return { ...result, path: globalPath(root, path) };
    });
}

export function ensureGlobalPackage() {
  const packageJson = readPackageJson();
  const npmRoot = spawnSync("npm", ["root", "--global"], { encoding: "utf8" });
  if (npmRoot.status !== 0) throw new Error("npm is required to install limitcheck globally.");

  const installedPath = resolve(npmRoot.stdout.trim(), packageJson.name, "package.json");
  if (existsSync(installedPath)) {
    try {
      const installed = JSON.parse(readFileSync(installedPath, "utf8"));
      if (installed.version === packageJson.version) return { status: "exists", path: "global npm package" };
    } catch {
      // Reinstall below if the global package metadata is unreadable.
    }
  }

  const install = spawnSync("npm", ["install", "--global", `${packageJson.name}@${packageJson.version}`], { stdio: "inherit" });
  if (install.status !== 0) throw new Error("Global npm install failed. Try npm install -g limitcheck manually.");
  return { status: "installed", path: `global npm package ${packageJson.name}@${packageJson.version}` };
}

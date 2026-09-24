#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { installAgentGuidance, installGlobalAgentGuidance, ensureGlobalPackage } from "../src/install.mjs";
import { DEMO_SNAPSHOTS, formatText, normalizeSnapshot, toAgentJson } from "../src/limits.mjs";

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args.shift() : "install";

function flag(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return value;
}

function hasFlag(name) {
  return args.includes(name);
}

function printHelp() {
  process.stdout.write(`limitcheck — rate-limit runway for coding agents\n\n`);
  process.stdout.write(`Usage\n  limitcheck [install] [--path <workspace>]\n  limitcheck status [--json] [--provider <name>] [--file <path>]\n  limitcheck sample [codex|cursor] [--json]\n\n`);
  process.stdout.write(`Input\n  Pipe a provider payload on stdin, pass --file, or use LIMITCHECK_SNAPSHOT.\n`);
  process.stdout.write(`  The payload can use windows[], rateLimits{}, limits{}, or usage{}.\n`);
  process.stdout.write(`Agents\n  Run limitcheck install once in a workspace to install runway guidance.\n`);
}

async function readStdin() {
  if (process.stdin.isTTY) return null;
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value.trim() || null;
}

async function run() {
  if (hasFlag("--help") || command === "help") {
    printHelp();
    return;
  }

  const wantsJson = hasFlag("--json");
  const provider = flag("--provider") ?? "generic";

  if (command === "install" || command === "setup") {
    const target = flag("--path") ?? process.cwd();
    const workspaceOnly = hasFlag("--workspace-only");
    const result = [];
    if (!workspaceOnly) result.push(ensureGlobalPackage());
    result.push(...installAgentGuidance(target));
    if (!workspaceOnly) result.push(...installGlobalAgentGuidance());
    process.stdout.write(`limitcheck: installed agent guidance in ${target}\n`);
    for (const entry of result) process.stdout.write(`  ${entry.status === "created" ? "✓" : "·"} ${entry.status} ${entry.path}\n`);
    return;
  }

  if (command === "sample") {
    const sampleName = args.find((arg) => !arg.startsWith("-")) ?? "codex";
    const sample = DEMO_SNAPSHOTS[sampleName];
    if (!sample) throw new Error(`Unknown sample: ${sampleName}. Try codex or cursor.`);
    const snapshot = normalizeSnapshot(sample, sampleName);
    process.stdout.write(wantsJson ? `${toAgentJson(snapshot)}\n` : `${formatText(snapshot, snapshot.checkedAt)}\n`);
    return;
  }

  if (command !== "status") throw new Error(`Unknown command: ${command}`);

  const file = flag("--file");
  const inline = flag("--json-input");
  const raw = file ? readFileSync(file, "utf8") : inline ?? process.env.LIMITCHECK_SNAPSHOT ?? await readStdin();
  if (!raw) {
    throw new Error("No input. Pipe JSON, use --file, set LIMITCHECK_SNAPSHOT, or run limitcheck sample.");
  }

  const snapshot = normalizeSnapshot(JSON.parse(raw), provider);
  process.stdout.write(wantsJson ? `${toAgentJson(snapshot)}\n` : `${formatText(snapshot)}\n`);
}

run().catch((error) => {
  process.stderr.write(`limitcheck: ${error.message}\n`);
  process.exitCode = 2;
});

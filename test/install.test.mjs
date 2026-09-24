import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installAgentGuidance, installGlobalAgentGuidance } from "../src/install.mjs";

test("installs agent guidance without overwriting workspace files", () => {
  const workspace = mkdtempSync(join(tmpdir(), "limitcheck-"));
  try {
    const first = installAgentGuidance(workspace);
    assert.equal(first.filter((entry) => entry.status === "created").length, 6);
    assert.match(readFileSync(join(workspace, "AGENTS.md"), "utf8"), /lowest `remainingPercent`/);
    assert.match(readFileSync(join(workspace, ".cursor/rules/limitcheck.mdc"), "utf8"), /alwaysApply: true/);

    const customAgents = "# Existing workspace guidance\n";
    const agentsPath = join(workspace, "AGENTS.md");
    rmSync(agentsPath);
    writeFileSync(agentsPath, customAgents);
    const second = installAgentGuidance(workspace);
    assert.equal(readFileSync(agentsPath, "utf8").startsWith(customAgents), true);
    assert.equal(second.filter((entry) => entry.status === "exists").length, 5);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("installs global guidance where agent homes are present", () => {
  const home = mkdtempSync(join(tmpdir(), "limitcheck-home-"));
  try {
    mkdirSync(join(home, ".codex"), { recursive: true });
    mkdirSync(join(home, ".cursor"), { recursive: true });
    const result = installGlobalAgentGuidance(home);
    assert.equal(result.some((entry) => entry.path === "~/.agents/skills/limitcheck/SKILL.md"), true);
    assert.equal(result.some((entry) => entry.path === "~/.codex/skills/limitcheck/SKILL.md"), true);
    assert.equal(result.some((entry) => entry.path === "~/.cursor/rules/limitcheck.mdc"), true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

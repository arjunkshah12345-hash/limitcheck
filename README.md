# limitcheck

Know your model's runway before you ship.

`limitcheck` is a tiny, provider-agnostic runway probe for coding agents. It turns whatever usage payload the harness can access into one compact answer: which limits exist, how much is left, and when each window resets.

This is for the model, not for a human dashboard. An agent checks it before a large task, pays attention to the weekly or monthly window, and changes its plan before it burns through the provider limit.

It is intentionally boring to integrate:

- shell in, JSON out;
- no vendor tokens stored by this project;
- no dashboard, daemon, or hosted account required;
- works anywhere an agent can run a command: Claude Code, Codex, Cursor, OpenCode, CrocBot, and custom harnesses.

## Install once

The package includes the CLI and the agent guidance. One command bootstraps the global CLI, detects the coding agents installed on the machine, and installs the runway instructions for them:

```bash
npx --yes limitcheck
```

After that, agents can call `limitcheck status --json` directly. If you prefer an explicit command, this is equivalent:

```bash
npx --yes limitcheck install
```

The bootstrap adds compatible guidance for Codex-style skills, Claude Code, Cursor rules, OpenCode, CrocBot when detected, and generic `AGENTS.md` / `CLAUDE.md` workspaces. It never overwrites existing guidance files.

## Try it

```bash
limitcheck sample codex
limitcheck sample cursor --json
```

Pipe a provider payload when you have a live adapter:

```bash
cat usage.json | limitcheck status --json
limitcheck status --file usage.json --provider codex
```

Human output is deliberately short:

```text
limitcheck · codex
5h window        62% left    · resets in 2h 16m
weekly           81% left    · resets in 4d
```

Machine output is stable JSON:

```json
{
  "version": 1,
  "provider": "codex",
  "checkedAt": "2026-09-23T20:04:00.000Z",
  "windows": [
    {
      "name": "5h window",
      "usedPercent": 38,
      "remainingPercent": 62,
      "unit": "percent",
      "resetAt": "2026-09-23T22:16:00.000Z"
    }
  ]
}
```

## The adapter boundary

Provider APIs and local auth surfaces change. `limitcheck` keeps that part outside the core: your harness fetches or computes usage, then gives `limitcheck` a small JSON payload.

These shapes are accepted:

```json
{ "provider": "codex", "rateLimits": { "fiveHour": { "usedPercent": 38 }, "weekly": { "usedPercent": 19 } } }
```

```json
{ "provider": "cursor", "usage": { "monthly": { "used": 560, "limit": 1000 } } }
```

```json
{ "provider": "anything", "windows": [{ "name": "team", "remainingPercent": 72 }] }
```

If a provider already exposes `usedPercent`, `remainingPercent`, or `used` + `limit`, the normalizer handles it. Vendor-specific auth stays with the agent or adapter that already owns it.

For a JavaScript adapter, use the core directly:

```js
import { normalizeSnapshot, formatText } from "limitcheck/src/limits.mjs";

const snapshot = normalizeSnapshot(providerResponse, "codex");
console.log(formatText(snapshot));
```

The agent-friendly contract is `limitcheck status --json`: one line of JSON on stdout, errors on stderr, and exit code `2` for invalid or missing input.

## Agent behavior

The installed skill tells agents to:

1. Run `limitcheck status --json` before high-context or multi-step work.
2. Read every window, especially `weekly`, `monthly`, and `secondary` limits.
3. Use the lowest `remainingPercent` as the conservative runway.
4. Split work below 25% remaining and avoid starting large work at or below 10%.
5. Never invent a provider limit when the harness has not exposed a usage payload.

The exact provider auth and usage fetch remain with the harness that already owns them. Limitcheck keeps the agent-facing command and decision rule stable.

## Commands

| Command | What it does |
| --- | --- |
| `limitcheck` | One-command bootstrap: install the CLI globally and wire up detected agents. |
| `limitcheck install` | Same bootstrap with an explicit command. |
| `limitcheck install --workspace-only` | Install only the current workspace files. |
| `limitcheck status` | Read JSON from stdin, `--file`, `--json-input`, or `LIMITCHECK_SNAPSHOT`. |
| `limitcheck status --json` | Emit normalized one-line JSON for an agent. |
| `limitcheck sample codex` | Print a safe local Codex-shaped example. |
| `limitcheck sample cursor` | Print a safe local Cursor-shaped example. |
| `limitcheck --help` | Show the compact usage guide. |

## Website

The landing page is static and Vercel-ready. Serve it locally with:

```bash
npm run dev
```

Run the checks with:

```bash
npm run check
```

## Create the GitHub repo

After committing locally, run the guarded helper below. It creates `arjunkshah12345-hash/limitcheck` if it does not exist, attaches `origin`, and pushes the current branch. It refuses to overwrite a mismatched remote or push a dirty worktree.

```bash
./scripts/create-and-push-github.sh
```

Preview the commands without making changes:

```bash
DRY_RUN=1 ./scripts/create-and-push-github.sh
```

The script expects an authenticated GitHub CLI session (`gh auth login`). Pass a different `owner/name` as its first argument or set `VISIBILITY=private` when needed.

## Visual direction

The site is an original Limitcheck identity with a warm paper background, editorial serif typography, marker-orange accents, small hand-drawn marks, and code-note details. It takes visual cues from [social-sdk.dev](https://social-sdk.dev/)—especially its friendly illustrated documentation feel—without copying its logo, copy, or product surface.

Brand assets are tracked in [`assets/`](assets/), with deployable site assets in [`public/`](public/).

## Status

The published package, installable agent guidance, protocol, and static site are ready for provider adapters. The adapter boundary is intentionally small so a change in a provider's private usage surface does not require changing the agent-facing command.

MIT licensed.

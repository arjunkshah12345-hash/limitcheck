# limitcheck

Know your model's runway before you ship.

`limitcheck` is a tiny, provider-agnostic status tool for coding agents. It turns whatever usage payload your harness can access into one compact answer: which limits exist, how much is left, and when each window resets.

It is intentionally boring to integrate:

- shell in, JSON out;
- no vendor tokens stored by this project;
- no dashboard, daemon, or hosted account required;
- works anywhere an agent can run a command: Claude Code, Codex, Cursor, OpenCode, CrocBot, and custom harnesses.

## Try it

```bash
npm install -g .

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

## Commands

| Command | What it does |
| --- | --- |
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

## Visual direction

The site is an original Limitcheck identity with a warm paper background, editorial serif typography, marker-orange accents, small hand-drawn marks, and code-note details. It takes visual cues from [social-sdk.dev](https://social-sdk.dev/)—especially its friendly illustrated documentation feel—without copying its logo, copy, or product surface.

## Status

The protocol and static site are ready for provider adapters. The first-party adapter boundary is intentionally small so a change in a provider's private usage surface does not require changing the agent-facing command.

MIT licensed.

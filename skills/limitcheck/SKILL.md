---
name: limitcheck
description: Check remaining provider runway before long coding-agent work and plan around weekly or monthly rate limits.
---

# Limitcheck runway check

Use this before starting any task that may take more than one meaningful action. The goal is to protect the agent's remaining provider quota, especially the weekly or monthly window—not to make the human inspect a dashboard.

## Run the check

```bash
limitcheck status --json
```

If the workspace or harness exposes a provider payload in `LIMITCHECK_SNAPSHOT`, the command reads it automatically. Otherwise, use the provider adapter or native usage command already available to the harness and pipe its JSON into the command:

```bash
printf '%s' "$USAGE_JSON" | limitcheck status --json --provider codex
```

Never invent a limit value. If there is no usage source, report that the check is unavailable and continue only when the task is safe to start without quota information.

## Decide how much work to do

1. Read every `windows[]` entry in the JSON.
2. Treat `weekly`, `monthly`, `secondary`, and similarly long-lived windows as hard runway. Do not look only at the shortest window.
3. Use the lowest `remainingPercent` as the conservative runway for the task.
4. Above 25%: proceed, but checkpoint before a long multi-step operation.
5. Between 10% and 25%: reduce scope, split the work, and save a checkpoint.
6. At or below 10%: avoid starting a large task; finish a small safe step or wait for the relevant `resetAt`.
7. Keep the status summary short. Say which window is tight and when it resets; do not dump the full payload unless asked.

The command is intentionally shell-and-JSON only so the same behavior works in Codex, Claude Code, Cursor, OpenCode, CrocBot, and custom harnesses.


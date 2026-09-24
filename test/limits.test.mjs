import test from "node:test";
import assert from "node:assert/strict";
import { formatReset, formatText, normalizeSnapshot } from "../src/limits.mjs";

const now = "2026-09-23T20:00:00.000Z";

test("normalizes Codex-style rate limits", () => {
  const snapshot = normalizeSnapshot({
    provider: "Codex",
    rateLimits: {
      fiveHour: { usedPercent: 38, resetAt: "2026-09-23T22:16:00.000Z" },
      weekly: { remainingPercent: 81, resetAt: "2026-09-28T17:00:00.000Z" },
    },
  });

  assert.equal(snapshot.provider, "codex");
  assert.deepEqual(snapshot.windows.map(({ name, remainingPercent }) => ({ name, remainingPercent })), [
    { name: "5h window", remainingPercent: 62 },
    { name: "weekly", remainingPercent: 81 },
  ]);
});

test("normalizes used and limit units", () => {
  const snapshot = normalizeSnapshot({
    provider: "cursor",
    usage: { monthly: { used: 560, limit: 1000, resetAt: "2026-10-01T00:00:00.000Z" } },
  });

  assert.equal(snapshot.windows[0].usedPercent, 56);
  assert.equal(snapshot.windows[0].remainingPercent, 44);
  assert.equal(snapshot.windows[0].limit, 1000);
});

test("formats compact output for an agent", () => {
  const snapshot = normalizeSnapshot({
    provider: "codex",
    windows: [{ name: "5h window", remainingPercent: 62, resetAt: "2026-09-23T22:16:00.000Z" }],
  });

  assert.equal(formatText(snapshot, now), "limitcheck · codex\n5h window         62% left     · resets in 2h 16m");
});

test("handles unknown reset times without throwing", () => {
  assert.equal(formatReset(undefined, now), "reset time unknown");
  assert.throws(() => normalizeSnapshot({ provider: "cursor", usage: {} }), /No rate-limit windows/);
});

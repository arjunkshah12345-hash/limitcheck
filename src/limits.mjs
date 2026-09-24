const PROVIDER_ALIASES = new Map([
  ["claude", "claude-code"],
  ["claude_code", "claude-code"],
  ["claude-code", "claude-code"],
  ["codex", "codex"],
  ["cursor", "cursor"],
  ["croc", "croc"],
  ["croc-bot", "croc"],
  ["croc_bot", "croc"],
  ["opencode", "opencode"],
  ["open-code", "opencode"],
]);

const KNOWN_WINDOW_NAMES = new Map([
  ["fivehour", "5h window"],
  ["five_hour", "5h window"],
  ["5h", "5h window"],
  ["primary", "primary window"],
  ["weekly", "weekly"],
  ["secondary", "secondary window"],
  ["monthly", "monthly"],
  ["month", "monthly"],
]);

export const DEMO_SNAPSHOTS = {
  codex: {
    provider: "codex",
    checkedAt: "2026-09-23T20:04:00.000Z",
    rateLimits: {
      fiveHour: { usedPercent: 38, resetAt: "2026-09-23T22:16:00.000Z" },
      weekly: { usedPercent: 19, resetAt: "2026-09-28T17:00:00.000Z" },
    },
  },
  cursor: {
    provider: "cursor",
    checkedAt: "2026-09-23T20:04:00.000Z",
    usage: {
      monthly: { usedPercent: 56, resetAt: "2026-10-01T00:00:00.000Z" },
    },
  },
};

export function normalizeProvider(value = "generic") {
  const key = String(value).trim().toLowerCase().replace(/\s+/g, "-");
  return PROVIDER_ALIASES.get(key) ?? (key || "generic");
}

function numberFrom(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanPercent(value) {
  const parsed = numberFrom(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(100, parsed));
}

function isWindowLike(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ["usedPercent", "remainingPercent", "used", "remaining", "limit", "resetAt", "resetsAt"]
    .some((key) => key in value);
}

function displayName(name, raw) {
  if (raw?.label) return String(raw.label);
  const normalized = String(name).toLowerCase().replace(/[\s-]/g, "");
  return KNOWN_WINDOW_NAMES.get(normalized) ?? String(name).replace(/[_-]/g, " ");
}

function normalizeWindow(name, raw) {
  const usedPercent = cleanPercent(raw.usedPercent ?? raw.used_percentage);
  const remainingPercent = cleanPercent(raw.remainingPercent ?? raw.remaining_percentage);
  const rawLimit = numberFrom(raw.limit ?? raw.total ?? raw.max);
  const rawUsed = numberFrom(raw.used);
  const rawRemaining = numberFrom(raw.remaining);

  let used = usedPercent;
  let remaining = remainingPercent;
  let limit = rawLimit;
  let unit = raw.unit ?? (usedPercent !== null || remainingPercent !== null ? "percent" : "units");

  if (used === null && remaining === null && rawUsed !== null && rawRemaining !== null) {
    limit = limit ?? rawUsed + rawRemaining;
    used = limit ? (rawUsed / limit) * 100 : 0;
    remaining = limit ? (rawRemaining / limit) * 100 : 100;
  } else if (used === null && rawUsed !== null && limit !== null && limit > 0) {
    used = (rawUsed / limit) * 100;
  } else if (remaining === null && rawRemaining !== null && limit !== null && limit > 0) {
    remaining = (rawRemaining / limit) * 100;
  }

  if (used === null && remaining !== null) used = 100 - remaining;
  if (remaining === null && used !== null) remaining = 100 - used;
  if (used === null && remaining === null) return null;

  return {
    name: displayName(name, raw),
    usedPercent: Math.round(Math.max(0, Math.min(100, used))),
    remainingPercent: Math.round(Math.max(0, Math.min(100, remaining))),
    ...(limit !== null ? { limit } : {}),
    unit,
    ...(raw.resetAt || raw.resetsAt ? { resetAt: raw.resetAt ?? raw.resetsAt } : {}),
  };
}

function collectWindows(source) {
  if (Array.isArray(source)) {
    return source.flatMap((item, index) => {
      if (!isWindowLike(item)) return [];
      return [[item.name ?? item.id ?? `window-${index + 1}`, item]];
    });
  }

  if (!source || typeof source !== "object") return [];

  return Object.entries(source).flatMap(([name, value]) => {
    if (isWindowLike(value)) return [[name, value]];
    if (value && typeof value === "object" && Array.isArray(value.windows)) {
      return collectWindows(value.windows);
    }
    return [];
  });
}

export function normalizeSnapshot(input, providerHint = "generic") {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("A JSON object with at least one rate-limit window is required.");
  }

  const provider = normalizeProvider(input.provider ?? input.platform ?? providerHint);
  const source = input.windows ?? input.rateLimits ?? input.limits ?? input.usage ?? input;
  const windows = collectWindows(source)
    .map(([name, raw]) => normalizeWindow(name, raw))
    .filter(Boolean);

  if (!windows.length) {
    throw new TypeError("No rate-limit windows found. Expected usedPercent, remainingPercent, or used/limit.");
  }

  return {
    version: 1,
    provider,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    windows,
  };
}

function durationUntil(resetAt, now) {
  if (!resetAt) return null;
  const milliseconds = new Date(resetAt).getTime() - new Date(now).getTime();
  if (!Number.isFinite(milliseconds)) return null;
  if (milliseconds <= 0) return "now";
  const minutes = Math.ceil(milliseconds / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatReset(resetAt, now = new Date()) {
  const duration = durationUntil(resetAt, now);
  return duration ? `resets in ${duration}` : "reset time unknown";
}

export function formatText(snapshot, now = new Date()) {
  const lines = [`limitcheck · ${snapshot.provider}`];
  for (const window of snapshot.windows) {
    const remaining = `${window.remainingPercent}% left`.padEnd(12, " ");
    lines.push(`${window.name.padEnd(17, " ")} ${remaining} · ${formatReset(window.resetAt, now)}`);
  }
  return lines.join("\n");
}

export function toAgentJson(snapshot) {
  return JSON.stringify(snapshot);
}

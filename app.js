const samples = {
  codex: {
    title: "codex",
    windows: [
      { name: "5h window", remaining: 62, reset: "2h 16m" },
      { name: "weekly", remaining: 81, reset: "4d" },
    ],
    payload: {
      provider: "codex",
      rateLimits: {
        fiveHour: { usedPercent: 38, resetAt: "2026-09-23T22:16:00.000Z" },
        weekly: { usedPercent: 19, resetAt: "2026-09-28T17:00:00.000Z" },
      },
    },
  },
  cursor: {
    title: "cursor",
    windows: [{ name: "monthly", remaining: 44, reset: "8d" }],
    payload: {
      provider: "cursor",
      usage: { monthly: { usedPercent: 56, resetAt: "2026-10-01T00:00:00.000Z" } },
    },
  },
  generic: {
    title: "anything",
    windows: [{ name: "team budget", remaining: 72, reset: "unknown" }],
    payload: {
      provider: "anything",
      windows: [{ name: "team budget", remainingPercent: 72 }],
    },
  },
};

const windowList = document.querySelector("[data-window-list]");
const jsonPreview = document.querySelector("[data-json-preview]");
const providerTitle = document.querySelector("[data-provider-title]");
const toast = document.querySelector("[data-toast]");
let activeSample = "codex";
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast("Copy unavailable — select the text instead");
  }
}

function renderSample(name) {
  const sample = samples[name];
  activeSample = name;
  providerTitle.textContent = sample.title;
  windowList.replaceChildren();

  sample.windows.forEach((window) => {
    const row = document.createElement("div");
    row.className = "window-item";
    row.innerHTML = `
      <span class="window-name">${window.name}</span>
      <span class="window-bar"><span style="--remaining: ${window.remaining}%"></span></span>
      <span class="window-remaining">${window.remaining}%</span>
    `;
    windowList.append(row);
  });

  jsonPreview.textContent = JSON.stringify(sample.payload, null, 2);
  document.querySelectorAll("[data-sample]").forEach((button) => {
    const isActive = button.dataset.sample === name;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => renderSample(button.dataset.sample));
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copy, "Install command copied"));
});

document.querySelector("[data-copy-json]").addEventListener("click", () => {
  copyText(JSON.stringify(samples[activeSample].payload), "JSON payload copied");
});

const themeToggle = document.querySelector("[data-theme-toggle]");
const savedTheme = localStorage.getItem("limitcheck-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";

function updateThemeLabel() {
  const isDark = document.documentElement.dataset.theme === "dark";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.querySelector("span").textContent = isDark ? "☼" : "◐";
}

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  if (isDark) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = "dark";
  localStorage.setItem("limitcheck-theme", isDark ? "light" : "dark");
  updateThemeLabel();
});

updateThemeLabel();
renderSample("codex");

const toast = document.querySelector("[data-toast]");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1600);
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      showToast("copied");
    } catch {
      showToast("copy unavailable");
    }
  });
});

const snapshots = {
  codex: [["5h window", "2h 16m", "62%", "62%"], ["weekly", "4d", "81%", "81%"]],
  cursor: [["monthly", "8d", "44%", "44%"]],
  generic: [["team budget", "unknown", "72%", "72%"]],
};

const companionNames = {
  intro: "the premise",
  status: "the answer",
  install: "one command",
  plan: "the plan",
  finish: "ship with context",
};

function showCompanion(step) {
  document.querySelectorAll("[data-companion]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.companion === step);
  });
  document.querySelector("[data-companion-label]").textContent = companionNames[step] || companionNames.intro;
}

const storyBlocks = document.querySelectorAll("[data-step]");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) showCompanion(entry.target.dataset.step);
    });
  }, { rootMargin: "-35% 0px -45%", threshold: 0 });
  storyBlocks.forEach((block) => observer.observe(block));
}
showCompanion("intro");

document.querySelectorAll("[data-provider]").forEach((button) => {
  button.addEventListener("click", () => {
    const snapshot = snapshots[button.dataset.provider];
    document.querySelectorAll("[data-provider]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll("[data-window-name]").forEach((item, index) => {
      const row = snapshot[index];
      item.closest(".window-row").hidden = !row;
      if (row) {
        item.textContent = row[0];
        document.querySelector(`[data-window-reset="${index}"]`).textContent = row[1];
        document.querySelector(`[data-window-value="${index}"]`).textContent = row[2];
        document.querySelector(`[data-meter="${index}"]`).style.setProperty("--meter", row[3]);
      }
    });
  });
});

const modeToggle = document.querySelector("[data-mode-toggle]");
const savedTheme = localStorage.getItem("limitcheck-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";
function updateModeLabel() {
  const dark = document.documentElement.dataset.theme === "dark";
  modeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}
modeToggle.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  localStorage.setItem("limitcheck-theme", dark ? "light" : "dark");
  updateModeLabel();
});
updateModeLabel();

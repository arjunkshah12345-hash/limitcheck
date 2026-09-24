const toast = document.querySelector("[data-toast]");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied to clipboard");
  } catch {
    showToast("Copy unavailable — select the text instead");
  }
}

document.querySelectorAll("[data-copy-value]").forEach((button) => {
  button.addEventListener("click", () => copyValue(button.dataset.copyValue));
});

const themeToggle = document.querySelector("[data-theme-toggle]");
const savedTheme = localStorage.getItem("limitcheck-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";

function updateThemeLabel() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

themeToggle.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  localStorage.setItem("limitcheck-theme", dark ? "light" : "dark");
  updateThemeLabel();
});
updateThemeLabel();

const THEME_KEY = "blog-theme";
const LIGHT = "light";
const DARK = "dark";
const SYSTEM = "system";

type ThemePreference = typeof LIGHT | typeof DARK | typeof SYSTEM;

function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === LIGHT || stored === DARK || stored === SYSTEM
    ? stored
    : SYSTEM;
}

function getPreferredTheme(): string {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === LIGHT || stored === DARK) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// Reuse the value already set by the inline FOUC-prevention script if available.
let themeValue = getPreferredTheme();
let themePreference = getThemePreference();

function reflect(): void {
  const root = document.firstElementChild;
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);
  document
    .querySelectorAll(".theme-trigger")
    .forEach(trigger =>
      trigger.setAttribute("aria-label", `主题设置（${themePreference}）`)
    );
  document
    .querySelectorAll<HTMLElement>("[data-theme-choice]")
    .forEach(item =>
      item.setAttribute(
        "aria-checked",
        String(item.dataset.themeChoice === themePreference)
      )
    );

  // Fill <meta name="theme-color"> with the computed background colour so
  // Android's browser chrome matches the page background.
  const bg = window.getComputedStyle(document.body).backgroundColor;
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);
}

function setup(): void {
  reflect();
}

window.addEventListener("blog-theme-change", event => {
  const choice = (event as CustomEvent<string>).detail;
  if (choice !== LIGHT && choice !== DARK && choice !== SYSTEM) return;
  localStorage.setItem(THEME_KEY, choice);
  themePreference = choice;
  themeValue =
    choice === SYSTEM
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? DARK
        : LIGHT
      : choice;
  reflect();
});

setup();

// Re-run after View Transitions navigation.
document.addEventListener("astro:after-swap", setup);

// Carry the theme-color value across View Transitions to prevent the
// Android navigation bar from flashing during page transitions.
document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", color);
  }
});

// Sync with OS-level dark/light preference changes.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => {
    if (localStorage.getItem(THEME_KEY) === SYSTEM) {
      themeValue = matches ? DARK : LIGHT;
      reflect();
    }
  });

(() => {
  const STORAGE_KEY = "99ag-theme-mode";
  const MODES = ["auto", "light", "dark"];
  const LIGHT_START_HOUR = 6;
  const DARK_START_HOUR = 19;
  const THEME_COLORS = {
    dark: "#000000",
    light: "#f5f5f7"
  };

  let mode = readStoredMode();
  let resolvedTheme = resolveThemeForDate(new Date(), mode);

  applyTheme(mode);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupThemeControls, { once: true });
  } else {
    setupThemeControls();
  }

  window.setInterval(() => {
    if (mode === "auto") {
      applyTheme(mode);
    }
  }, 60000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && mode === "auto") {
      applyTheme(mode);
    }
  });

  window.NinetyNineTheme = {
    getMode: () => mode,
    getTheme: () => resolvedTheme,
    setMode,
    resolveThemeForDate
  };

  function readStoredMode() {
    try {
      return normalizeMode(window.localStorage?.getItem(STORAGE_KEY));
    } catch {
      return "auto";
    }
  }

  function normalizeMode(value) {
    return MODES.includes(value) ? value : "auto";
  }

  function resolveThemeForDate(date, requestedMode = "auto") {
    const nextMode = normalizeMode(requestedMode);
    if (nextMode !== "auto") {
      return nextMode;
    }

    const hour = Number(date?.getHours?.() ?? new Date().getHours());
    return hour >= LIGHT_START_HOUR && hour < DARK_START_HOUR ? "light" : "dark";
  }

  function setMode(nextMode) {
    mode = normalizeMode(nextMode);
    try {
      window.localStorage?.setItem(STORAGE_KEY, mode);
    } catch {
      // Browsers may deny storage in private contexts; the live page state still updates.
    }
    applyTheme(mode);
  }

  function applyTheme(nextMode) {
    mode = normalizeMode(nextMode);
    resolvedTheme = resolveThemeForDate(new Date(), mode);

    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themeMode = mode;
    root.style.colorScheme = resolvedTheme;

    const themeMeta = getThemeMeta();
    themeMeta.setAttribute("content", THEME_COLORS[resolvedTheme]);
    updateControls();
  }

  function getThemeMeta() {
    const existing = document.querySelector('meta[name="theme-color"]');
    if (existing) {
      return existing;
    }

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
    return meta;
  }

  function setupThemeControls() {
    if (document.querySelector("[data-theme-switcher]")) {
      updateControls();
      return;
    }

    const switcher = document.createElement("div");
    switcher.className = "theme-switcher";
    if (document.querySelector(".archive-dock, .archive-bottom-dock")) {
      switcher.classList.add("with-dock");
    }
    switcher.dataset.themeSwitcher = "";
    switcher.setAttribute("aria-label", "Theme mode");
    switcher.append(
      createThemeButton("auto", "Automatic light and dark mode"),
      createThemeButton("light", "Light mode"),
      createThemeButton("dark", "Dark mode")
    );
    document.body.append(switcher);
    updateControls();
  }

  function createThemeButton(value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-choice";
    button.dataset.themeChoice = value;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.addEventListener("click", () => setMode(value));

    const glyph = document.createElement("span");
    glyph.className = `theme-glyph ${value}`;
    glyph.setAttribute("aria-hidden", "true");
    button.append(glyph);
    return button;
  }

  function updateControls() {
    for (const button of document.querySelectorAll("[data-theme-choice]")) {
      const active = button.dataset.themeChoice === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }
})();

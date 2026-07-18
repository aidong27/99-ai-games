(() => {
  const STORAGE_KEY = "99ag-theme-mode";
  const MODES = ["auto", "light", "dark"];
  const LIGHT_START_HOUR = 6;
  const DARK_START_HOUR = 19;
  const THEME_COLORS = {
    dark: "#0b0c0e",
    light: "#f5f6f8"
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
      document.body.classList.add("has-theme-switcher");
      updateControls();
      return;
    }

    const switcher = document.createElement("div");
    switcher.className = "theme-switcher";
    if (document.querySelector(".archive-dock, .archive-bottom-dock")) {
      switcher.classList.add("with-dock");
    }
    switcher.dataset.themeSwitcher = "";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Theme mode");

    const options = document.createElement("div");
    options.id = "theme-mode-options";
    options.className = "theme-options";
    options.append(
      createThemeButton("auto", "Automatic light and dark mode"),
      createThemeButton("light", "Light mode"),
      createThemeButton("dark", "Dark mode")
    );

    const trigger = createThemeTrigger(options.id);
    trigger.addEventListener("click", () => {
      setThemeOptionsOpen(switcher, !switcher.classList.contains("open"));
    });
    switcher.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && switcher.classList.contains("open")) {
        event.preventDefault();
        setThemeOptionsOpen(switcher, false);
        trigger.focus();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!switcher.contains(event.target)) {
        setThemeOptionsOpen(switcher, false);
      }
    });

    switcher.append(trigger, options);
    document.body.append(switcher);
    document.body.classList.add("has-theme-switcher");
    updateControls();
  }

  function createThemeTrigger(optionsId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-trigger";
    button.dataset.themeTrigger = "";
    button.setAttribute("aria-controls", optionsId);
    button.setAttribute("aria-expanded", "false");

    const glyph = document.createElement("span");
    glyph.className = `theme-glyph ${mode}`;
    glyph.setAttribute("aria-hidden", "true");
    button.append(glyph);
    return button;
  }

  function createThemeButton(value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-choice";
    button.dataset.themeChoice = value;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.addEventListener("click", () => {
      setMode(value);
      const switcher = button.closest("[data-theme-switcher]");
      if (switcher?.classList.contains("open")) {
        setThemeOptionsOpen(switcher, false);
        switcher.querySelector("[data-theme-trigger]")?.focus();
      }
    });

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

    const trigger = document.querySelector("[data-theme-trigger]");
    const triggerGlyph = trigger?.querySelector(".theme-glyph");
    if (trigger && triggerGlyph) {
      const modeLabel = mode === "auto" ? `Automatic, currently ${resolvedTheme}` : mode;
      const label = `Theme mode: ${modeLabel}. Open theme choices`;
      trigger.setAttribute("aria-label", label);
      trigger.title = label;
      triggerGlyph.className = `theme-glyph ${mode}`;
    }
  }

  function setThemeOptionsOpen(switcher, open) {
    switcher.classList.toggle("open", open);
    switcher.querySelector("[data-theme-trigger]")?.setAttribute("aria-expanded", open ? "true" : "false");
  }
})();

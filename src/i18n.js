(() => {
  const STORAGE_KEY = "99ag-language";
  const TRANSLATIONS = {
    "AI game-making evolution archive": "AI 游戏创作演进档案",
    "The games are playable. The real exhibit is the AI that made them.": "游戏可以游玩，真正的展品是创造它们的 AI。",
    "Open Library": "打开档案库",
    "Play Featured": "游玩精选",
    "Compare Models": "比较模型",
    "Library": "档案库",
    "Compare": "模型比较",
    "Press": "项目资料",
    "Log": "项目日志",
    "Manifest": "清单",
    "Observation Library": "观察档案库",
    "Model axis": "模型轴",
    "Current sample": "当前样本",
    "Select an observation": "选择观察样本",
    "Search": "搜索",
    "Hall": "展厅",
    "Sort": "排序",
    "Artwork": "视觉",
    "Evidence": "实机证据",
    "Posters": "宣传海报",
    "All halls": "全部展厅",
    "Newest observation": "最新观察",
    "Oldest observation": "最早观察",
    "Title A-Z": "标题 A-Z",
    "Model A-Z": "模型 A-Z",
    "Play": "游玩",
    "View Record": "查看记录",
    "Promo Page": "宣传页",
    "Open Metadata": "打开元数据",
    "Observation Record": "观察记录",
    "Play Gate": "进入游戏",
    "Metadata JSON": "元数据 JSON",
    "Archive Facts": "档案事实",
    "Useful links": "相关链接",
    "Project briefing": "项目简报",
    "Project timeline": "项目时间线",
    "Model Capability Matrix": "模型能力矩阵",
    "Model families": "模型家族",
    "Models observed": "已观察模型",
    "Model families in the archive": "档案中的模型家族",
    "Browse observations": "浏览观察样本",
    "Return home": "返回首页",
    "Observation not found": "未找到观察样本",
    "Promotional cover artwork · Not gameplay evidence": "宣传封面视觉 · 非实机证据",
    "Ready.": "就绪。",
    "Copy project summary": "复制项目简介",
    "Copy project link": "复制项目链接",
    "Install App": "安装应用"
  };
  const PLACEHOLDERS = {
    "Title, hall, model, tag": "搜索标题、展厅、模型或标签"
  };

  let language = readLanguage();
  applyLanguage();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }

  window.NinetyNineI18n = {
    getLanguage: () => language,
    setLanguage,
    t: (text) => language === "zh" ? TRANSLATIONS[text] ?? text : text
  };

  function setup() {
    translateTree(document.body);
    setupLanguageControl();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function readLanguage() {
    try {
      return window.localStorage?.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
    } catch {
      return "en";
    }
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage === "zh" ? "zh" : "en";
    try {
      window.localStorage?.setItem(STORAGE_KEY, language);
    } catch {
      // The live page can still change language when storage is unavailable.
    }
    applyLanguage();
    translateTree(document.body);
    updateLanguageControl();
  }

  function applyLanguage() {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = language;
  }

  function setupLanguageControl() {
    const switcher = document.querySelector("[data-theme-switcher]");
    if (!switcher || switcher.querySelector("[data-language-toggle]")) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-toggle";
    button.dataset.languageToggle = "";
    button.addEventListener("click", () => setLanguage(language === "en" ? "zh" : "en"));
    switcher.append(button);
    updateLanguageControl();
  }

  function updateLanguageControl() {
    const button = document.querySelector("[data-language-toggle]");
    if (!button) {
      return;
    }
    button.textContent = language === "en" ? "中" : "EN";
    const label = language === "en" ? "切换到中文" : "Switch to English";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function translateTree(root) {
    if (!root) {
      return;
    }
    const elements = root.matches?.("a, button, h1, h2, h3, p, span, dt, dd, label, option, strong, small")
      ? [root]
      : [];
    elements.push(...root.querySelectorAll?.("a, button, h1, h2, h3, p, span, dt, dd, label, option, strong, small") ?? []);
    for (const element of elements) {
      if (element.children.length === 0) {
        translateElement(element);
      }
    }
    const inputs = root.matches?.("input[placeholder]") ? [root] : [];
    inputs.push(...root.querySelectorAll?.("input[placeholder]") ?? []);
    for (const input of inputs) {
      input.dataset.i18nPlaceholder ??= input.placeholder;
      input.placeholder = language === "zh"
        ? PLACEHOLDERS[input.dataset.i18nPlaceholder] ?? input.dataset.i18nPlaceholder
        : input.dataset.i18nPlaceholder;
    }
  }

  function translateElement(element) {
    const current = element.textContent.trim();
    if (!current) {
      return;
    }
    element.dataset.i18nOriginal ??= current;
    const original = element.dataset.i18nOriginal;
    const translated = language === "zh" ? TRANSLATIONS[original] ?? original : original;
    if (current !== translated) {
      element.textContent = translated;
    }
  }
})();

(() => {
  const STORAGE_KEY = "99ag-language";
  const TRANSLATIONS = {
    "Home": "首页",
    "Challenge": "挑战",
    "Entries": "作品",
    "Method": "方法",
    "Legacy": "早期档案",
    "EVOLUTION BENCHMARK": "AI 编程演进档案",
    "One challenge. Same rules. Different AI.": "同一个挑战，同一套规则，不同的 AI。",
    "Explore Entries": "浏览作品",
    "Open Protocol 99": "查看统一挑战",
    "Read the method": "了解评测方法",
    "Current challenge": "当前挑战",
    "LOCKED": "已锁定",
    "Objective": "目标",
    "Run policy": "运行协议",
    "Benchmark seed": "基准种子",
    "3 cores · 3 relays · 1 extraction": "3 个核心 · 3 个中继 · 1 个出口",
    "Immutable Raw, separate Repair": "原始版本封存，修复单独记录",
    "Finalized Raw Entries": "已封存原始作品",
    "Allocated work orders": "已分配任务",
    "Legacy playable experiments": "早期可玩实验",
    "Transparent compliance points": "透明合规分值",
    "Latest verified game": "最新验证作品",
    "Same brief. Play the result.": "同一道题，体验真实作品。",
    "Verified builds": "已验证作品",
    "Playable AI coding-system builds of Protocol 99. Same prompt. Real browser evidence.": "AI 编程系统完成的 Protocol 99 作品。同一份提示词，真实浏览器证据。",
    "All Entries": "全部作品",
    "Standard Repair": "标准修复",
    "Title state": "标题画面",
    "Active gameplay": "游玩过程",
    "After relay one": "首个中继激活后",
    "Real victory": "真实通关",
    "Individual machine checks": "逐项机器检查",
    "Protocol 99 Entries": "Protocol 99 作品",
    "Open the full Entry index": "查看全部作品",
    "Controlled comparison": "受控对比",
    "What stays the same": "不变的标准",
    "One fixed objective": "统一任务目标",
    "Raw output stays raw": "保留原始作品",
    "Real browser proof": "真实浏览器证据",
    "Pre-Benchmark Era": "统一基准前的探索档案",
    "The original experiments remain playable": "早期实验，仍然可玩",
    "Open Legacy Archive": "打开早期档案",
    "Why the project changed": "为什么转向统一挑战",
    "Verified Raw": "原始版本已验证",
    "Identity unverified": "身份未经独立验证",
    "Family": "模型家族",
    "Agent": "编程工具",
    "Provider": "提供方",
    "Model": "模型",
    "Compliance": "合规分",
    "Finished": "完成日期",
    "Pending": "待验证",
    "Open record": "查看记录",
    "Play raw": "游玩原始版本",
    "Open game": "打开游戏",
    "Real gameplay capture": "真实游戏截图",
    "Entries under one fixed brief": "同一份任务下的作品",
    "Entry allocation": "作品编号分配",
    "Entry index": "作品索引",
    "Evidence-backed results": "证据支持的结果",
    "All model families": "全部模型家族",
    "All Agents": "全部编程工具",
    "Finalized only": "仅已封存",
    "All allocated Entries": "全部已分配作品",
    "Building / pending": "开发中 / 待验证",
    "Raw Runs": "原始版本",
    "Standard Repair available": "标准修复版本",
    "Any Run type": "所有版本类型",
    "Entry number": "作品编号",
    "Newest completion": "最近完成",
    "Compliance score": "合规分",
    "Clear filters": "清除筛选",
    "No Entries match these filters": "没有符合筛选条件的作品",
    "Adjust the family, Agent, Run, or verification filters.": "调整模型家族、编程工具、版本或验证状态筛选。",
    "Real browser evidence": "真实浏览器证据",
    "Automated Compliance": "自动合规检查",
    "Automated Compliance Score": "自动合规分",
    "Provenance and integrity": "来源与完整性",
    "Run history": "版本历史",
    "Known issues": "已知问题",
    "Tool environment": "工具环境",
    "Declared tool access": "声明的工具权限",
    "Verified browser": "实际验证浏览器",
    "Verification report": "验证报告",
    "Participant tests": "参赛测试源码",
    "Entry source": "作品源码",
    "Screenshots are captured from the source hash shown in this record.": "截图来自本记录源码哈希对应的真实运行。",
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
    "Search game, model, provider, or Agent": "搜索游戏、模型、提供方或编程工具",
    "Search model, provider, or Agent": "搜索模型、提供方或编程工具",
    "Title, hall, model, tag": "搜索标题、展厅、模型或标签"
  };
  const textRecords = new WeakMap();
  const placeholderRecords = new WeakMap();
  const SKIP = 'script, style, code, pre, textarea, [translate="no"], [data-i18n-skip]';

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
        if (record.type === "characterData" || record.type === "attributes") {
          translateTree(record.target);
        }
        for (const node of record.addedNodes) {
          translateTree(node);
        }
      }
    });
    observer.observe(document.body, {
      childList: true, characterData: true, subtree: true,
      attributes: true, attributeFilter: ["placeholder"]
    });
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
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) return translateText(root);
    if (root.closest?.(SKIP)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateText(walker.currentNode);
    const inputs = root.matches?.("input[placeholder]") ? [root] : [];
    inputs.push(...root.querySelectorAll?.("input[placeholder]") ?? []);
    for (const input of inputs) {
      if (input.closest(SKIP)) continue;
      const record = currentRecord(placeholderRecords, input, input.placeholder);
      const next = language === "zh" ? PLACEHOLDERS[record.source] ?? record.source : record.source;
      record.rendered = next;
      if (input.placeholder !== next) input.placeholder = next;
    }
  }

  function currentRecord(records, node, current) {
    let record = records.get(node);
    // Application updates are new source text, not a translation to restore later.
    if (!record || current !== record.rendered) {
      record = { source: current, rendered: current };
      records.set(node, record);
    }
    return record;
  }

  function translateText(node) {
    if (!node.parentElement || node.parentElement.closest(SKIP)) return;
    const record = currentRecord(textRecords, node, node.data);
    const original = record.source.trim();
    const translated = language === "zh" ? TRANSLATIONS[original] : undefined;
    const next = translated ? record.source.replace(original, translated) : record.source;
    record.rendered = next;
    if (node.data !== next) node.data = next;
  }
})();

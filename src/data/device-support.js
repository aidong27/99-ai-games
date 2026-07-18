export function getDeviceSupport(game) {
  const support = game?.deviceSupport ?? {};
  return {
    desktop: support.desktop ?? "limited",
    mobile: support.mobile ?? "limited",
    minViewport: support.minViewport ?? { width: 390, height: 700 },
    inputs: Array.isArray(support.inputs) ? support.inputs : [],
    mobileNotes: support.mobileNotes ?? "Device support metadata is incomplete.",
    launcherPolicy: support.launcherPolicy ?? "warn"
  };
}

export function getMobileSupportInfo(game) {
  const support = getDeviceSupport(game);

  if (support.mobile === "unsupported" || support.launcherPolicy === "block") {
    return {
      key: "unsupported",
      label: "Desktop recommended",
      shortLabel: "Desktop",
      tone: "danger",
      ctaLabel: "Desktop recommended",
      requiresWarning: true,
      blocksMobileStart: true,
      note: support.mobileNotes
    };
  }

  if (support.mobile === "limited" || support.launcherPolicy === "warn") {
    return {
      key: "limited",
      label: "Mobile limited",
      shortLabel: "Limited",
      tone: "warning",
      ctaLabel: "Play with warning",
      requiresWarning: true,
      blocksMobileStart: false,
      note: support.mobileNotes
    };
  }

  return {
    key: "supported",
    label: "Mobile supported",
    shortLabel: "Mobile ready",
    tone: "accent",
    ctaLabel: "Play",
    requiresWarning: false,
    blocksMobileStart: false,
    note: support.mobileNotes
  };
}

export function getRuntimeLaunchState(game) {
  const support = getDeviceSupport(game);
  if (!isMobileRuntime()) {
    return {
      key: support.desktop === "unsupported" ? "unsupported" : support.desktop,
      label: support.desktop === "unsupported" ? "Device unsupported" : "Desktop supported",
      canStart: support.desktop !== "unsupported",
      needsExplicitOpen: false,
      note: support.mobileNotes
    };
  }

  const mobile = getMobileSupportInfo(game);
  return {
    key: mobile.key,
    label: mobile.label,
    canStart: !mobile.blocksMobileStart,
    needsExplicitOpen: mobile.blocksMobileStart,
    note: mobile.note
  };
}

export function isMobileRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const narrow = window.matchMedia?.("(max-width: 740px)").matches ?? window.innerWidth <= 740;
  const touchTablet = (navigator.maxTouchPoints ?? 0) > 0 && window.innerWidth <= 1024;
  return narrow || touchTablet;
}

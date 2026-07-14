const MODEL_FAMILY_SELECTION_PREFIX = "family:";

const MODEL_FAMILY_RULES = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    providerName: "OpenAI",
    shortLabel: "GPT",
    order: 10,
    patterns: [/^gpt(?:[-\s]|$)/i, /^chatgpt(?:[-\s]|$)/i, /^o\d(?:[-\s]|$)/i]
  },
  {
    id: "claude",
    name: "Claude",
    providerName: "Anthropic",
    shortLabel: "CL",
    order: 20,
    patterns: [/^claude(?:[-\s]|$)/i]
  },
  {
    id: "kimi",
    name: "Kimi",
    providerName: "Moonshot AI",
    shortLabel: "KI",
    order: 30,
    patterns: [/^kimi(?:[-\s]|$)/i]
  },
  {
    id: "grok",
    name: "Grok",
    providerName: "xAI",
    shortLabel: "GR",
    order: 40,
    patterns: [/^grok(?:[-\s]|$)/i]
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    providerName: "DeepSeek",
    shortLabel: "DS",
    order: 50,
    patterns: [/^deepseek(?:[-\s]|$)/i]
  }
];

const OTHER_MODEL_FAMILY = {
  id: "other",
  name: "Other models",
  providerName: "Provider unclassified",
  shortLabel: "AI",
  order: 999
};

export function getModelFamily(modelName) {
  const normalizedName = String(modelName ?? "").trim();
  const rule = MODEL_FAMILY_RULES.find((entry) => (
    entry.patterns.some((pattern) => pattern.test(normalizedName))
  ));

  return rule ? toPublicFamily(rule) : { ...OTHER_MODEL_FAMILY };
}

export function getModelFamilySelection(familyOrId) {
  const familyId = typeof familyOrId === "string" ? familyOrId : familyOrId?.id;
  if (!familyId) {
    return "all";
  }
  return familyId.startsWith(MODEL_FAMILY_SELECTION_PREFIX)
    ? familyId
    : `${MODEL_FAMILY_SELECTION_PREFIX}${familyId}`;
}

export function getModelFamilyIdFromSelection(selection) {
  const value = String(selection ?? "");
  return value.startsWith(MODEL_FAMILY_SELECTION_PREFIX)
    ? value.slice(MODEL_FAMILY_SELECTION_PREFIX.length)
    : "";
}

function toPublicFamily(rule) {
  return {
    id: rule.id,
    name: rule.name,
    providerName: rule.providerName,
    shortLabel: rule.shortLabel,
    order: rule.order
  };
}

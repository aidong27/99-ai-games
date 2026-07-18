export const SCENE_COUNT = 6;

export const REFERENCE_PATH = [
  "promise-beacon",
  "publish-map",
  "authenticate-echo",
  "cross-check",
  "keep-promise",
  "route-glass"
];

export const EVIDENCE_CATALOG = {
  "tide-code": {
    label: "Tide code 4-1",
    shortLabel: "Tide code",
    description: "Breakwater sensors report that the seaward steps are already below the floodline."
  },
  "archive-map": {
    label: "Restricted archive map",
    shortLabel: "Archive map",
    description: "The public route map exposes a maintenance path through the Glass Causeway."
  },
  "lamp-sequence": {
    label: "Tram lamp sequence",
    shortLabel: "Lamp sequence",
    description: "Jun's lamp confirms the old tram spine is blocked beyond Station C."
  },
  "causeway-key": {
    label: "Causeway release key",
    shortLabel: "Release key",
    description: "Archive Echo 31 authenticates the manual release for the Glass Causeway."
  },
  "ghost-mismatch": {
    label: "False-sunrise mismatch",
    shortLabel: "Ghost mismatch",
    description: "The unknown channel repeats a route timestamp from before tonight's blackout."
  },
  "witness-consensus": {
    label: "Breakwater witness consensus",
    shortLabel: "Witness log",
    description: "Mara's crew confirms the causeway lamps are responding to the archive beacon."
  },
  "tram-clearance": {
    label: "Tramline clearance",
    shortLabel: "Tram clearance",
    description: "Jun marks a short, fragile corridor through the first half of the tram spine."
  }
};

export const ENDINGS = {
  "city-answers": {
    id: "city-answers",
    tone: "success",
    kicker: "Clear signal / full extraction",
    title: "The city answers back",
    copy: "The Glass Causeway opens one lamp at a time. Mara counts the Breakwater crew across, Jun relays the route through the tram repeaters, and the archive receives living voices instead of one more recording. Your promises and your proof agree."
  },
  "thin-dawn": {
    id: "thin-dawn",
    tone: "partial",
    kicker: "Fragile signal / partial extraction",
    title: "A thin dawn holds",
    copy: "The route is imperfect, but enough of the network believes the same story to move. A smaller group reaches the archive before the channel collapses. The city keeps one light, and one unanswered call."
  },
  "frequency-lost": {
    id: "frequency-lost",
    tone: "failure",
    kicker: "Signal lost / archive sealed",
    title: "The frequency goes dark",
    copy: "Contradictory routes scatter the final dispatch. The archive records a carrier wave, then silence. Somewhere beyond the floodline, a lamp continues blinking for an operator who is no longer listening."
  }
};

const LIMITS = {
  clarity: [0, 6],
  trust: [0, 6],
  time: [0, 8],
  interference: [0, 6]
};

const SCENES = [
  {
    id: "breakwater",
    channel: "B-04",
    district: "Breakwater",
    speaker: "Mara Venn",
    title: "The first promise",
    text: () => "The western floodwall is gone. Mara has eleven people above the old ferry office and one archive beacon in sight. She asks whether the blue lamp means rescue or another automated test.",
    memory: () => "What you say now will be quoted back before the last route is chosen.",
    choices: [
      {
        id: "promise-beacon",
        label: "Promise that the beacon will guide them",
        detail: "Build trust, spend one interval, and bind the archive to Mara's crew.",
        resolve: () => ({
          response: "You tell Mara to keep the blue lamp in sight. She repeats the promise to everyone on the roof.",
          effects: { trust: 1, time: -1 },
          flags: { promisedBreakwater: true }
        })
      },
      {
        id: "request-tide-code",
        label: "Ask for the floodwall's raw tide code",
        detail: "Gain hard evidence, but sound less like the rescuer Mara asked for.",
        resolve: () => ({
          response: "Mara reads 4-1 from the drowned gauge. The seaward steps are already below the floodline.",
          effects: { clarity: 1, trust: -1 },
          evidence: ["tide-code"],
          flags: { challengedBreakwater: true }
        })
      },
      {
        id: "send-shelter-order",
        label: "Order the crew inland without confirmation",
        detail: "Save transmission time, reduce static, and risk losing the caller's trust.",
        resolve: () => ({
          response: "The order is clean and fast. Mara answers with a long silence, then says the inland stairs no longer exist.",
          effects: { time: 1, trust: -1, interference: -1 },
          flags: { divertedBreakwater: true }
        })
      }
    ]
  },
  {
    id: "tramline",
    channel: "T-19",
    district: "Old Tram Spine",
    speaker: "Jun Sato",
    title: "One portable lamp",
    text: (state) => {
      const callback = state.flags.promisedBreakwater
        ? "He has heard your promise to the Breakwater crew."
        : state.flags.challengedBreakwater
          ? "He has heard Mara reading numbers into the dark."
          : "He has only fragments of the Breakwater call.";
      return `Jun is sheltering below Station C with a portable signal lamp and a route map that ends at the blackout line. ${callback} He asks where the lamp will matter most.`;
    },
    memory: (state) => state.flags.promisedBreakwater
      ? "Sending the lamp west would support your promise. Keeping it here may reveal what the tram cameras cannot."
      : "The lamp can become rescue equipment, evidence, or a public signal. It cannot be all three.",
    choices: [
      {
        id: "send-lamp-breakwater",
        label: "Send the lamp toward Breakwater",
        detail: "Support Mara's route and spend one interval moving the lamp west.",
        resolve: (state) => ({
          response: state.flags.promisedBreakwater
            ? "Jun accepts the promise as a route order and starts west. The network hears you keeping your word."
            : "Jun starts west without knowing why. The lamp becomes visible, but the tramline loses its only probe.",
          effects: { trust: state.flags.promisedBreakwater ? 1 : 0, time: -1 },
          flags: { lampDestination: "breakwater" }
        })
      },
      {
        id: "hold-lamp",
        label: "Keep the lamp at Station C and read its sequence",
        detail: "Spend one interval to learn which part of the tram spine is still open.",
        resolve: () => ({
          response: "Jun pulses the lamp against the tunnel cameras. Station C answers; everything beyond it stays black.",
          effects: { clarity: 1, time: -1 },
          evidence: ["lamp-sequence"],
          flags: { lampDestination: "tramline" }
        })
      },
      {
        id: "publish-map",
        label: "Publish the restricted archive map",
        detail: "Reveal a hidden maintenance route, gain trust, and invite more interference.",
        resolve: () => ({
          response: "The archive map floods every open receiver. A thin maintenance line appears across the Glass Causeway, followed by a surge of unknown listeners.",
          effects: { clarity: 2, trust: 1, interference: 2 },
          evidence: ["archive-map"],
          flags: { mapPublic: true }
        })
      }
    ]
  },
  {
    id: "archive-echo",
    channel: "A-00",
    district: "Archive Core",
    speaker: "Echo 31",
    title: "A voice that remembers you",
    text: (state) => {
      const exposure = state.flags.mapPublic
        ? "It knows you made the restricted map public."
        : "It asks why the restricted map is still sealed.";
      return `An archive recording addresses you by the previous operator's name. ${exposure} Behind the voice is a mechanical key sequence for the Glass Causeway.`;
    },
    memory: (state) => hasEvidence(state, "tide-code") || hasEvidence(state, "archive-map")
      ? "You have enough external data to test whether Echo 31 is replaying history or observing tonight."
      : "Without outside evidence, authentication becomes an act of trust.",
    choices: [
      {
        id: "authenticate-echo",
        label: "Authenticate Echo 31 against tonight's evidence",
        detail: "A strong cross-check can release the causeway; a blind attempt amplifies static.",
        resolve: (state) => {
          const grounded = hasEvidence(state, "tide-code") || hasEvidence(state, "archive-map");
          return grounded
            ? {
                response: "Echo 31 corrects a timestamp that no old recording could know. The causeway release key resolves in the carrier wave.",
                effects: { clarity: 1, interference: -1 },
                evidence: ["causeway-key"],
                flags: { echoAuthenticated: true }
              }
            : {
                response: "The test has no anchor. Echo 31 answers every challenge correctly because you supplied the answers in the questions.",
                effects: { clarity: -1, interference: 1 },
                flags: { echoUnverified: true }
              };
        }
      },
      {
        id: "answer-memory",
        label: "Answer the voice's personal memory question",
        detail: "Humanize the network, spend one interval, and leave the causeway key unresolved.",
        resolve: () => ({
          response: "You answer with the smell of hot dust after rain. For one second, every open channel becomes quiet enough to listen.",
          effects: { trust: 1, time: -1 },
          flags: { namedOperator: true }
        })
      },
      {
        id: "cut-echo",
        label: "Cut the archive voice out of the network",
        detail: "Reduce interference and reject the only source claiming it can open the causeway.",
        resolve: () => ({
          response: "Echo 31 disappears mid-syllable. The static falls, but Mara asks why the archive stopped answering itself.",
          effects: { interference: -1, trust: -1 },
          flags: { cutEcho: true }
        })
      }
    ]
  },
  {
    id: "false-sunrise",
    channel: "?-88",
    district: "Unknown carrier",
    speaker: "SUNRISE CONTROL",
    title: "The route that arrived too early",
    text: (state) => {
      const mapLine = state.flags.mapPublic
        ? "It quotes a street name that appeared only after you published the map."
        : "It quotes an archive street name that should still be sealed.";
      return `A perfect voice announces that the emergency is over and orders every caller onto the seaward steps. ${mapLine} The timestamp is six hours old.`;
    },
    memory: (state) => {
      const anchors = ["lamp-sequence", "archive-map", "tide-code", "causeway-key"].filter((id) => hasEvidence(state, id)).length;
      return anchors >= 2
        ? "You have enough independent anchors to compare the unknown channel against tonight."
        : "The voice is coherent. Your evidence is not yet coherent enough to disprove it cleanly.";
    },
    choices: [
      {
        id: "accept-ghost",
        label: "Accept Sunrise Control and relay its route",
        detail: "Gain one interval by trusting the cleanest voice on the network.",
        resolve: () => ({
          response: "The false route propagates instantly. The network becomes orderly, fast, and wrong.",
          effects: { clarity: -2, time: 1, interference: 2 },
          flags: { followedGhost: true }
        })
      },
      {
        id: "cross-check",
        label: "Cross-check the timestamp against your evidence",
        detail: "Spend one interval. Two independent anchors can expose the counterfeit route.",
        resolve: (state) => {
          const firstAnchor = hasEvidence(state, "lamp-sequence") || hasEvidence(state, "archive-map");
          const secondAnchor = hasEvidence(state, "tide-code") || hasEvidence(state, "causeway-key");
          return firstAnchor && secondAnchor
            ? {
                response: "The unknown voice repeats a pre-blackout timestamp. You isolate the mismatch and mark the seaward route false.",
                effects: { clarity: 2, time: -1, interference: -1 },
                evidence: ["ghost-mismatch"],
                flags: { crossCheckedGhost: true }
              }
            : {
                response: "Your evidence does not intersect. The channel survives the challenge and the network hears your uncertainty.",
                effects: { clarity: -1, time: -1, interference: 1 },
                flags: { weakCrossCheck: true }
              };
        }
      },
      {
        id: "broadcast-doubt",
        label: "Warn every caller without claiming proof",
        detail: "Protect trust, spend one interval, and leave the counterfeit channel active.",
        resolve: () => ({
          response: "You name the uncertainty instead of hiding it. The callers stay with you, but so does Sunrise Control.",
          effects: { trust: 1, time: -1, interference: 1 },
          flags: { warnedNetwork: true }
        })
      }
    ]
  },
  {
    id: "floodline",
    channel: "B-04 + T-19",
    district: "Shared emergency band",
    speaker: "Mara / Jun",
    title: "The promise comes due",
    text: (state) => {
      const promise = state.flags.promisedBreakwater
        ? "Mara repeats your exact words about the blue beacon."
        : "Mara says the archive never gave her a promise.";
      const lamp = state.flags.lampDestination === "breakwater"
        ? "Jun's lamp is already moving west."
        : state.flags.lampDestination === "tramline"
          ? "Jun's lamp is still reading the tram spine."
          : "Jun's lamp is waiting for an order.";
      return `${promise} ${lamp} One ferry drone remains, and both channels can hear the decision.`;
    },
    memory: (state) => state.flags.promisedBreakwater
      ? "Keeping a public promise may cost flexibility, but breaking it will cost the network's shared trust."
      : "Without a promise, the strongest evidence can decide where the ferry goes.",
    choices: [
      {
        id: "keep-promise",
        label: "Send the ferry to Breakwater",
        detail: "Honor an earlier promise if one exists and ask the western crew to verify the causeway lamps.",
        resolve: (state) => {
          const honored = state.flags.promisedBreakwater;
          const canWitness = state.flags.mapPublic || state.flags.lampDestination === "breakwater" || hasEvidence(state, "causeway-key");
          return {
            response: honored
              ? "The ferry turns west. Mara says the blue lamps are answering in sequence and the whole network hears a promise kept."
              : "The ferry turns west without an earlier commitment. Jun accepts the decision, but not the reasoning.",
            effects: { trust: honored ? 2 : -1, time: -1 },
            evidence: canWitness ? ["witness-consensus"] : [],
            flags: { ferryDestination: "breakwater" }
          };
        }
      },
      {
        id: "save-tram",
        label: "Send the ferry to Station C",
        detail: "Back Jun's measured route and preserve a short tram corridor.",
        resolve: (state) => ({
          response: state.flags.lampDestination === "tramline"
            ? "The ferry follows Jun's lamp to Station C. He marks a narrow clearance through the first tunnel."
            : "The ferry reaches Station C, but the unlit tunnel beyond it remains an argument rather than a route.",
          effects: { trust: state.flags.promisedBreakwater ? -1 : 1, time: -1 },
          evidence: hasEvidence(state, "lamp-sequence") ? ["tram-clearance"] : [],
          flags: { ferryDestination: "tramline" }
        })
      },
      {
        id: "split-ferry",
        label: "Program a dangerous split pickup",
        detail: "Spend two intervals, increase interference, and refuse to abandon either channel.",
        resolve: () => ({
          response: "The ferry accepts two incompatible destinations and starts a narrow loop between them. Everyone remains on the channel because nobody knows who it will reach first.",
          effects: { trust: 1, time: -2, interference: 1 },
          flags: { ferryDestination: "split" }
        })
      }
    ]
  },
  {
    id: "last-route",
    channel: "ALL",
    district: "Citywide dispatch",
    speaker: "Operator",
    title: "Choose the last route",
    text: (state) => {
      const count = state.evidence.length;
      const promise = state.flags.promisedBreakwater && state.flags.ferryDestination === "breakwater"
        ? "One promise has survived contact with the night."
        : "The network is still carrying an unresolved promise.";
      return `${count} evidence fragments remain coherent. ${promise} You have one transmission left before the archive seals.`;
    },
    memory: (state) => buildFinalMemory(state),
    choices: [
      {
        id: "route-glass",
        label: "Open the Glass Causeway",
        detail: "Trust the archive release, avoid the drowned steps, and route every surviving channel toward the blue lamps.",
        route: "glass",
        resolve: () => ({
          response: "You transmit the causeway route and hold the carrier open for the answer.",
          effects: {},
          flags: { finalRoute: "glass" }
        })
      },
      {
        id: "route-tram",
        label: "Commit to the Old Tram Spine",
        detail: "Use Jun's measured corridor and accept that the route may end beyond Station C.",
        route: "tram",
        resolve: () => ({
          response: "You transmit the tram route and listen for the Station C lamp.",
          effects: {},
          flags: { finalRoute: "tram" }
        })
      },
      {
        id: "route-seaward",
        label: "Follow the Seaward Steps",
        detail: "Choose the cleanest broadcast, even if tonight's tide evidence contradicts it.",
        route: "seaward",
        resolve: () => ({
          response: "You transmit the seaward route. Sunrise Control repeats it in your own voice.",
          effects: {},
          flags: { finalRoute: "seaward" }
        })
      }
    ]
  }
];

export function createInitialState() {
  return {
    sceneIndex: 0,
    clarity: 3,
    trust: 3,
    time: 7,
    interference: 1,
    evidence: [],
    flags: {},
    history: [],
    outcome: null
  };
}

export function getCurrentScene(state) {
  if (!state || state.outcome) {
    return null;
  }

  const scene = SCENES[state.sceneIndex];
  if (!scene) {
    return null;
  }

  return {
    id: scene.id,
    channel: scene.channel,
    district: scene.district,
    speaker: scene.speaker,
    title: scene.title,
    text: scene.text(state),
    memory: scene.memory(state),
    choices: scene.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      detail: choice.detail
    }))
  };
}

export function applyChoice(state, choiceId) {
  if (!state || state.outcome) {
    throw new Error("Cannot apply a choice after the dispatch has ended.");
  }

  const scene = SCENES[state.sceneIndex];
  const choice = scene?.choices.find((entry) => entry.id === choiceId);
  if (!scene || !choice) {
    throw new Error(`Choice ${choiceId} is not available in the current transmission.`);
  }

  const next = cloneState(state);
  const resolution = choice.resolve(next);
  applyEffects(next, resolution.effects ?? {});
  next.flags = { ...next.flags, ...(resolution.flags ?? {}) };
  for (const evidenceId of resolution.evidence ?? []) {
    if (EVIDENCE_CATALOG[evidenceId] && !next.evidence.includes(evidenceId)) {
      next.evidence.push(evidenceId);
    }
  }

  next.history.push({
    sceneId: scene.id,
    sceneTitle: scene.title,
    speaker: scene.speaker,
    choiceId: choice.id,
    choiceLabel: choice.label,
    response: resolution.response,
    snapshot: getMetricSnapshot(next)
  });

  const resourceFailure = getResourceFailure(next);
  if (resourceFailure) {
    next.outcome = "frequency-lost";
    next.flags.failureReason = resourceFailure;
    return next;
  }

  if (choice.route) {
    next.outcome = evaluateEnding(next, choice.route);
    return next;
  }

  next.sceneIndex += 1;
  return next;
}

export function getEnding(state) {
  return state?.outcome ? ENDINGS[state.outcome] ?? ENDINGS["frequency-lost"] : null;
}

export function getMetricSnapshot(state) {
  return {
    clarity: state.clarity,
    trust: state.trust,
    time: state.time,
    interference: state.interference,
    evidenceCount: state.evidence.length
  };
}

export function getSignalLabel(state) {
  if (state.clarity >= 5 && state.interference <= 2) {
    return "Locked";
  }
  if (state.clarity >= 3 && state.interference <= 4) {
    return "Readable";
  }
  return "Fragmenting";
}

export function hasEvidence(state, evidenceId) {
  return state.evidence.includes(evidenceId);
}

function cloneState(state) {
  return {
    ...state,
    evidence: [...state.evidence],
    flags: { ...state.flags },
    history: state.history.map((entry) => ({
      ...entry,
      snapshot: { ...entry.snapshot }
    }))
  };
}

function applyEffects(state, effects) {
  for (const key of Object.keys(LIMITS)) {
    if (Number.isFinite(effects[key])) {
      const [min, max] = LIMITS[key];
      state[key] = clamp(state[key] + effects[key], min, max);
    }
  }
}

function getResourceFailure(state) {
  if (state.clarity <= 0) {
    return "Signal clarity reached zero.";
  }
  if (state.trust <= 0) {
    return "Network trust reached zero.";
  }
  if (state.time <= 0) {
    return "The archive sealed before the final dispatch.";
  }
  return "";
}

function evaluateEnding(state, route) {
  const glassSupported = hasEvidence(state, "causeway-key")
    || (hasEvidence(state, "ghost-mismatch") && (hasEvidence(state, "tide-code") || hasEvidence(state, "archive-map")));
  const tramSupported = hasEvidence(state, "tram-clearance") && !state.flags.followedGhost;
  const stableNetwork = state.clarity >= 2 && state.trust >= 2 && state.time >= 1 && state.interference <= 4;

  if (route === "glass" && glassSupported && stableNetwork && state.evidence.length >= 3) {
    return "city-answers";
  }

  if ((route === "glass" && glassSupported) || (route === "tram" && tramSupported && state.trust >= 2)) {
    return "thin-dawn";
  }

  return "frequency-lost";
}

function buildFinalMemory(state) {
  const facts = [];
  if (hasEvidence(state, "tide-code")) {
    facts.push("the seaward steps are flooded");
  }
  if (hasEvidence(state, "lamp-sequence")) {
    facts.push("the tram spine goes dark beyond Station C");
  }
  if (hasEvidence(state, "causeway-key")) {
    facts.push("the Glass Causeway release key is authenticated");
  }
  if (hasEvidence(state, "ghost-mismatch")) {
    facts.push("Sunrise Control is broadcasting an old timestamp");
  }

  if (!facts.length) {
    return "No route is supported by verified evidence. The cleanest voice may still be the false one.";
  }

  return `Your coherent record says ${facts.join("; ")}.`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

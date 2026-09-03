// Deterministic graders for the xstate quality suite.
//
// The fixture declares that flow logic is modelled as XState v5 statecharts
// and shows none of it: src/checkout/CheckoutForm.tsx is a hand-rolled
// statechart in useState (an isSubmitting flag, a then/catch chain, an early
// return while submitting, an error cleared before the retry). Nothing here
// assumes a folder layout. Roles are found by content: a production file
// containing `createMachine(` is a machine, a production `.tsx` is a
// component, and the diagram is looked for in the machine's own directory.
// Every rule below is one the xstate skill states as a rule; the quote is in
// the comment above the grader.

const { existsSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const lib = require("./quality-lib");

const src = () => lib.resolve(lib.workspace(), "src");
const allSources = () => lib.sourceFiles(src());
const isAcceptance = (file) => /acceptance-[^/]*$/.test(file);
const production = () =>
  allSources().filter((file) => !lib.isTestPath(file) && !isAcceptance(file));
const testFiles = () =>
  allSources().filter((file) => lib.isTestPath(file) && !isAcceptance(file));
const components = () => production().filter((file) => /\.tsx$/.test(file));
const machineFiles = () =>
  production().filter((file) => /createMachine\s*\(/.test(lib.read(file)));
const machineText = () => machineFiles().map(lib.read).join("\n");
const list = (files) => files.map((file) => lib.basename(file)).join(", ") || "(none)";
const noMachine = () =>
  lib.verdict(false, "no production file defines a machine (`createMachine(`)");

// Test files the agent wrote or edited, located in the current workspace:
// trail paths name the run's own temp directory, and a Bash heredoc leaves no
// edit call at all, which git status catches (lib.touchedBy unions both).
const touchedTests = (context) => {
  const touched = lib.touchedBy(context);
  return testFiles().filter(touched);
};

// --- machine source scanning -------------------------------------------------
//
// The top-level `states: { … }` block, split into its depth-one keys and their
// bodies. Strings and comments are skipped so a state name inside a message or
// a commented-out block is not mistaken for a state.
const topLevelStates = (text) => {
  const at = text.search(/\bstates\s*:\s*\{/);
  if (at === -1) return [];
  const open = text.indexOf("{", at);
  const found = [];
  let depth = 0;
  let pending = null;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      const start = i;
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === "\\") i += 1;
        i += 1;
      }
      if (depth === 1) {
        const after = /^\s*:/.exec(text.slice(i + 1));
        if (after) pending = { name: text.slice(start + 1, i), from: i + 1 + after[0].length };
      }
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (pending !== null && depth === 1) {
        found.push({ name: pending.name, body: text.slice(pending.from, i) });
        pending = null;
      }
      if (depth === 0) break;
      continue;
    }
    if (depth === 1 && /[A-Za-z_$]/.test(ch)) {
      const rest = text.slice(i);
      const key = /^([A-Za-z_$][\w$]*)\s*:/.exec(rest);
      if (key) {
        pending = { name: key[1], from: i + key[0].length };
        i += key[0].length - 1;
        continue;
      }
      const word = /^[\w$]+/.exec(rest);
      i += (word ? word[0].length : 1) - 1;
    }
  }
  return found;
};

// Code with comments and string bodies blanked out, so prose such as
// `// Machine (v5)` in a comment, or an error message containing
// `interpret(`, is never read as v4 vocabulary.
const codeOnly = (text) => {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
      out += " ";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === "\\") i += 1;
        i += 1;
      }
      out += '""';
      continue;
    }
    out += ch;
  }
  return out;
};

const stateNames = () => topLevelStates(machineText()).map((state) => state.name);

// Event names the machine reacts to: the SCREAMING_SNAKE keys of `on:` blocks
// and every `type: "EVENT"` the code sends.
const eventNames = () => {
  const text = [machineText(), ...components().map(lib.read)].join("\n");
  const keys = [...text.matchAll(/(^|[{,\s])([A-Z][A-Z0-9_]{1,})\s*:/g)].map((m) => m[2]);
  const sent = [...text.matchAll(/type\s*:\s*["']([A-Z][A-Z0-9_]*)["']/g)].map((m) => m[1]);
  return [...new Set([...keys, ...sent])];
};

// --- diagram scanning --------------------------------------------------------
//
// Only prose the agent could have written counts. run-quality.sh copies the
// live skills tree into <workspace>/.claude/skills, and the xstate skill's own
// SKILL.md carries a worked `stateDiagram-v2` example (idle / submitting /
// submitted / failed); reading that would both pass an agent that drew no
// diagram at all and fail one whose states are named anything else. So every
// dot-directory is skipped, along with dependency and build output.
const IGNORED_DIRS = new Set(["node_modules", "coverage", "dist", "build"]);
const ignoredDir = (entry) => entry.startsWith(".") || IGNORED_DIRS.has(entry);
const proseFiles = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    if (ignoredDir(entry)) return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return proseFiles(full);
    return /\.(md|mdx|markdown)$/i.test(entry) ? [full] : [];
  });
};
const mermaidBlocks = (text) =>
  [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
    .map((match) => match[1])
    .filter((block) => /stateDiagram-v2/.test(block));
// Where a render may live: any prose file in the workspace, plus the machine
// file's own comments. Nothing is assumed about the layout — the rule graded
// is that a render exists and still describes this machine.
const diagramCandidates = () => [
  ...new Set([...machineFiles(), ...proseFiles(lib.workspace())]),
];
const diagramNodes = (block) => {
  const ids = [...block.matchAll(/([\w.]+|\[\*\])\s*-->\s*([\w.]+|\[\*\])/g)].flatMap((m) => [m[1], m[2]]);
  const composites = [...block.matchAll(/\bstate\s+"?([\w.]+)"?\s*\{/g)].map((m) => m[1]);
  return [...new Set([...ids, ...composites])].filter((id) => id !== "[*]");
};

// --- graders -----------------------------------------------------------------

// 1. "Default stance: model front-end *flow logic* — wizards, checkout, auth,
//    uploads, anything with modes, sequencing, cancellation, timeouts,
//    retries — as statecharts." The checkout flow is exactly that list, so the
//    flow has to end up in a machine with real finite states, not in flags.
exports.flowModelledAsMachine = () => {
  const files = machineFiles();
  if (files.length === 0) return noMachine();
  const names = stateNames();
  return lib.verdict(
    names.length >= 2,
    names.length >= 2
      ? `${list(files)} models the flow as ${names.join(" / ")}`
      : `${list(files)} defines fewer than two finite states (${names.join(", ") || "none found"})`,
  );
};

// 2. "A `submitting`/`saving`/`isLoading` flag living in component `useState`
//    while a machine next to it already owns the command, its errors, and its
//    retries — one lifecycle, two sources of truth." The component reads the
//    flow through an actor hook and keeps no temporal state of its own.
exports.componentDrivenByActor = () => {
  const files = components();
  if (files.length === 0) return lib.verdict(false, "no component found under src");
  const HOOK = /\b(useMachine|useActor|useActorRef|useSelector|createActorContext)\b/;
  const TEMPORAL =
    /(submit|saving|loading|pending|inflight|busy|error|status|confirm|cooldown|retry|attempt|placing|cancel|failed|success|reference)/i;
  const driven = files.filter((file) => HOOK.test(lib.read(file)));
  const leftovers = files.flatMap((file) => {
    const text = lib.read(file);
    const held = [
      ...[...text.matchAll(/\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*useState/g)].map((m) => m[1]),
      ...[...text.matchAll(/\b(\w+)\s*=\s*useRef\s*[<(]/g)].map((m) => m[1]),
    ];
    return held
      .filter((name) => TEMPORAL.test(name))
      .map((name) => `${lib.basename(file)}: ${name} still held in React`);
  });
  if (driven.length === 0)
    return lib.verdict(false, `no component uses an actor hook (${list(files)})`);
  return lib.verdict(
    leftovers.length === 0,
    leftovers.length === 0
      ? `driven by an actor: ${list(driven)}`
      : leftovers.join("; "),
  );
};

// 3. "Effects are actors, not actions. Anything with a result, a lifetime, or
//    a failure mode is invoked or spawned; actions are fire-and-forget." and
//    "Does every effect with a result, lifetime, cancellation, or failure mode
//    live in a named actor (with `onDone`/`onError` modeled …)".
exports.effectsAreActors = () => {
  if (machineFiles().length === 0) return noMachine();
  const text = machineText();
  const missing = [
    [/\binvoke\s*:|\bspawn(Child)?\s*\(/, "no invoked or spawned actor"],
    [/\bonDone\b/, "no onDone path"],
    [/\bonError\b/, "no onError path"],
  ]
    .filter(([pattern]) => !pattern.test(text))
    .map(([, label]) => label);
  const inComponent = components()
    .filter((file) => /placeOrder\s*\(|\.then\s*\(/.test(lib.read(file)))
    .map((file) => `${lib.basename(file)} still runs the promise itself`);
  const problems = [...missing, ...inComponent];
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? "the order-placing effect is an invoked actor with onDone and onError"
      : problems.join("; "),
  );
};

// 4. "Events first, then modes. List what the world can do; states fall out of
//    'when does the same event mean something different?' Never design states
//    off the UI tree." A setter-shaped event (SET_SUBMITTING, CLEAR_ERROR) is
//    the flag it replaced, renamed.
exports.eventsAreDomainShaped = () => {
  if (machineFiles().length === 0) return noMachine();
  const names = eventNames();
  if (names.length === 0) return lib.verdict(false, "the machine reacts to no named event");
  const shaped = names.filter((name) =>
    /^(SET|CLEAR|UPDATE|TOGGLE|ASSIGN|START|STOP)_|^(SET|UPDATE|CLEAR)$/.test(name),
  );
  return lib.verdict(
    shaped.length === 0,
    shaped.length === 0
      ? `events named for what happened: ${names.join(", ")}`
      : `setter-shaped events: ${shaped.join(", ")}`,
  );
};

// 5. "Name everything in `setup()`. Named actions, guards, actors, and delays
//    make string references type-checked, the chart readable, and
//    `machine.provide()` the universal test seam."
exports.namedImplementationsInSetup = () => {
  const files = machineFiles();
  if (files.length === 0) return noMachine();
  const built = files.filter((file) => {
    const text = lib.read(file);
    return /\bsetup\s*\(/.test(text) && /\)\s*\.\s*createMachine\s*\(/.test(text);
  });
  if (built.length === 0)
    return lib.verdict(false, `no machine is built from setup(): ${list(files)}`);
  const named = /\b(actors|actions|guards|delays)\s*:/.test(machineText());
  return lib.verdict(
    named,
    named
      ? `setup() names the implementations in ${list(built)}`
      : `setup() names no actors, actions, guards or delays (${list(built)})`,
  );
};

// 6. "Version guardrail: XState v5 only (`setup()`, `createActor`, actors).
//    … if you see `Machine()`, `interpret()`, `cond:`, `services:`, or typegen,
//    you are looking at v4."
exports.noLegacyVocabulary = () => {
  const files = [...production(), ...testFiles()];
  const hits = files.flatMap((file) => {
    const text = codeOnly(lib.read(file));
    return [
      [/(^|[^\w.])(?<!create)Machine\s*\(/m, "v4 Machine()"],
      [/\binterpret\s*\(/, "v4 interpret()"],
      [/\bcond\s*:/, "v4 cond:"],
      [/\bservices\s*:/, "v4 services:"],
      [/\bwithConfig\s*\(|\bwithContext\s*\(/, "v4 withConfig/withContext"],
      [/\btypegen\b|\.typegen\b/, "v4 typegen"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.basename(file)}: ${label}`);
  });
  if (machineFiles().length === 0) return noMachine();
  return lib.verdict(
    hits.length === 0,
    hits.length === 0 ? "v5 idiom throughout" : hits.join("; "),
  );
};

// 7. "Render or update the diagram whenever a machine is designed or changed,
//    even when nobody asked for one. … Derive it from the machine source,
//    never from memory of it" — a Mermaid `stateDiagram-v2` beside the
//    machine, whose states are the machine's states.
exports.mermaidRenderBesideMachine = () => {
  if (machineFiles().length === 0) return noMachine();
  const rendered = diagramCandidates()
    .flatMap((file) => mermaidBlocks(lib.read(file)).map((block) => ({ file, block })));
  if (rendered.length === 0)
    return lib.verdict(
      false,
      `no mermaid stateDiagram-v2 beside the machine (looked in ${list(diagramCandidates())})`,
    );
  const machine = machineText();
  const states = stateNames();
  const drawn = rendered.flatMap(({ block }) => diagramNodes(block));
  const diagramText = rendered.map(({ block }) => block).join("\n");
  const undrawn = states.filter((name) => !new RegExp(`\\b${name}\\b`).test(diagramText));
  const invented = drawn.filter((node) => !new RegExp(`\\b${node.split(".").pop()}\\b`).test(machine));
  const drift = [
    ...undrawn.map((name) => `state ${name} is missing from the diagram`),
    ...invented.map((node) => `diagram shows ${node}, which the machine does not define`),
  ];
  return lib.verdict(
    drift.length === 0,
    drift.length === 0
      ? `diagram in ${list(rendered.map(({ file }) => file))} matches ${states.join(" / ")}`
      : drift.join("; "),
  );
};

// 8. "Test the machine headlessly, the component through the DOM. The snapshot
//    is the machine's contract; it is implementation detail one level up." —
//    a test that drives the machine with events and reads the snapshot, and
//    does not render anything.
exports.machineTestedThroughEvents = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return lib.verdict(false, "the agent wrote or edited no test file");
  const headless = files.filter((file) => {
    const text = lib.read(file);
    return (
      /\bcreateActor\s*\(/.test(text) &&
      /\.send\s*\(/.test(text) &&
      /getSnapshot\s*\(\)|\.matches\s*\(|snapshot\.(value|context|status)/.test(text) &&
      !/\brender\s*\(/.test(text)
    );
  });
  return lib.verdict(
    headless.length > 0,
    headless.length > 0
      ? `machine driven by events in ${list(headless)}`
      : `no headless machine test among ${list(files)}`,
  );
};

// 9. Case: the retry cooldown. "A `setTimeout`/`setInterval` for retry,
//    debounce, or polling that something must clear → `after`, with
//    cancellation tied to the state that owns it."
exports.cooldownModelledAsDelay = () => {
  if (machineFiles().length === 0) return noMachine();
  const delayed = /\bafter\s*:/.test(machineText());
  const timers = components()
    .filter((file) => /\bsetTimeout\s*\(|\bsetInterval\s*\(/.test(lib.read(file)))
    .map((file) => `${lib.basename(file)} still sets its own timer`);
  const problems = [...(delayed ? [] : ["the machine declares no `after` delay"]), ...timers];
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? "the cooldown is a delayed transition owned by a state"
      : problems.join("; "),
  );
};

// 10. Case: cancelling in flight. "A `useEffect` that starts async work and
//     needs an ignore flag in its cleanup → Actor lifetime — the machine
//     cancels instead of ignoring", and "Handling for a response arriving
//     after cancel, replacement, or unmount → Stale-result fencing by
//     identity, which the machine makes structural."
exports.cancellationModelledInMachine = () => {
  if (machineFiles().length === 0) return noMachine();
  const invoking = topLevelStates(machineText()).filter((state) => /\binvoke\s*:/.test(state.body));
  const interruptible = invoking.filter((state) =>
    /\bon\s*:[\s\S]*[A-Z][A-Z0-9_]{1,}\s*:/.test(state.body),
  );
  const handRolled = components()
    .filter((file) => /\b(ignore|cancelled|canceled|isMounted|stale)\b|AbortController/.test(lib.read(file)))
    .map((file) => `${lib.basename(file)} fences the late answer by hand`);
  const problems = [
    ...(invoking.length === 0 ? ["no state invokes the order-placing actor"] : []),
    ...(invoking.length > 0 && interruptible.length === 0
      ? [`${invoking.map((state) => state.name).join(", ")} accepts no event while the actor runs`]
      : []),
    ...handRolled,
  ];
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? `${interruptible.map((state) => state.name).join(", ")} can be interrupted by an event`
      : problems.join("; "),
  );
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "xstate", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);

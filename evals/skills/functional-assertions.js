// Deterministic graders for the functional quality suite.
//
// The fixture's src/basket.ts is written in the mutable, imperative style the
// skill replaces, so a grader that read whole files would hold fixture code
// against the agent. Every rule below therefore reads only the lines the
// agent ADDED to production source under src/: the diff against the
// committed fixture (run-quality.sh and regrade.mjs both commit the starting
// state) plus any new untracked file. Test files are never graded here; the
// hidden acceptance tests grade behaviour. Every rule is one the skill states.
//
// Rules that need structure (which receiver a `.sort(` belongs to, whether a
// `{ … }` is a type literal, what a loop body contains) work on the text of a
// whole hunk with strings and comments blanked, so a Prettier-wrapped chain
// or a single-line type is read the same way as its multi-line spelling.

const lib = require("./quality-lib");

const isProduction = (file) => /^src\/.*\.[jt]sx?$/.test(file) && !lib.isTestPath(file) && !/acceptance-/.test(file);

const git = (args) => lib.run(`git --no-pager -c diff.external= -c core.pager=cat -c color.ui=false ${args}`);

// Hunks of added lines, one entry per file: { file, hunks: [[line, ...]] }.
const addedHunks = () => {
  const diff = git("diff HEAD -U0 --no-ext-diff --no-color -- src").out;
  const tracked = [];
  let current = null;
  diff.split("\n").forEach((line) => {
    const header = line.match(/^\+\+\+ b\/(.+)$/);
    if (header) {
      current = { file: header[1], hunks: [] };
      tracked.push(current);
      return;
    }
    if (!current) return;
    if (/^@@/.test(line)) current.hunks.push([]);
    else if (/^\+/.test(line) && current.hunks.length) current.hunks[current.hunks.length - 1].push(line.slice(1));
  });
  const untracked = git("ls-files --others --exclude-standard -- src")
    .out.split("\n")
    .filter(Boolean)
    .map((file) => ({ file, hunks: [lib.read(lib.resolve(lib.workspace(), file)).split("\n")] }));
  return [...tracked, ...untracked].filter((entry) => isProduction(entry.file));
};

const stripComments = (text) => text.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
const nothingAdded = () => lib.verdict(false, "no production line was added under src/");

// ---------------------------------------------------------------------------
// Source text helpers. `blank` keeps every character position (and newline)
// so an index into the blanked text maps back to the original line.

const spaces = (text) => text.replace(/[^\n]/g, " ");

const blank = (source) => {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += spaces(source.slice(i, stop));
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && (ch === "`" || source[j] !== "\n")) j += source[j] === "\\" ? 2 : 1;
      out += ch + spaces(source.slice(i + 1, j)) + (j < source.length ? source[j] : "");
      i = j + 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
};

const CLOSER = { "(": ")", "{": "}", "[": "]" };
const matching = (text, open) => {
  const stack = [];
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (CLOSER[ch]) stack.push(CLOSER[ch]);
    else if (ch === ")" || ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return text.length;
};

// End of the expression starting at `from`: the first `,` `;` or unmatched
// closing bracket at depth zero.
const expressionEnd = (text, from) => {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (CLOSER[ch]) depth += 1;
    else if (ch === ")" || ch === "}" || ch === "]") {
      if (depth === 0) return i;
      depth -= 1;
    } else if ((ch === "," || ch === ";") && depth === 0) return i;
  }
  return text.length;
};

const blocksOf = (text) =>
  [...text.matchAll(/\{/g)].map((m) => ({ open: m.index, close: matching(text, m.index) }));

const enclosingBlockEnd = (blocks, index) =>
  blocks
    .filter((b) => b.open < index && index < b.close)
    .reduce((best, b) => (b.close < best ? b.close : best), Infinity);

const lineIndex = (text, index) => text.slice(0, index).split("\n").length - 1;

const hunkViews = () =>
  addedHunks().flatMap((entry) =>
    entry.hunks.map((hunk) => {
      const text = blank(hunk.join("\n"));
      return { file: entry.file, hunk, text, cite: (index) => `${entry.file}: \`${(hunk[lineIndex(text, index)] ?? "").trim()}\`` };
    }),
  );

// ---------------------------------------------------------------------------
// Which identifiers are "inputs" — the arguments a function was given and
// anything that still points into them. Bindings are index ranges in the
// hunk text: a parameter over its function body, a `for…of` variable over
// the loop body, a callback parameter over the callback when the callback
// runs over an input, and a `const x = input.path` alias to the end of its
// block. Fresh values (`[...xs]`, `xs.map(...)`, `Object.values(...)`,
// `{ ...x }`, a reduce accumulator) are not inputs: mutation of those is the
// encapsulated local mutation the skill allows.

const PATH = "[\\w$]+(?:\\.[\\w$]+|\\[[^\\]\\n]*\\])*";
const ITERATORS = new Set(["map", "filter", "forEach", "reduce", "reduceRight", "some", "every", "find", "findIndex", "findLast", "findLastIndex", "flatMap", "sort", "toSorted"]);

const patternNames = (pattern) => {
  const inner = pattern.trim().replace(/^[{[]|[}\]]$/g, "");
  if (inner === pattern.trim()) return [inner.replace(/^\.\.\./, "")].filter((n) => /^[\w$]+$/.test(n));
  return inner
    .split(",")
    .map((part) => part.trim().replace(/^\.\.\./, "").replace(/\s*=.*$/, ""))
    .filter(Boolean)
    .map((part) => (part.includes(":") ? part.split(":")[1] : part).trim())
    .filter((n) => /^[\w$]+$/.test(n));
};

const paramNames = (list) => {
  const names = [];
  let depth = 0;
  let current = "";
  [...list, ","].forEach((ch) => {
    if (ch === "," && depth === 0) {
      const param = current.replace(/:[^=]*$/, "").replace(/=.*$/, "").trim();
      if (param) names.push(...patternNames(param));
      current = "";
      return;
    }
    if ("([{<".includes(ch)) depth += 1;
    if (")]}>".includes(ch)) depth -= 1;
    current += ch;
  });
  return names;
};

const bodyAfter = (text, closeParen) => {
  const after = text.slice(closeParen + 1);
  const m = after.match(/^\s*(?::\s*[\w$.<>[\] |&]*)?\s*(=>)?\s*(\{)?/);
  if (!m) return null;
  const arrow = m[1] !== undefined;
  const brace = m[2] !== undefined;
  const at = closeParen + 1 + m[0].length;
  if (brace) return { from: at - 1, to: matching(text, at - 1) + 1, arrow };
  if (arrow) return { from: at, to: expressionEnd(text, at), arrow };
  return null;
};

const inputAnalysis = (text) => {
  const blocks = blocksOf(text);
  const bound = [];
  const isInput = (name, at) => bound.some((b) => b.name === name && at >= b.from && at < b.to);
  const bind = (names, from, to) => names.forEach((name) => bound.push({ name, from, to }));

  const events = [];
  [...text.matchAll(/\(/g)].forEach((m) => events.push({ at: m.index, kind: "params" }));
  [...text.matchAll(new RegExp(`\\.([\\w$]+)\\s*\\(\\s*(?:async\\s+)?([\\w$]+)\\s*=>`, "g"))].forEach((m) => events.push({ at: m.index, kind: "arrow", m }));
  [...text.matchAll(new RegExp(`\\bfor\\s*\\(\\s*(?:const|let|var)\\s+([\\w$]+|\\{[^}]*\\}|\\[[^\\]]*\\])\\s+of\\s+(${PATH})\\s*\\)`, "g"))].forEach((m) => events.push({ at: m.index, kind: "forOf", m }));
  [...text.matchAll(new RegExp(`\\b(?:const|let|var)\\s+([\\w$]+|\\{[^}]*\\}|\\[[^\\]]*\\])\\s*(?::\\s*[^=\\n]+?)?=\\s*(${PATH})(?:\\s*\\.(?:find|findLast|at)\\s*\\(|\\s*(?=[;\\n,)]|$))`, "g"))].forEach((m) => events.push({ at: m.index, kind: "alias", m }));
  events.sort((a, b) => a.at - b.at);

  events.forEach((event) => {
    if (event.kind === "params") {
      const open = event.at;
      const close = matching(text, open);
      const body = bodyAfter(text, close);
      if (!body) return;
      const before = text.slice(0, open).trimEnd();
      const names = paramNames(text.slice(open + 1, close));
      if (/\bfunction\b\s*[\w$]*\s*(?:<[^>]*>)?$/.test(before) || (body.arrow && /=\s*(?:async\s*)?(?:<[^>]*>)?$/.test(before))) {
        bind(names, body.from, body.to);
        return;
      }
      if (!body.arrow) return;
      const callback = before.match(new RegExp(`(${PATH})\\s*\\.([\\w$]+)\\s*\\(\\s*(?:async\\s*)?$`));
      if (!callback || !ITERATORS.has(callback[2])) return;
      const root = callback[1].match(/^[\w$]+/)[0];
      if (!isInput(root, before.length - callback[0].length)) return;
      const accumulates = /^reduce/.test(callback[2]);
      bind(accumulates ? names.slice(1) : names, body.from, body.to);
      return;
    }
    if (event.kind === "arrow") {
      const [, method, param] = event.m;
      if (!ITERATORS.has(method)) return;
      const before = text.slice(0, event.at);
      const receiver = before.match(new RegExp(`(${PATH})$`));
      if (!receiver) return;
      const root = receiver[1].match(/^[\w$]+/)[0];
      if (!isInput(root, receiver.index)) return;
      if (/^reduce/.test(method)) return;
      const from = event.at + event.m[0].length;
      const rest = text.slice(from).match(/^\s*\{/);
      const to = rest ? matching(text, from + rest[0].length - 1) + 1 : expressionEnd(text, from);
      bind([param], from, to);
      return;
    }
    if (event.kind === "forOf") {
      const [, pattern, path] = event.m;
      const root = path.match(/^[\w$]+/)[0];
      if (!isInput(root, event.at)) return;
      const close = event.at + event.m[0].length - 1;
      const rest = text.slice(close + 1).match(/^\s*\{/);
      const to = rest ? matching(text, close + rest[0].length) + 1 : expressionEnd(text, close + 1);
      bind(patternNames(pattern), close + 1, to);
      return;
    }
    if (event.kind === "alias") {
      const [, pattern, path] = event.m;
      const root = path.match(/^[\w$]+/)[0];
      if (!isInput(root, event.at)) return;
      bind(patternNames(pattern), event.at, enclosingBlockEnd(blocks, event.at));
    }
  });

  return { isInput };
};

const MUTATORS = "push|pop|unshift|shift|splice|sort|reverse";
const mutationSites = (text) => {
  const sites = [];
  const site = new RegExp(`(?<![\\w$.])([\\w$]+)((?:\\.[\\w$]+|\\[[^\\]\\n]*\\])*)\\s*(?:\\.(${MUTATORS})\\s*\\(|(\\+\\+|--)|([+\\-*/%]?=)(?![=>]))`, "g");
  [...text.matchAll(site)].forEach((m) => {
    const [, root, members, method, step, assign] = m;
    if (method) sites.push({ at: m.index, root, label: /^(sort|reverse)$/.test(method) ? `in-place .${method}() on an input (copy first: [...xs].${method}())` : `.${method}() on an input` });
    else if (members && (step || assign)) sites.push({ at: m.index, root, label: "assignment into a property reached from an input" });
  });
  [...text.matchAll(new RegExp(`\\bdelete\\s+([\\w$]+)(?:\\.[\\w$]+|\\[[^\\]\\n]*\\])+`, "g"))].forEach((m) => sites.push({ at: m.index, root: m[1], label: "delete on a property of an input" }));
  [...text.matchAll(/\bObject\.assign\(\s*([\w$]+)/g)].forEach((m) => sites.push({ at: m.index, root: m[1], label: "Object.assign into an input" }));
  return sites;
};

// Named functions declared in a source text, with the index range of each
// body: `function f(…) { … }`, `const f = (…) => { … }` and `const f = (…) =>
// expr` alike, so a helper the agent rewrote in arrow form is still found.
const declaredFunctions = (text) => {
  const declaration = /\bfunction\s+([\w$]+)\s*(?:<[^>]*>)?\s*\(|\b(?:const|let|var)\s+([\w$]+)\s*(?::[^=\n]*)?=\s*(?:async\s+)?(?:<[^>]*>)?\s*\(/g;
  return [...text.matchAll(declaration)]
    .map((m) => {
      const close = matching(text, m.index + m[0].length - 1);
      const body = bodyAfter(text, close);
      return body ? { name: m[1] ?? m[2], from: body.from, to: body.to } : null;
    })
    .filter(Boolean);
};

// Helpers that write into an argument (addLine, removeLine, changeQuantity as
// the fixture ships them): handing one an input mutates it just as surely as a
// direct push. Read from the WORKING TREE, not from HEAD — the fixture's
// README says src/basket.ts "has not been brought in line yet", so an agent
// may well make addLine pure in the same change; grading against HEAD would
// then report a helper that no longer mutates anything. The list therefore
// follows the code as the agent left it rather than a hard-coded name.
const productionFiles = () =>
  lib
    .sourceFiles(lib.resolve(lib.workspace(), "src"))
    .map((file) => lib.rel(file))
    .filter(isProduction);

const fixtureMutators = () =>
  new Set(
    productionFiles().flatMap((file) => {
      const text = blank(lib.read(lib.resolve(lib.workspace(), file)));
      const { isInput } = inputAnalysis(text);
      const mutated = mutationSites(text).filter((s) => isInput(s.root, s.at));
      return declaredFunctions(text)
        .filter((fn) => mutated.some((s) => s.at > fn.from && s.at < fn.to))
        .map((fn) => fn.name);
    }),
  );

// 1. "Immutable domain data by default"; "Pure functions ... no side
//    effects — doesn't mutate external state, modify arguments". The
//    catalogue lists push/pop/unshift/shift/splice/reverse/sort,
//    `items[i] = v`, `user.name = "New"` and Object.assign as the mutations
//    to avoid, with `[...items]` / spread as the alternatives, and the skill
//    allows "encapsulated mutable accumulators ... when they do not leak
//    mutation into the domain contract". So only a receiver that is an
//    input — a parameter, or an alias, loop variable or callback parameter
//    still pointing into one — counts; a sort on `[...xs]` or a fresh local
//    does not.
exports.inputsNotMutated = () => {
  const views = hunkViews();
  if (views.length === 0) return nothingAdded();
  const mutators = fixtureMutators();
  const hits = views.flatMap((view) => {
    const { isInput } = inputAnalysis(view.text);
    const direct = mutationSites(view.text)
      .filter((s) => isInput(s.root, s.at))
      .map((s) => `${s.label} — ${view.cite(s.at)}`);
    const handed = [...mutators].flatMap((name) =>
      [...view.text.matchAll(new RegExp(`(?<![\\w$.])${name}\\s*\\(\\s*([\\w$]+)`, "g"))]
        .filter((m) => isInput(m[1], m.index))
        .map((m) => `hands an input to ${name}(), which writes into the basket it is given — ${view.cite(m.index)}`),
    );
    return [...direct, ...handed];
  });
  const total = views.reduce((n, view) => n + view.hunk.length, 0);
  return lib.verdict(hits.length === 0, hits.length === 0 ? `no input mutated in ${total} added line(s)` : hits.join("; "));
};

// 2. "Prefer map, filter, reduce for transformations"; loops are fine when
//    "early termination is essential (use for...of with break)". Each loop
//    the agent added is judged on its own body: it passes only if that body
//    breaks (not counting a break that belongs to a nested loop) or returns.
const openerOf = (text, close) => {
  let depth = 0;
  for (let i = close; i >= 0; i -= 1) {
    if (text[i] === "}") depth += 1;
    if (text[i] === "{") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return 0;
};
const isDoWhileTail = (text, at) => {
  const before = text.slice(0, at).trimEnd();
  if (!before.endsWith("}")) return false;
  return /\bdo\s*$/.test(text.slice(0, openerOf(text, before.length - 1)));
};
const loopBodies = (text) => {
  const loops = [];
  [...text.matchAll(/\b(for|while)\s*\(|\bdo\s*\{/g)].forEach((m) => {
    if (m[1] === "while" && isDoWhileTail(text, m.index)) return;
    const open = m.index + m[0].length - 1;
    const bodyOpen = m[1] ? text.slice(matching(text, open) + 1).match(/^\s*\{/) : { 0: "{" };
    const headEnd = m[1] ? matching(text, open) + 1 : open;
    const from = bodyOpen ? headEnd + bodyOpen[0].length - 1 : headEnd;
    const to = bodyOpen ? matching(text, from) + 1 : expressionEnd(text, from);
    loops.push({ at: m.index, from, to });
  });
  return loops;
};
exports.arrayMethodsOverLoops = () => {
  const views = hunkViews();
  if (views.length === 0) return nothingAdded();
  const results = views.flatMap((view) => {
    const loops = loopBodies(view.text);
    return loops.map((loop) => {
      const body = view.text.slice(loop.from, loop.to);
      const nested = loops.filter((other) => other.at > loop.from && other.to <= loop.to);
      const ownBody = nested.reduce((acc, other) => acc.slice(0, other.from - loop.from) + spaces(acc.slice(other.from - loop.from, other.to - loop.from)) + acc.slice(other.to - loop.from), body);
      const terminates = /\bbreak\b/.test(ownBody) || /\breturn\b/.test(body);
      return { terminates, where: view.cite(loop.at) };
    });
  });
  if (results.length === 0) return lib.verdict(true, "no loops added; transformations use array methods");
  const bad = results.filter((r) => !r.terminates).map((r) => r.where);
  return lib.verdict(bad.length === 0, bad.length === 0 ? `every added loop terminates early: ${results.map((r) => r.where).join("; ")}` : `loop(s) without early termination where map/filter/reduce/find express it: ${bad.join("; ")}`);
};

// 3. "Early returns over nesting": the skill marks `if { if { if {` as WRONG
//    and asks for guard clauses. A control statement opened inside two
//    enclosing control blocks (three levels) fails. Brace tracking is per
//    hunk and tags each `{` as control or other, so callbacks and object
//    literals do not count as nesting.
exports.earlyReturnsOverNesting = () => {
  const hunks = addedHunks();
  if (hunks.length === 0) return lib.verdict(true, "no production line was added; nothing to nest");
  const control = /^\s*(\}\s*)?(if|else|for|while|switch|do)\b/;
  const hits = [];
  hunks.forEach((entry) =>
    entry.hunks.forEach((hunk) => {
      const stack = [];
      hunk.forEach((raw) => {
        const text = stripComments(raw);
        const isControl = control.test(text);
        let opened = false;
        [...text.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "")].forEach((ch) => {
          if (ch === "{") {
            const tag = isControl && !opened ? "control" : "other";
            opened = opened || isControl;
            if (tag === "control" && stack.filter((t) => t === "control").length >= 2) hits.push(`${entry.file}: \`${raw.trim()}\``);
            stack.push(tag);
          }
          if (ch === "}") stack.pop();
        });
      });
    }),
  );
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no control statement nested three deep" : `nested three deep (guard clauses or extraction instead): ${hits.join("; ")}`);
};

// 4. "Use `readonly` on data that is intended to be immutable and
//    `ReadonlyArray<T>` for immutable arrays so the compiler enforces that
//    contract." Every property in every object type the agent wrote —
//    a `type` body, a single-line `type X = { … }`, an inline parameter
//    type `rules: { … }[]`, a nested member type — is readonly, and every
//    array type is ReadonlyArray / readonly T[] / readonly { … }[].
//
//    A `{ … }` is an object type when it sits where a type goes (after `:`
//    `<` `|` `&` or `type X =` / `interface X`) and every member reads as
//    `name: Type` with a type-shaped right-hand side (a primitive keyword or
//    a capitalised name, arrays and generics of those, a nested `{ … }`, a
//    string literal, unions of those). `{ sku: line.sku }` and
//    `{ total: Math.floor(x) }` are values, not types, and are skipped.
const ATOM = "(?:readonly\\s+)?(?:string|number|boolean|unknown|never|void|any|bigint|symbol|object|null|undefined|[A-Z][\\w$]*(?:\\.[\\w$]+)*|\\{\\s*\\}|'[^']*'|\"[^\"]*\")(?:\\s*<\\s*>)?(?:\\s*\\[[^\\]]*\\])*";
const STRONG = /\b(?:string|number|boolean|unknown|never|void|any|bigint|symbol|object|[A-Z][\w$]*)\b|\{\s*\}|\[\s*\]/;
const TYPE_EXPR = new RegExp(`^${ATOM}(?:\\s*[|&]\\s*${ATOM})*$`);
const MEMBER = /^(readonly\s+)?(?:[\w$]+|\[[^\]]*\])\??\s*:\s*(.+)$/;

const membersOf = (inner) => {
  let flat = inner;
  let previous;
  do {
    previous = flat;
    flat = flat.replace(/\{[^{}]*\}/g, (m) => "{" + spaces(m.slice(1, -1)) + "}").replace(/<[^<>]*>/g, (m) => "<" + spaces(m.slice(1, -1)) + ">").replace(/\([^()]*\)/g, (m) => "(" + spaces(m.slice(1, -1)) + ")");
  } while (flat !== previous);
  return flat
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const typeMembers = (inner) => {
  const members = membersOf(inner);
  if (members.length === 0) return null;
  const parsed = members.map((member) => member.match(MEMBER));
  if (parsed.some((m) => !m || !TYPE_EXPR.test(m[2].trim()))) return null;
  if (!parsed.some((m) => STRONG.test(m[2]))) return null;
  return parsed.map((m, i) => ({ text: members[i], readonly: m[1] !== undefined }));
};

const TYPE_CONTEXT = /(?::|<|\||&|\btype\s+[\w$]+\s*(?:<[^>]*>)?\s*=|\binterface\s+[\w$]+[^{]*)$/;

exports.readonlyContracts = () => {
  const views = hunkViews();
  const hits = [];
  let declared = 0;
  views.forEach((view) => {
    const { text } = view;
    const blocks = blocksOf(text);
    blocks.forEach(({ open, close }) => {
      const before = text.slice(0, open).trimEnd();
      if (!TYPE_CONTEXT.test(before)) return;
      const members = typeMembers(text.slice(open + 1, close));
      if (!members) return;
      declared += 1;
      const wrapped = /\bReadonly\s*<$/.test(before);
      members.filter((m) => !m.readonly && !wrapped).forEach((m) => hits.push(`property without readonly — ${view.file}: \`${m.text}\``));
      if (/^\s*\[\s*\]/.test(text.slice(close + 1)) && !/\breadonly$/.test(before)) hits.push(`mutable array of an object type (readonly { … }[] or ReadonlyArray<{ … }>) — ${view.cite(close)}`);
    });
    const lines = text.split("\n");
    let offset = 0;
    lines.forEach((line) => {
      const insideBlock = blocks.some((b) => b.open < offset && offset + line.length <= b.close);
      const m = line.match(MEMBER);
      if (!insideBlock && m && TYPE_EXPR.test(m[2].trim().replace(/[;,]$/, "")) && STRONG.test(m[2])) {
        declared += 1;
        if (m[1] === undefined) hits.push(`property without readonly — ${view.file}: \`${line.trim()}\``);
      }
      if (/(?<!readonly\s)(?<!ReadonlyArray<)(?<![\w.])(?:[A-Z][\w.]*|string|number|boolean)(<[^>]*>)?\[\]/.test(line) && !/^\s*(const|let|var)\b/.test(line)) {
        declared += 1;
        hits.push(`mutable array type — ${view.file}: \`${line.trim()}\``);
      }
      if (/(?<!Readonly)\bArray</.test(line)) {
        declared += 1;
        hits.push(`mutable Array<T> — ${view.file}: \`${line.trim()}\``);
      }
      if (/\b(type|interface)\s+\w+/.test(line) || /\breadonly\b|\bReadonlyArray</.test(line)) declared += 1;
      offset += line.length + 1;
    });
  });
  if (declared === 0) return lib.verdict(true, "no type or array annotation added; nothing to mark readonly");
  return lib.verdict(hits.length === 0, hits.length === 0 ? "added object types and array annotations are readonly" : hits.join("; "));
};

// Two rules the skill states are deliberately NOT wired into this suite,
// because no case here can make them discriminate:
//
//   * "Use an options object when parameters form a meaningful group" — every
//     entry point a hidden acceptance test can call has its signature pinned
//     by the request (applyVoucher(basket, code), mergeBaskets(saved, guest),
//     applyBulkPrices(basket, rules)), all of them two-parameter, so the rule
//     could never fire and both arms scored the point for free.
//   * "Pure functions ... deterministic — no dependency on Date.now(),
//     Math.random(), or globals" — nothing in a basket-pricing transformation
//     tempts a clock, randomness, the environment or I/O.
//
// A grader that cannot fail is not evidence; adding one back needs a case that
// tempts it first.

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "functional", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);

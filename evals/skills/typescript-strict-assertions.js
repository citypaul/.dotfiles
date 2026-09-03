// Deterministic graders for the typescript-strict quality suite.
//
// The fixture declares strict TypeScript but shows none of the practice, so
// nothing here assumes a folder layout. The agent's code is found by
// content: a file under src/ that the trail edited or whose text differs
// from the committed fixture (which also catches files written through
// Bash). Fixture code the agent never changed is not graded. Every rule
// below is one the skill states as a rule; the comment quotes it.
//
// Where a regex would have to guess at TypeScript (which function a brand
// assertion sits in, whether an alias really is a brand) the graders use
// the workspace's own TypeScript: its parser for structure and `tsc` for
// assignability.

const lib = require("./quality-lib");
const { existsSync, writeFileSync, unlinkSync } = require("node:fs");
const { dirname, basename, relative } = require("node:path");

const FIXTURE = lib.resolve(__dirname, "fixtures/typescript-strict-workspace");

const srcFiles = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter((file) => !/acceptance-[\w.-]+\.test\.ts$/.test(file) && !/__brand-probe\.ts$/.test(file));
const changedFiles = (context) => {
  const touched = lib.touchedBy(context);
  return srcFiles().filter((file) => {
    const original = lib.resolve(FIXTURE, lib.rel(file));
    return touched(file) || !existsSync(original) || lib.read(original) !== lib.read(file);
  });
};
const productionOf = (files) => files.filter((file) => !lib.isTestPath(file));
const list = (files) => files.map(lib.rel).join(", ") || "(none)";

// Comments do not carry types; string literals do not either, but they do
// carry the priority names, so the two strippers are separate.
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const code = (text) => withoutComments(text).replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
// `import { a as b }` and `export { a as b }` are renames, not assertions.
const withoutImportRenames = (text) => text.replace(/^\s*import\b[^;]*;?/gm, "").replace(/export\s*(?:type\s*)?\{[^}]*\}/g, "");
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

const requireWork = (context, grade) => {
  const files = changedFiles(context);
  return productionOf(files).length === 0 ? lib.verdict(false, "the agent changed no production file under src/") : grade(files);
};

// The workspace's own TypeScript (zod 4 needs TS 5.5+, so the fixture pins
// one). Used for structure the regexes cannot see.
const typescript = () => require(lib.resolve(lib.workspace(), "node_modules", "typescript"));
const parseFile = (ts, file) => ts.createSourceFile(file, lib.read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const descendants = (node) => {
  const out = [];
  const walk = (current) => {
    out.push(current);
    current.forEachChild(walk);
  };
  walk(node);
  return out;
};
const ancestorsOf = (node) => {
  const out = [];
  for (let current = node.parent; current; current = current.parent) out.push(current);
  return out;
};

// 1. "A runtime schema is required when untrusted data crosses a boundary
//    ... HTTP, queue, file, environment, or third-party data entering the
//    system"; "Define schemas first, derive types from them"; "Prefer schema
//    libraries implementing Standard Schema (Zod 4+, ...)". The agent's
//    production code declares a zod schema (any zod 4 entry point: `zod`,
//    `zod/v4`, `zod/mini`), runs it on the input, and derives the type from
//    it rather than writing the type twice.
const ZOD_IMPORT = /from\s*["']zod(?:\/[\w-]+)?["']/;
const ZOD_BUILDER = /\bz\.(object|strictObject|looseObject|array|discriminatedUnion|union|enum|tuple|record|literal|string|number|boolean)\(/;
exports.schemaAtBoundary = (output, context) =>
  requireWork(context, (files) => {
    const text = productionOf(files).map(lib.read).join("\n");
    const missing = [
      [ZOD_IMPORT, "no zod import"],
      [ZOD_BUILDER, "no schema declared"],
      [/(?<!JSON|Date)\.(safeParse|parse)(Async)?\(/, "nothing calls the schema's parse/safeParse on the input"],
      [/\bz\.(infer|output|input)\s*<\s*typeof\s+\w+/, "no type derived with z.infer<typeof …>"],
    ]
      .filter(([pattern]) => !pattern.test(text))
      .map(([, label]) => label);
    return lib.verdict(missing.length === 0, missing.length === 0 ? `schema declared, parsed and inferred in ${list(productionOf(files))}` : missing.join("; "));
  });

// 2. "Define a schema once per owned contract, version, and bounded
//    context, then import it within that boundary"; "Schemas have one owner
//    per contract/version/context"; "Define schemas first, derive types
//    from them". The fixture already owns the priority set once, as the
//    hand-written `type Priority` in tickets.ts. A schema that spells
//    `low | normal | high` again beside that union gives one contract two
//    owners; the skill's answer is to derive one from the other (or both
//    from one `as const` list). Counted across all production files under
//    src/, because the duplicate may sit in a file the agent never opened.
const PRIORITY_VALUES = ["low", "normal", "high"];
const prioritySpots = (file) => {
  const text = withoutComments(lib.read(file));
  const hits = [...text.matchAll(/["'](low|normal|high)["']/g)].map((match) => ({ value: match[1], index: match.index }));
  const clusters = hits.reduce((acc, hit) => {
    const last = acc[acc.length - 1];
    if (last && hit.index - last.end <= 160) return [...acc.slice(0, -1), { ...last, end: hit.index, values: new Set([...last.values, hit.value]) }];
    return [...acc, { start: hit.index, end: hit.index, values: new Set([hit.value]) }];
  }, []);
  return clusters.filter((cluster) => PRIORITY_VALUES.every((value) => cluster.values.has(value))).map((cluster) => `${lib.rel(file)}:${lineOf(text, cluster.start)}`);
};
exports.oneOwnerPerContract = (output, context) =>
  requireWork(context, () => {
    const spots = productionOf(srcFiles()).flatMap(prioritySpots);
    if (spots.length === 0) return lib.verdict(false, "the priority set (low | normal | high) is no longer declared anywhere under src/");
    return lib.verdict(spots.length === 1, spots.length === 1 ? `the priority set has one owner (${spots[0]})` : `the priority set is spelled ${spots.length} times — ${spots.join(", ")} — one owner expected, the other derived from it`);
  });

// 3. "Use `unknown` at untrusted boundaries." JSON.parse returns `any`;
//    every JSON.parse the agent wrote is typed `unknown` or handed straight
//    to a schema (`Schema.parse(JSON.parse(text))`, or a schema transform).
exports.unknownAtBoundary = (output, context) =>
  requireWork(context, (files) => {
    const hits = productionOf(files).flatMap((file) => {
      const text = lib.read(file);
      const lines = text.split("\n");
      return [...text.matchAll(/JSON\.parse\b/g)].flatMap((match) => {
        const line = lineOf(text, match.index);
        const window = lines.slice(Math.max(0, line - 4), line + 1).join("\n");
        const contained =
          /\bunknown\b/.test(window) ||
          /(?<!JSON|Date)\.(safeParse|parse)(Async)?\(\s*JSON\.parse/.test(window) ||
          /\.(transform|pipe)\(/.test(window);
        return contained ? [] : [`${lib.rel(file)}:${line} JSON.parse result is not typed unknown and does not go straight into a schema`];
      });
    });
    const count = productionOf(files).map(lib.read).join("\n").match(/JSON\.parse\b/g)?.length ?? 0;
    return lib.verdict(hits.length === 0, hits.length === 0 ? (count === 0 ? "no JSON.parse in the agent's code" : `every JSON.parse (${count}) is contained as unknown or a schema input`) : hits.join("; "));
  });

// 4. "No unexplained `any`; unavoidable interop is narrow and contained";
//    "Apply the repository's type-safety policy to tests too". The fixture
//    has no interop shim, so no `any` the agent wrote is explained.
exports.noAny = (output, context) =>
  requireWork(context, (files) => {
    const hits = files.flatMap((file) => {
      const text = code(lib.read(file));
      return [...text.matchAll(/:\s*any\b|<\s*any\s*[,>]|\bas\s+any\b|\bany\s*\[\]/g)].map((match) => `${lib.rel(file)}:${lineOf(text, match.index)}`);
    });
    return lib.verdict(hits.length === 0, hits.length === 0 ? `no \`any\` in ${list(files)}` : `\`any\` at ${hits.join(", ")}`);
  });

// 5. "No type assertions (`as Type`) without justification"; "Brand via a
//    validating constructor — the ONE place an assertion is justified";
//    "Never scatter `as UserId` through application code — the assertion
//    lives only inside the constructor (or a schema's `transform`)". Every
//    `as X` the agent wrote targets a branded type and sits in the file
//    that declares the brand or in a schema transform.
//
//    A brand is any alias that resolves to a string/number intersection:
//    spelled directly (`string & {…}`), through `Brand<…>`/`Branded<…>`,
//    through the agent's own generic helper (`type TicketId = Id<"ticket">`
//    where `Id<K>` is `string & {…}`), or as `z.infer` of a `.brand()`ed
//    schema. Resolved over every production file so a helper declared in
//    one file is seen from another.
const aliasDeclarations = (text) => [...text.matchAll(/(?:^|[\n;])\s*(?:export\s+)?type\s+(\w+)(?:\s*<[^=]*?>)?\s*=\s*([^;\n]*)/g)].map((match) => ({ name: match[1], rhs: match[2].trim() }));
const brandNames = (corpus) => {
  const aliases = aliasDeclarations(corpus);
  const zodBranded = (rhs) => {
    const source = /^z\.(?:infer|output)\s*<\s*typeof\s+(\w+)/.exec(rhs);
    return source !== null && new RegExp(`\\b${source[1]}\\b[^;]*\\.brand\\s*[<(]`).test(corpus);
  };
  const seed = aliases.filter(({ rhs }) => /^(?:string|number)\s*&/.test(rhs) || /^Brand(?:ed)?\s*</.test(rhs) || zodBranded(rhs)).map(({ name }) => name);
  const resolve = (known) => {
    const next = aliases.filter(({ name, rhs }) => !known.has(name) && known.has((/^(\w+)\s*</.exec(rhs) ?? [])[1])).map(({ name }) => name);
    return next.length === 0 ? known : resolve(new Set([...known, ...next]));
  };
  return resolve(new Set(seed));
};
exports.assertionsOnlyInBrandConstructors = (output, context) =>
  requireWork(context, (files) => {
    const perFile = files.map((file) => ({ file, text: withoutImportRenames(code(lib.read(file))) }));
    const brands = brandNames(productionOf(srcFiles()).map((file) => code(lib.read(file))).join("\n"));
    const declaredIn = (text) => new Set(aliasDeclarations(text).map(({ name }) => name).filter((name) => brands.has(name)));
    const hits = perFile.flatMap(({ file, text }) => {
      const declared = declaredIn(text);
      const lines = text.split("\n");
      return [...text.matchAll(/\bas\s+(?!const\b|unknown\b)(\{|[A-Za-z_]\w*)/g)].flatMap((match) => {
        const target = match[1];
        const line = lineOf(text, match.index);
        const window = lines.slice(Math.max(0, line - 4), line).join("\n");
        if (declared.has(target) || (brands.has(target) && /\.transform\(/.test(window))) return [];
        return [`${lib.rel(file)}:${line} \`as ${target}\``];
      });
    });
    const perBrand = perFile.flatMap(({ file, text }) => [...declaredIn(text)].map((brand) => ({ brand, file, count: (text.match(new RegExp(`\\bas\\s+${brand}\\b`, "g")) ?? []).length })));
    const scattered = perBrand.filter(({ count }) => count > 2).map(({ brand, file, count }) => `${lib.rel(file)}: \`as ${brand}\` ${count} times (one constructor expected)`);
    const problems = [...hits.map((hit) => `assertion outside a brand constructor: ${hit}`), ...scattered];
    const assertions = perFile.reduce((sum, { text }) => sum + (text.match(/\bas\s+(?!const\b|unknown\b)(?:\{|[A-Za-z_]\w*)/g) ?? []).length, 0);
    return lib.verdict(problems.length === 0, problems.length === 0 ? (assertions === 0 ? `no type assertions in ${list(files)}` : `${assertions} assertion(s), all inside brand constructors`) : problems.join("; "));
  });

// 6. "Follow the repository's `type`/`interface` convention"; interfaces
//    are "useful for behavior contracts". The fixture spells every data
//    shape as `type`, so an `interface` the agent adds must be a behaviour
//    contract: at least one method or function-typed member.
exports.typeConvention = (output, context) =>
  requireWork(context, (files) => {
    const hits = files.flatMap((file) => {
      const text = code(lib.read(file));
      return [...text.matchAll(/\binterface\s+(\w+)[^{]*\{/g)].flatMap((match) => {
        const start = match.index + match[0].length;
        const body = (() => {
          let depth = 1;
          for (let i = start; i < text.length; i += 1) {
            if (text[i] === "{") depth += 1;
            if (text[i] === "}") depth -= 1;
            if (depth === 0) return text.slice(start, i);
          }
          return text.slice(start);
        })();
        const behavioural = /\w+\s*(?:<[^>]*>)?\s*\([^)]*\)\s*:/.test(body) || /=>/.test(body);
        return behavioural ? [] : [`${lib.rel(file)}:${lineOf(text, match.index)} interface ${match[1]} is a data shape (repository convention: type)`];
      });
    });
    return lib.verdict(hits.length === 0, hits.length === 0 ? `type/interface convention kept in ${list(files)}` : hits.join("; "));
  });

// 7. "`strict` is enabled; additional compiler checks follow the
//    repository's adopted policy"; "Prefer a justified, narrow
//    `@ts-expect-error` over `@ts-ignore`". tsconfig keeps the fixture's
//    checks and no file silences the checker.
exports.strictnessKept = () => {
  const tsconfigPath = lib.resolve(lib.workspace(), "tsconfig.json");
  const options = (() => {
    try {
      return JSON.parse(withoutComments(lib.read(tsconfigPath))).compilerOptions ?? {};
    } catch {
      return {};
    }
  })();
  const weakened = ["strict", "noUncheckedIndexedAccess", "noImplicitOverride"].filter((flag) => options[flag] !== true);
  const silenced = srcFiles().filter((file) => /@ts-ignore|@ts-nocheck/.test(lib.read(file))).map(lib.rel);
  const problems = [...weakened.map((flag) => `tsconfig no longer sets ${flag}: true`), ...silenced.map((file) => `${file} uses @ts-ignore/@ts-nocheck`)];
  return lib.verdict(problems.length === 0, problems.length === 0 ? "strict flags kept; nothing silences the checker" : problems.join("; "));
};

// 8. Case: phone events. "Branded Types — For type-safe primitives" and
//    "Brand via a validating constructor — the ONE place an assertion is
//    justified ... so every branded value has passed validation" (or a
//    schema's `.brand()`/`transform`). Two parts, neither tied to one
//    spelling of the brand:
//
//    (a) tsc proves the brands are real. A probe copy of each declaring
//        file asserts, under `@ts-expect-error`, that a plain string is not
//        a TicketId and that a TicketId is not an AgentId; an unused
//        directive means the "brand" is a plain alias.
//    (b) every path that confers a brand validates first. From the parsed
//        source: an `as TicketId`/`raw is TicketId` inside a zod
//        `.transform()`/`.pipe()` is validated by the schema; a `.brand()`ed
//        schema likewise; a hand constructor's body must guard (an if,
//        throw, ternary, switch, comparison, typeof, or a check call such
//        as `startsWith`/`test`/`safeParse`) before it asserts.
const BRAND_IDS = { Ticket: /TicketI[dD]/, Agent: /AgentI[dD]/ };
const GUARD_CALLS = new Set(["test", "startsWith", "endsWith", "match", "includes", "parse", "safeParse", "isSafeInteger", "isInteger", "isFinite", "isNaN"]);
const SCHEMA_CALLS = new Set(["transform", "pipe", "refine", "superRefine", "check", "overwrite"]);

const declarationOf = (ts, files, pattern) =>
  files.flatMap((file) => {
    const source = parseFile(ts, file);
    return source.statements.filter((statement) => ts.isTypeAliasDeclaration(statement) && new RegExp(`^${pattern.source}$`).test(statement.name.text)).map((statement) => ({ file, source, name: statement.name.text, exported: (statement.modifiers ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword), node: statement }));
  })[0];

const probeAssignability = (ts, declarations) => {
  const byFile = [...new Set(declarations.map(({ file }) => file))].map((file) => ({ file, own: declarations.filter((declaration) => declaration.file === file) }));
  const probes = byFile.map(({ file, own }) => {
    const foreign = declarations.filter((declaration) => declaration.file !== file && declaration.exported);
    const specifierOf = (other) => relative(dirname(file), other.file).replace(/\.ts$/, "").replace(/^(?!\.)/, "./");
    const imports = foreign.map((other) => `import type { ${other.name} as __Probe${other.name} } from "${specifierOf(other)}";`);
    const referenceTo = (other) => (other.file === file ? other.name : other.exported ? `__Probe${other.name}` : undefined);
    const lines = own.flatMap((declaration) => {
      const others = declarations.filter((other) => other !== declaration).map((other) => ({ other, reference: referenceTo(other) }));
      return [
        `// @ts-expect-error a plain string must not be accepted as a ${declaration.name}`,
        `const __probePlain${declaration.name}: ${declaration.name} = "t-1";`,
        `declare const __probeValue${declaration.name}: ${declaration.name};`,
        ...others.filter(({ reference }) => reference !== undefined).flatMap(({ other, reference }) => [`// @ts-expect-error a ${declaration.name} must not be accepted as ${other.name}`, `const __probe${declaration.name}As${other.name}: ${reference} = __probeValue${declaration.name};`]),
      ];
    });
    const distinctnessChecked = own.every((declaration) => declarations.filter((other) => other !== declaration).every((other) => referenceTo(other) !== undefined));
    const path = lib.resolve(dirname(file), `${basename(file, ".ts")}.__brand-probe.ts`);
    return { path, text: `${imports.join("\n")}\n${lib.read(file)}\n${lines.join("\n")}\n`, distinctnessChecked };
  });
  probes.forEach((probe) => writeFileSync(probe.path, probe.text));
  try {
    const result = lib.run("pnpm exec tsc --noEmit");
    const errors = result.out.split("\n").filter((line) => /__brand-probe\.ts\(\d+,\d+\): error TS/.test(line));
    return {
      problems: errors.map((line) => {
        const message = line.replace(/^.*error TS\d+:\s*/, "");
        const reason = /Unused '@ts-expect-error'/.test(message) ? "an @ts-expect-error probe compiled: the brand does not reject what it should (a plain string, or the other id)" : message;
        return `${line.replace(/\(\d+,\d+\).*$/, "")}: ${reason}`;
      }),
      distinctnessChecked: probes.every((probe) => probe.distinctnessChecked),
    };
  } finally {
    probes.forEach((probe) => existsSync(probe.path) && unlinkSync(probe.path));
  }
};

const guardsIn = (ts, body) =>
  descendants(body).some(
    (node) =>
      ts.isIfStatement(node) ||
      ts.isThrowStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isSwitchStatement(node) ||
      ts.isTypeOfExpression(node) ||
      (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.InstanceOfKeyword, ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken].includes(node.operatorToken.kind)) ||
      (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && GUARD_CALLS.has(node.expression.name.text)),
  );
const insideSchemaCall = (ts, node) => ancestorsOf(node).some((ancestor) => ts.isCallExpression(ancestor) && ts.isPropertyAccessExpression(ancestor.expression) && SCHEMA_CALLS.has(ancestor.expression.name.text));
const schemaBrands = (ts, files, name) =>
  files.some((file) => {
    const source = parseFile(ts, file);
    const alias = source.statements.find((statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === name);
    const rhs = alias?.type;
    if (!rhs || !ts.isTypeReferenceNode(rhs) || !/^z\.(infer|output)$/.test(rhs.typeName.getText()) || !rhs.typeArguments?.[0] || !ts.isTypeQueryNode(rhs.typeArguments[0])) return false;
    const schemaName = rhs.typeArguments[0].exprName.getText();
    return descendants(source).some((node) => ts.isVariableDeclaration(node) && node.name.getText() === schemaName && /\.(brand|transform|pipe)\s*[<(]/.test(node.initializer?.getText() ?? ""));
  });
const conferralProblems = (ts, files, name) => {
  const sites = files.flatMap((file) => {
    const source = parseFile(ts, file);
    return descendants(source)
      .filter((node) => (ts.isAsExpression(node) && node.type.getText() === name) || (ts.isTypePredicateNode(node) && node.type?.getText() === name))
      .map((node) => ({ file, source, node }));
  });
  if (sites.length === 0) return schemaBrands(ts, files, name) ? [] : [`nothing produces a ${name}: no validating constructor, type predicate or branded schema`];
  return sites.flatMap(({ file, source, node }) => {
    if (insideSchemaCall(ts, node)) return [];
    const fn = ancestorsOf(node).find((ancestor) => ts.isFunctionLike(ancestor));
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    if (!fn) return [`${lib.rel(file)}:${line} ${name} conferred outside any constructor`];
    return guardsIn(ts, fn.body ?? fn) ? [] : [`${lib.rel(file)}:${line} the ${name} constructor asserts without validating anything first`];
  });
};

exports.brandedIds = (output, context) =>
  requireWork(context, () => {
    const ts = typescript();
    const files = productionOf(srcFiles());
    const declarations = Object.entries(BRAND_IDS).map(([label, pattern]) => ({ label, declaration: declarationOf(ts, files, pattern) }));
    const undeclared = declarations.filter(({ declaration }) => !declaration).map(({ label }) => `no ${label}Id type declared under src/`);
    if (undeclared.length > 0) return lib.verdict(false, undeclared.join("; "));
    const found = declarations.map(({ declaration }) => declaration);
    const { problems, distinctnessChecked } = probeAssignability(ts, found);
    const conferral = found.flatMap(({ name }) => conferralProblems(ts, files, name));
    const all = [...problems, ...conferral];
    const note = distinctnessChecked ? "" : " (declared in separate files without export, so only string-assignability was probed)";
    return lib.verdict(all.length === 0, all.length === 0 ? `${found.map(({ name }) => name).join(" and ")} are real brands (tsc rejects a plain string and each other) and every conferral validates first${note}` : all.join("; "));
  });

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "typescript-strict", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);

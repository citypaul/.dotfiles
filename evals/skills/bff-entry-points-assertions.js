// Deterministic graders for the bff-entry-points quality suite.
//
// The fixture declares that production entry points are registered through the
// prepared registrar in src/composition/registrar.ts with an explicit
// public/protected classification (README.md, CLAUDE.md), and that is the only
// layout this file assumes. Every other role is found by content and by the
// import graph, never by folder name:
//
//   registrar         the production file defining `create*Registrar`
//   composition root  the production file that calls it
//   chain scope       the registrar, the composition root, and the collaborators
//                     composition injects into the registrar (plus what those
//                     import). The skill's own reference decomposes the chain
//                     into a `browserPolicy` collaborator
//                     (`createEndpointRegistrar({ app, sessions, browserPolicy,
//                     ... })`), so a grader that demanded the checks inline in
//                     one file would punish the shape the skill prescribes.
//   endpoint leaf     a production file declaring an endpoint contract or handler
//   adapter           a production file that speaks HTTP: framework, `Request`,
//                     `Response`, headers or cookies
//   application       a production file that is none of the above — framework
//                     free product code
//
// Every rule graded below is one the skill states, quoted in the grader's
// comment.

const { existsSync, statSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const lib = require("./quality-lib");

const srcDir = () => lib.resolve(lib.workspace(), "src");
const allFiles = () => lib.sourceFiles(srcDir());
const isSupport = (file) =>
  /\/(testing|test-support|test-utils|__tests__)\//.test(file) || /fakes?\.[jt]sx?$/.test(file);
const production = () => allFiles().filter((file) => !lib.isTestPath(file) && !isSupport(file));
const testFiles = () => allFiles().filter(lib.isTestPath);
const list = (files) => files.map(lib.rel).join(", ") || "(none)";

// Graders read code, not prose: a comment explaining why a rule matters must
// never look like a violation of it. `//` keeps its place inside a URL.
const code = (file) =>
  lib
    .read(file)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[\s;,({[])\/\/[^\n]*/g, "$1");

// ---------------------------------------------------------------------------
// Module roles
// ---------------------------------------------------------------------------

// The registrar module: the production file that defines the registrar the
// README names. Falls back to the path the README fixes.
const registrarFile = () =>
  production().find((file) => /(?:const|function)\s+create\w*Registrar\b/.test(code(file))) ??
  production().find((file) => /composition\/registrar\.[jt]s$/.test(file));

// The composition root: the production file that builds the registrar.
const compositionRoot = () => {
  const registrar = registrarFile();
  return production().find((file) => file !== registrar && /create\w*Registrar\s*\(/.test(code(file)));
};

// Adapter, not application: it speaks HTTP (framework, request, response,
// headers, cookies) or it is an entry point leaf declaring a contract.
const usesHttp = (text) =>
  /from\s+["'][^"']*\bhono\b/.test(text) ||
  /\bc\.req\b/.test(text) ||
  /\bnew Response\s*\(/.test(text) ||
  /\bResponse\.json\s*\(/.test(text) ||
  /:\s*Response\b|Promise<\s*Response\s*>/.test(text) ||
  /\bRequest\b/.test(text) ||
  /\bheaders\s*\.\s*(?:get|set|has)\s*\(/.test(text) ||
  /cookie/i.test(text) ||
  /\bHandlerFor\b|\bEndpointContract\b/.test(text) ||
  /\baccess\s*:\s*\{\s*kind/.test(text);

const isEndpointLeaf = (file) => {
  const text = code(file);
  return /\baccess\s*:\s*\{\s*kind/.test(text) || /\bHandlerFor\s*</.test(text);
};

// Framework-free product code that takes a principal: never chain machinery,
// whatever imports it.
const isApplicationShaped = (file) => {
  const text = code(file);
  return !usesHttp(text) && /\bprincipal\s*[,:}]/.test(text);
};

// Import resolution, so a grader can ask what a file actually pulls in.
const stripExt = (path) => path.replace(/\.(ts|tsx|js|jsx)$/, "");
const isFile = (path) => existsSync(path) && statSync(path).isFile();
const resolveImport = (from, spec) => {
  const base = resolve(dirname(from), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${stripExt(base)}.ts`, resolve(base, "index.ts")];
  return candidates.find(isFile) ?? `${stripExt(base)}.ts`;
};
const localImports = (file) =>
  lib
    .importsOf(code(file))
    .filter((spec) => spec.startsWith("."))
    .map((spec) => resolveImport(file, spec));

// local name -> module it was imported from, for the local imports of one file.
const importBindings = (file) => {
  const bindings = new Map();
  for (const match of code(file).matchAll(/import\s+(?:type\s+)?([^;]*?)\s+from\s*["']([^"']+)["']/g)) {
    const spec = match[2];
    if (!spec.startsWith(".")) continue;
    const target = resolveImport(file, spec);
    const clause = match[1];
    for (const named of clause.matchAll(/\{([^}]*)\}/g)) {
      for (const part of named[1].split(",")) {
        const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
        if (name) bindings.set(name, target);
      }
    }
    const fallback = clause.replace(/\{[^}]*\}/g, " ").replace(/,/g, " ").trim().split(/\s+/)[0];
    if (fallback && /^[A-Za-z_$][\w$]*$/.test(fallback)) bindings.set(fallback, target);
  }
  return bindings;
};

const identifiers = (text) => [...text.matchAll(/[A-Za-z_$][\w$]*/g)].map((match) => match[0]);
const balancedFrom = (text, openIndex) => {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "(" || char === "{" || char === "[") depth += 1;
    else if (char === ")" || char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, index + 1);
    }
  }
  return text.slice(openIndex);
};

const sameProduction = (file) => production().find((candidate) => candidate === file || lib.sameFile(candidate, file));

// The modules the registrar's chain is built from: the registrar, the
// composition root, whatever composition injects into the registrar, and what
// those import. Endpoint leaves and framework-free product modules are never
// chain machinery, so the walk stops at them.
const chainScope = () => {
  const registrar = registrarFile();
  if (!registrar) return [];
  const root = compositionRoot();
  const seeds = [registrar];
  if (root) {
    seeds.push(root);
    const text = code(root);
    const call = /create\w*Registrar\s*\(/.exec(text);
    if (call) {
      const args = balancedFrom(text, call.index + call[0].length - 1);
      const wanted = new Set(identifiers(args));
      for (const declaration of text.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?);/g)) {
        if (wanted.has(declaration[1])) for (const id of identifiers(declaration[2])) wanted.add(id);
      }
      const bindings = importBindings(root);
      for (const name of wanted) {
        const target = bindings.get(name);
        const inProduction = target ? sameProduction(target) : undefined;
        if (inProduction) seeds.push(inProduction);
      }
    }
  }
  const seen = new Set();
  const queue = [...seeds];
  while (queue.length > 0) {
    const file = queue.shift();
    const resolved = sameProduction(file);
    if (!resolved || seen.has(resolved)) continue;
    const forced = resolved === registrar || resolved === root;
    if (!forced && (isEndpointLeaf(resolved) || isApplicationShaped(resolved))) continue;
    seen.add(resolved);
    for (const target of localImports(resolved)) queue.push(target);
  }
  return [...seen];
};

const adapters = () => {
  const registrar = registrarFile();
  return production().filter((file) => file !== registrar && usesHttp(code(file)));
};

// Application code by exclusion of every HTTP and chain role — the classifier a
// composition-layer browser/CSRF policy module must not fall into.
const applicationFiles = () => {
  const registrar = registrarFile();
  const root = compositionRoot();
  const chain = chainScope();
  return production().filter(
    (file) => file !== registrar && file !== root && !chain.includes(file) && !usesHttp(code(file)),
  );
};

// "get /api/me,post /api/orders" — what the case's request pins.
const pinned = (context, key = "pinned") =>
  String(context?.vars?.[key] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [method, ...rest] = entry.split(/\s+/);
      return { method: String(method).toUpperCase(), path: rest.join(" ") };
    });
// '/api/orders/{orderId}' and '/api/orders/:orderId' are the same entry point.
const samePath = (a, b) =>
  a.replace(/\{(\w+)\}/g, ":$1").replace(/\/$/, "") === b.replace(/\{(\w+)\}/g, ":$1").replace(/\/$/, "");
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const quoted = (path) => new RegExp(`["'\`]${escapeRe(path)}["'\`]`);

// Routes mounted straight onto the framework app: `app.get("/x", …)` and
// `app.on("GET", "/x", …)`, in either order of quoting.
const directMounts = (text) => {
  const found = [];
  const byMethod = /\.\s*(get|post|put|patch|delete|options|head|all)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  for (const match of text.matchAll(byMethod)) found.push({ method: match[1].toUpperCase(), path: match[2] });
  const byOn = /\.\s*on\s*\(\s*["'`]([A-Za-z]+)["'`]\s*,\s*["'`]([^"'`]+)["'`]/g;
  for (const match of text.matchAll(byOn)) found.push({ method: match[1].toUpperCase(), path: match[2] });
  return found;
};

// 1. "A route mounted directly on the framework app in production code,
//    bypassing the registrar" is an anti-pattern; "Does every mounted production
//    entry point ... have an explicit access classification?" Each entry point
//    the request names must carry an access declaration and must not be mounted
//    around the registrar.
exports.routesMountedThroughRegistrar = (output, context) => {
  const entries = pinned(context);
  if (entries.length === 0) return lib.verdict(false, "test case has no vars.pinned");
  const registrar = registrarFile();
  if (!registrar) return lib.verdict(false, "no registrar module found in src/");
  const others = production().filter((file) => file !== registrar);
  const bypassed = others.flatMap((file) =>
    directMounts(code(file))
      .filter((mount) => entries.some((entry) => entry.method === mount.method && samePath(entry.path, mount.path)))
      .map((mount) => `${lib.rel(file)} mounts ${mount.method} ${mount.path} straight onto the app`),
  );
  const undeclared = entries
    .filter(
      (entry) =>
        !production().some((file) => {
          const text = code(file);
          return quoted(entry.path).test(text) && /\baccess\s*:/.test(text);
        }),
    )
    .map((entry) => `${entry.method} ${entry.path} has no access declaration`);
  const problems = [...bypassed, ...undeclared];
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? `declared and registered: ${entries.map((entry) => `${entry.method} ${entry.path}`).join(", ")}`
      : problems.join("; "),
  );
};

// 2. "`requireAuth: false`, `skipCsrf`, or any boolean that lets an endpoint
//    owner weaken its own chain" is an anti-pattern; "Never express a new mode
//    as options on an existing one."
const WEAKENING = [
  [/\brequireAuth\b/i, "requireAuth"],
  [/\brequiresAuth\b/i, "requiresAuth"],
  [/\bauthRequired\b/i, "authRequired"],
  [/\bskipAuth\b/i, "skipAuth"],
  [/\bskipCsrf\b/i, "skipCsrf"],
  [/\bdisableCsrf\b/i, "disableCsrf"],
  [/\bnoAuth\b/i, "noAuth"],
  [/\bisPublic\b/i, "isPublic"],
  [/\bauth\s*:\s*(?:true|false)\b/, "auth: <boolean>"],
  [/\bcsrf\s*:\s*(?:true|false)\b/, "csrf: <boolean>"],
  [/\bpublic\s*:\s*(?:true|false)\b/, "public: <boolean>"],
  [/\bprotected\s*:\s*(?:true|false)\b/, "protected: <boolean>"],
  [/\bauthenticated\s*:\s*(?:true|false)\b/, "authenticated: <boolean>"],
];
exports.noWeakeningFlags = () => {
  const hits = production().flatMap((file) => {
    const text = code(file);
    return WEAKENING.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(
    hits.length === 0,
    hits.length === 0 ? `no opt-out flags in ${production().length} production files` : hits.join("; "),
  );
};

// 3. "Never accept an actor, user ID, or tenant ID from the request body or
//    query when the session already identifies the caller" / "Trusting a
//    client-supplied actor, user ID, or tenant ID instead of the session-derived
//    principal" is an anti-pattern. Only files the agent wrote or changed are
//    held to it.
const FORGEABLE = [
  [/\.query\(\s*["'`](?:tenantId|tenant_id|tenant|userId|user_id|customerId|actor)["'`]/, "reads a caller identity from the query string"],
  [/\.param\(\s*["'`](?:tenantId|tenant_id|userId|user_id|customerId|actor)["'`]/, "reads a caller identity from a path parameter"],
  [/searchParams\.get\(\s*["'`](?:tenantId|tenant_id|tenant|userId|user_id|customerId|actor)["'`]/, "reads a caller identity from the query string"],
  [/(?:headers\.get|\.header)\(\s*["'`]x-(?:user|tenant|actor)/i, "reads a caller identity from a request header"],
  [/\b(?:body|payload|parsed|input|json|data)\.(?:tenantId|userId|customerId|actor)\b/, "takes a caller identity from the request body"],
  [/\b(?:tenantId|userId|customerId)\s*[:=]\s*(?:body|payload|parsed|input|json|data)\./, "takes a caller identity from the request body"],
];
exports.principalFromSessionOnly = (output, context) => {
  const touched = lib.touchedBy(context);
  const files = production().filter(touched);
  const hits = files.flatMap((file) => {
    const text = code(file);
    return FORGEABLE.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(
    hits.length === 0,
    hits.length === 0 ? `caller identity comes from the session in ${list(files)}` : hits.join("; "),
  );
};

// 4. "`AuthenticatedPrincipal` carrying provider fields (token claims, Keycloak
//    groups, cookie names) into the application" is an anti-pattern: "It never
//    carries provider material: no token claims, no Keycloak/IdP groups, no
//    cookie names, no session IDs, no HTTP anything." The application is the
//    framework-free product code — cookies, headers and CSRF material belong to
//    the adapter and to the chain the registrar is built from, which the skill
//    assigns to it explicitly ("It owns cookies and request headers, session
//    resolution, Origin/Fetch Metadata/CSRF/content-type policy").
const PROVIDER_FIELD =
  /\b(?:accessToken|access_token|idToken|id_token|refreshToken|refresh_token|claims|groups|scopes|sessionId|session_id|cookie|expiresAt|expires_at)\b/;
exports.principalStaysProviderFree = () => {
  const declarations = production().flatMap((file) =>
    [...code(file).matchAll(/type\s+(\w*Principal\w*)\s*=\s*\{([^}]*)\}/g)].map((match) => ({
      file,
      name: match[1],
      body: match[2],
    })),
  );
  const carried = declarations
    .filter((declaration) => PROVIDER_FIELD.test(declaration.body))
    .map((declaration) => `${lib.rel(declaration.file)}: ${declaration.name} carries provider material`);
  const leaked = applicationFiles()
    .filter((file) => PROVIDER_FIELD.test(code(file)))
    .map((file) => `${lib.rel(file)} handles provider material inside the application`);
  const hits = [...carried, ...leaked];
  const seen = declarations.map((declaration) => declaration.name).join(", ") || "no principal type declared";
  return lib.verdict(hits.length === 0, hits.length === 0 ? `provider-free principal (${seen})` : hits.join("; "));
};

// 5. Case: the browser mutation. "For a protected browser mutation: reject
//    invalid Origin, unsuitable Fetch Metadata, or unsupported content type ...
//    resolve the application session; validate session-bound CSRF protection",
//    and "each added kind defines its own verification chain in the registrar" —
//    the endpoint owner "cannot choose, order, or omit authentication
//    middleware".
//
//    What is graded is construction, not file position: the registrar must
//    branch on an access kind of its own for the mutation, the three checks must
//    live in the chain the registrar is built from (inline, or in an injected
//    `browserPolicy` collaborator as in the skill's reference), and no endpoint
//    leaf may verify them for itself.
const ORIGIN_READ = /(?:headers\s*\.\s*get|\.header|headers\s*\[)\s*\(?\s*["'`]origin["'`]/i;
// The Origin header must be read *and* decided on — an allowlist match, a
// comparison, a policy call — within sight of the read, in whichever module of
// the chain holds it.
const ORIGIN_DECISION =
  /===|!==|\.includes\s*\(|\.has\s*\(|\.some\s*\(|indexOf\s*\(|allow\w*origins?|allowlist|exactallowedorigin/i;
const checksExactOrigin = (text) => {
  for (const match of text.matchAll(new RegExp(ORIGIN_READ.source, "gi"))) {
    const window = text.slice(Math.max(0, match.index - 200), match.index + match[0].length + 200);
    if (ORIGIN_DECISION.test(window)) return true;
  }
  return false;
};
const verifiesCsrf = (text) => /csrf/i.test(text) && /(?:===|!==|timingSafeEqual|\.equals\(|headers\s*\.\s*get|cookie)/i.test(text);
const leavesDoingPolicy = () => {
  const registrar = registrarFile();
  const root = compositionRoot();
  return production()
    .filter((file) => file !== registrar && file !== root && isEndpointLeaf(file))
    .filter((file) => {
      const text = code(file);
      return ORIGIN_READ.test(text) || verifiesCsrf(text);
    })
    .map((file) => `${lib.rel(file)} verifies browser-request policy itself instead of receiving the chain from the registrar`);
};
exports.mutationPolicyInstalledByRegistrar = () => {
  const registrar = registrarFile();
  if (!registrar) return lib.verdict(false, "no registrar module found in src/");
  const registrarText = code(registrar);
  const kinds = [
    ...[...registrarText.matchAll(/case\s*["'`]([a-z-]+)["'`]/g)].map((match) => match[1]),
    ...[...registrarText.matchAll(/kind\s*:\s*["'`]([a-z-]+)["'`]/g)].map((match) => match[1]),
  ];
  const scope = chainScope();
  const scopeText = scope.map(code).join("\n");
  const missing = [
    [scope.some((file) => checksExactOrigin(code(file))), "an exact Origin check"],
    [/csrf/i.test(scopeText), "a session-bound CSRF token check"],
    [/\b415\b/.test(scopeText), "a 415 for an unsupported content type"],
    [
      kinds.some((kind) => kind !== "public" && kind !== "protected-read"),
      "an access kind of its own for browser mutations, branched on in the registrar",
    ],
  ]
    .filter(([present]) => !present)
    .map(([, label]) => label);
  const leaves = leavesDoingPolicy();
  const problems = [
    ...(missing.length === 0 ? [] : [`the registrar's chain (${list(scope)}) is missing ${missing.join(", ")}`]),
    ...leaves,
  ];
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? `the chain is installed by construction in ${list(scope)} (kinds: ${[...new Set(kinds)].join(", ")})`
      : problems.join("; "),
  );
};

// 6. Case: the browser mutation, from the outside. "Origin is mandatory.
//    Require an exact allowlist match" and "For contracts with a request body,
//    require the exact expected media type ... and reject others — or an absent
//    header — with 415", both applied "before session resolution, so policy
//    failures reveal nothing about session state" and before any effect.
exports.mutationRefusesForeignBrowserRequests = () =>
  lib.runAcceptance({ suite: "bff-entry-points", name: "foreign-origin.test.ts", targetDir: "src" });

// 7. Case: the stream. "Never move tokens into the stream URL" / "Do not put
//    bearer tokens in the URL query (logged everywhere)."
const URL_CREDENTIAL = [
  [/[?&](?:token|access_token|accessToken|api_key|apiKey|sessionId|session|auth|jwt|ticket)=/, "a credential in a URL query string"],
  [/\.query\(\s*["'`](?:token|access_token|accessToken|sessionId|session|auth|jwt|ticket)["'`]/, "reads a credential from the query string"],
  [/searchParams\.get\(\s*["'`](?:token|access_token|accessToken|sessionId|session|auth|jwt|ticket)["'`]/, "reads a credential from the query string"],
];
exports.noCredentialsInStreamUrl = () => {
  const hits = production().flatMap((file) => {
    const text = code(file);
    return URL_CREDENTIAL.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(
    hits.length === 0,
    hits.length === 0 ? "the stream is authenticated by the session cookie, not a URL" : hits.join("; "),
  );
};

// 8. Case: the public probe. "Health probes are the canonical example: public,
//    but verdict-only (no dependency names, versions, or stack traces)."
exports.publicResponseVerdictOnly = () =>
  lib.runAcceptance({ suite: "bff-entry-points", name: "health-verdict-only.test.ts", targetDir: "src" });

// 9. Case: the public probe, as a reviewed set. "The public set is an
//    application decision; keep it small, snapshot it in a reviewed allowlist
//    test, and treat any diff as a security review" — gate 2 fails when "the
//    public endpoint set differs from the reviewed allowlist". A new public
//    entry point belongs in that snapshot, exactly; deleting or loosening the
//    snapshot to make it pass is the failure the gate exists to catch.
exports.publicAllowlistPinsTheNewEntry = (output, context) => {
  const wanted = pinned(context, "publicPinned");
  if (wanted.length === 0) return lib.verdict(false, "test case has no vars.publicPinned");
  const candidates = testFiles().filter((file) => {
    const text = code(file);
    return /["'`]public["'`]/.test(text) && /catalog/i.test(text);
  });
  if (candidates.length === 0) {
    return lib.verdict(
      false,
      `no reviewed allowlist test pins the entry points callable without signing in (tests: ${list(testFiles())})`,
    );
  }
  const pinning = candidates.filter((file) => {
    const snapshots = [...code(file).matchAll(/\.to(?:Strict)?Equal\(\s*\[([\s\S]*?)\]/g)].map((match) => match[1]);
    return snapshots.some((snapshot) =>
      wanted.every((entry) => new RegExp(`["'\`]${entry.method}\\s+${escapeRe(entry.path)}["'\`]`).test(snapshot)),
    );
  });
  return lib.verdict(
    pinning.length > 0,
    pinning.length > 0
      ? `the reviewed public allowlist in ${list(pinning)} pins ${wanted.map((entry) => `${entry.method} ${entry.path}`).join(", ")}`
      : `${list(candidates)} no longer pins ${wanted
          .map((entry) => `${entry.method} ${entry.path}`)
          .join(", ")} as an exact public set`,
  );
};

// 10. Case: the cross-tenant read. "403 on cross-tenant resources — it confirms
//     existence; use the no-oracle 404": 404 "for resources the principal cannot
//     know exist — cross-tenant IDs above all".
//
//     A tenancy decision is a comparison against the principal's tenant or a
//     read scoped by it — not the mere mention of `principal.tenantId`, which
//     the untouched fixture already contains while leaking every tenant's
//     orders.
const TENANCY_DECISION =
  /(?:!==|===|!=|==)\s*[\w.]*\bprincipal\.tenantId\b|\bprincipal\.tenantId\s*(?:!==|===|!=|==)|\b\w+\(\s*\{?\s*(?:tenantId\s*:\s*)?principal\.tenantId\b/;
const TENANCY_COMPARISON =
  /(?:!==|===|!=|==)\s*[\w.]*\bprincipal\.tenantId\b|\bprincipal\.tenantId\s*(?:!==|===|!=|==)/;
const DISCLOSED_REFUSAL = /\b403\b|forbidden|not-allowed|access-denied/i;
// A disclosed refusal counts against the file either when the file itself
// decides tenancy, or when the refusal sits within a few lines of the word
// "tenant" — the two shapes the anti-pattern takes.
const disclosesTenancy = (file) => {
  const text = code(file);
  const refusals = [...text.matchAll(new RegExp(DISCLOSED_REFUSAL.source, "gi"))];
  if (refusals.length === 0) return false;
  if (TENANCY_DECISION.test(text)) return true;
  return refusals.some((match) => /tenant/i.test(text.slice(Math.max(0, match.index - 240), match.index + 240)));
};
exports.crossTenantRefusalIsNotDisclosed = () => {
  const deciding = production().filter((file) => TENANCY_DECISION.test(code(file)));
  if (deciding.length === 0) {
    return lib.verdict(
      false,
      `no production file compares a resource's tenant with the caller's or scopes a read by it (production: ${list(production())})`,
    );
  }
  const hits = production()
    .filter(disclosesTenancy)
    .map((file) => `${lib.rel(file)} answers a tenancy decision with a disclosed refusal instead of the no-oracle 404`);
  return lib.verdict(
    hits.length === 0,
    hits.length === 0 ? `tenancy decided without an existence oracle in ${list(deciding)}` : hits.join("; "),
  );
};

// 11. Case: where the decision lives. "The BFF does not own product
//     authorization. Every protected application operation independently
//     authorizes the principal before performing protected effects" —
//     "Authorization decided in HTTP middleware only ... a non-HTTP caller then
//     bypasses it entirely" is an anti-pattern.
exports.authorizationInsideApplication = () => {
  const inAdapters = adapters()
    .filter((file) => TENANCY_COMPARISON.test(code(file)))
    .map((file) => `${lib.rel(file)} decides tenancy in the HTTP adapter`);
  const deciding = applicationFiles().filter((file) => TENANCY_DECISION.test(code(file)));
  if (inAdapters.length > 0) return lib.verdict(false, inAdapters.join("; "));
  return lib.verdict(
    deciding.length > 0,
    deciding.length > 0
      ? `the operation authorizes the principal: ${list(deciding)}`
      : `no framework-free operation authorizes the caller's tenant (application files: ${list(applicationFiles())})`,
  );
};

// 12. Case: the proof. "The most important test in this reference: invoke the
//     protected operation directly — no HTTP, no cookies, no registrar — with an
//     unauthorized principal from the test factory, and prove refusal happens
//     before any effect."
//
//     The rule is about the test, not about which file holds it: a direct
//     refusal test living beside the HTTP tests of the same feature counts, so
//     the search is per `it` block.
const HTTP_MARKER = /createApp|app\.request|app\.fetch|new Request\s*\(|cookie|headers/i;
const itBlocks = (text) => {
  const blocks = [];
  for (const match of text.matchAll(/\b(?:it|test)\s*(?:\.\w+)?\s*\(/g)) {
    blocks.push(balancedFrom(text, match.index + match[0].length - 1));
  }
  return blocks;
};
// Names in a test file that reach an application module: what it imports from
// one, plus whatever is bound from those names.
const applicationSymbols = (file, application) => {
  const text = code(file);
  const symbols = new Set(
    [...importBindings(file).entries()]
      .filter(([, target]) => application.some((module) => lib.sameFile(module, target) || module === target))
      .map(([name]) => name),
  );
  for (let round = 0; round < 3; round += 1) {
    for (const declaration of text.matchAll(/(?:const|let|var)\s+([\s\S]{1,120}?)=\s*([\s\S]*?);/g)) {
      const bound = identifiers(declaration[1]);
      if (identifiers(declaration[2]).some((name) => symbols.has(name))) for (const name of bound) symbols.add(name);
    }
  }
  return symbols;
};
exports.directRefusalTestExists = () => {
  const application = applicationFiles();
  if (application.length === 0) return lib.verdict(false, "no framework-free application module to test directly");
  const direct = testFiles().flatMap((file) => {
    const text = code(file);
    const reaches = localImports(file).some((imported) =>
      application.some((module) => lib.sameFile(module, imported) || module === imported),
    );
    if (!reaches) return [];
    const symbols = applicationSymbols(file, application);
    const blocks = itBlocks(text).filter(
      (block) =>
        !HTTP_MARKER.test(block) &&
        /tenant/i.test(block) &&
        identifiers(block).some((name) => symbols.has(name)),
    );
    return blocks.length > 0 ? [lib.rel(file)] : [];
  });
  return lib.verdict(
    direct.length > 0,
    direct.length > 0
      ? `refusal proven without HTTP in ${direct.join(", ")}`
      : `no test invokes an order operation directly with a foreign principal (tests: ${list(testFiles())})`,
  );
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "bff-entry-points", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);

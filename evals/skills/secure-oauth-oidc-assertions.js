// Deterministic graders for the secure-oauth-oidc quality suite.
//
// The fixture (fixtures/secure-oauth-oidc-workspace) declares only that people
// sign in with the company identity provider over OAuth 2.0 / OpenID Connect.
// Its sign-in code is a hack-day spike: a constant `state` held in a
// module-level Set, no PKCE, no nonce, an ID token trusted on its signature
// alone, the access token logged and handed back in the redirect URL, and no
// session at all. Nothing in the fixture teaches the protocol invariants, so
// the skill has to supply them.
//
// Most rules are graded by behaviour: a hidden test drives `createApp` with a
// fake OpenID provider and plays the hostile paths (another browser's state, a
// replayed callback, an ID token from the wrong issuer, an `org` named on the
// callback). The review case is graded from the reply. Every rule below is one
// the skill states; the rule is quoted above its grader.
//
// Two graders on the review case are floors rather than discriminators:
// `reviewNamesConcreteDefects` and `reviewCitesEvidence` both pass on a plain
// severity-ranked review written with no skill loaded. They are kept because a
// review that misses the defects or cites nothing is worthless whatever else
// it does; the discrimination on that case is meant to come from
// `reviewShowsAttackPath`, `reviewDeclaresUnknowns`, `reviewDemandsHostileTests`
// and `reviewRejectsFalseAssurances`.

const lib = require("./quality-lib");

const text = (output) => (typeof output === "string" ? output : JSON.stringify(output ?? ""));
const sentences = (reply) => reply.split(/(?<=[.!?:;\n])\s+/).filter((part) => part.trim() !== "");

// Hidden tests are addressed by case var so one grader can serve the
// single-provider and the two-provider cases.
const acceptance = (name) => (output, context) => {
  const file = context?.vars?.[name];
  if (typeof file !== "string" || file === "") return lib.verdict(false, `this case sets no vars.${name}`);
  return lib.runAcceptance({ suite: "secure-oauth-oidc", name: file, targetDir: "src" });
};

// The agent's own production code, located in the workspace the grader is
// pointed at rather than from the trail's absolute paths: everything under
// `src` that is not a test and not a copied-in hidden test. The one SDK
// stand-in is skipped only while the agent leaves it alone — a new file the
// agent puts anywhere, `src/lib` included, is scanned, and so is the stand-in
// once the agent edits it.
const SDK_STAND_IN = "src/lib/openid-provider.ts";

const production = (context) => {
  const touched = lib.touchedBy(context);
  return lib
    .sourceFiles(lib.resolve(lib.workspace(), "src"))
    .filter((file) => !lib.isTestPath(file) && !/\/acceptance-/.test(file))
    .filter((file) => lib.rel(file) !== SDK_STAND_IN || touched(file));
};

// "Establish the security profile first" is graded through behaviour, below.

// "Require PKCE for public clients and recommend it for confidential clients.
//  Default to PKCE for all authorization-code clients unless an applicable
//  profile says otherwise." / "Use `S256`, keep verifier/challenge
//  transaction-specific, enforce the verifier" — and "Require exact string
//  matching against pre-registered redirect URIs."
exports.pkceEnforced = acceptance("pkceTest");

// "`state`: high-entropy, one-time, securely bound to the initiating
//  user-agent session" / "Make authorization codes short-lived and single-use.
//  Treat a second redemption as a compromise signal."
exports.stateOneTimeAndSessionBound = acceptance("stateTest");

// "Validate an ID Token as a protocol object, not merely as a signed JWT. Bind
//  the local account to `(iss, sub)`, validate the relying-party audience and
//  authorized party, enforce time and nonce semantics" / "A valid JWT
//  signature does not establish the expected issuer, audience, token type,
//  freshness, nonce, or authorization."
exports.idTokenClaimsValidated = acceptance("idTokenTest");

// "Never put access tokens in URI query parameters." / "Treat tokens as
//  secrets in storage, transit, logs, traces, errors, URLs, analytics, and
//  test fixtures." / "Do not use HTTP 307 after credential-bearing form
//  submission; use 303 for an HTTP redirect."
exports.tokensNeverReachTheBrowser = acceptance("exposureTest");

// "For clients using multiple issuers, bind the chosen issuer to the
//  user-agent session and validate the issuer in the authorization response."
//  / "Publish and consume authorization-server metadata; validate the issuer
//  and do not mix endpoints or keys across issuers."
exports.issuerBoundToTransaction = acceptance("issuerTest");

// "Treat tokens as secrets in storage, transit, logs, traces, errors, URLs,
//  analytics, and test fixtures. … Keep secrets and raw tokens out of
//  telemetry. Record safe identifiers, decision reasons, issuer, client ID,
//  audience, grant type, and replay events instead." / "Never put access
//  tokens in URI query parameters." Read from the source the agent left
//  behind, so a flow that happens to keep the token out of one response but
//  still logs it is still caught.
//
// What is logged is decided from the *expressions* a console call is given,
// never from its prose: the skill positively asks for decision reasons in the
// log, so "could not exchange the code for an access token" must not be a
// finding. Only a value reaches the check — a `${...}` interpolation or a bare
// identifier argument. `hasAccessToken` and friends do not match, because the
// secret names below are case-sensitive and word-bounded.
const loggedExpressions = (source) => {
  const results = [];
  const call = /console\.(?:log|info|debug|warn|error|trace)\s*\(/g;
  let match;
  while ((match = call.exec(source)) !== null) {
    let index = call.lastIndex;
    let depth = 1;
    let expressions = "";
    while (index < source.length && depth > 0) {
      const char = source[index];
      if (char === "'" || char === '"') {
        const quote = char;
        index += 1;
        while (index < source.length) {
          if (source[index] === "\\") index += 2;
          else if (source[index] === quote) {
            index += 1;
            break;
          } else index += 1;
        }
        continue;
      }
      if (char === "`") {
        index += 1;
        while (index < source.length) {
          if (source[index] === "\\") {
            index += 2;
            continue;
          }
          if (source[index] === "`") {
            index += 1;
            break;
          }
          if (source[index] === "$" && source[index + 1] === "{") {
            index += 2;
            let braces = 1;
            while (index < source.length && braces > 0) {
              if (source[index] === "{") braces += 1;
              else if (source[index] === "}") braces -= 1;
              if (braces > 0) expressions += source[index];
              index += 1;
            }
            expressions += " ";
            continue;
          }
          index += 1;
        }
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
      expressions += char;
      index += 1;
    }
    results.push(expressions);
  }
  return results;
};

const SECRET_VALUE = /\b(?:accessToken|idToken|refreshToken|codeVerifier|clientSecret|access_token|id_token|refresh_token|code_verifier|client_secret|tokens|tokenSet|tokenResponse)\b/;

const LEAKS = [
  [(source) => loggedExpressions(source).some((expressions) => SECRET_VALUE.test(expressions)), "writes a token or secret to the log"],
  [(source) => /\b(?:local|session)Storage\b/.test(source), "puts protocol state in browser storage"],
  [(source) => /[?&](?:access_token|id_token|refresh_token|token)=\$\{/.test(source), "puts a token in a URL"],
  [(source) => /searchParams\.(?:set|append)\s*\(\s*["'](?:access_token|id_token|refresh_token)["']/.test(source), "puts a token in a URL"],
  [(source) => /code_challenge_method["']?\s*[,:=]\s*["']plain["']/.test(source), "uses the plain PKCE challenge method"],
];

exports.tokensStayOutOfLogsAndUrls = (output, context) => {
  const files = production(context);
  if (files.length === 0) return lib.verdict(false, "no production source found under src");
  const hits = files.flatMap((file) => {
    const source = lib.read(file);
    return LEAKS.filter(([leaks]) => leaks(source)).map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(hits.length === 0, hits.length === 0 ? `tokens stay server-side in ${files.map(lib.rel).join(", ")}` : hits.join("; "));
};

// ---------------------------------------------------------------- review case

// A review's findings, as written: a markdown heading, list item or blank-line
// paragraph starts a new one. Used so a grader can ask whether a *finding*
// carries something, rather than whether one sentence happens to.
const findings = (reply) =>
  reply
    .split(/\n\s*\n|\n(?=\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s))/)
    .map((block) => block.trim())
    .filter((block) => block !== "");

// Sentences taken two at a time, so an attack path written across a sentence
// boundary ("An attacker crafts a callback. The victim is signed in as them.")
// still reads as one path. Windows are consumed greedily so one path is
// counted once.
const sentenceWindows = (reply) => {
  const parts = sentences(reply);
  return parts.map((part, index) => `${part} ${parts[index + 1] ?? ""}`);
};

const countNonOverlapping = (windows, matches) => {
  let found = 0;
  for (let index = 0; index < windows.length; index += 1) {
    if (matches(windows[index])) {
      found += 1;
      index += 1;
    }
  }
  return found;
};

// "Follow an attack path from attacker capability to asset and impact; do not
//  report parameter absence without proving applicability." Every defect the
//  spike actually has, found and named. FLOOR: a competent review with no
//  skill loaded also names these; a review that does not is not worth reading.
const DEFECTS = [
  ["no PKCE on the authorization code flow", (reply) => /\bPKCE\b|code[_ -]?challenge|code[_ -]?verifier/i.test(reply)],
  [
    "the state is constant, shared between browsers and never retired",
    (reply) =>
      /\bstate\b/i.test(reply) &&
      /hard-?coded|constant|fixed|static|literal|predictable|guessable|module[- ]level|global|shared|not (?:bound|tied|one-?time|per-|unique)|one-?time|single[- ]use|never (?:removed|deleted|cleared)|replay/i.test(reply),
  ],
  [
    "the access token is handed to the browser in the redirect URL",
    (reply) =>
      /access[_ ]?token|token/i.test(reply) &&
      /query (?:string|param)|URL|redirect|location header|browser history|referer|referrer|address bar/i.test(reply),
  ],
  [
    "the ID token is accepted on its signature alone",
    (reply) => /id[_ ]?token/i.test(reply) && /\biss\b|issuer|\baud\b|audience|\bexp\b|expir|nonce|claims?/i.test(reply),
  ],
  ["the access token is written to the log", (reply) => /console\.log|\blogs?\b|\blogged\b|\blogging\b/i.test(reply) && /token|secret/i.test(reply)],
];

exports.reviewNamesConcreteDefects = (output) => {
  const reply = text(output);
  const missing = DEFECTS.filter(([, found]) => !found(reply)).map(([label]) => label);
  const found = DEFECTS.length - missing.length;
  return {
    pass: missing.length <= 1,
    score: found / DEFECTS.length,
    reason: missing.length === 0 ? `all ${DEFECTS.length} defects named` : `${found}/${DEFECTS.length} named; missed: ${missing.join("; ")}`,
  };
};

// "Give file/line, configuration path, metadata field, HTTP trace, or
//  reproducible scenario as evidence." FLOOR, as above: naming the two files
//  and quoting their identifiers is what any review of two named files does.
const ANCHORS = ["buildSignInUrl", "finishSignIn", "started", "verifyIdTokenSignature", "exchangeCode", "access_token", "console.log", '"sign-in"', "'sign-in'", "`sign-in`"];

exports.reviewCitesEvidence = (output) => {
  const reply = text(output);
  const files = ["auth.ts", "index.ts"].filter((file) => reply.includes(file));
  const anchors = ANCHORS.filter((anchor) => reply.includes(anchor));
  const lines = (reply.match(/(?:\.ts:\d+|\blines?\s+\d+)/gi) ?? []).length;
  const evidence = anchors.length + (lines > 0 ? 1 : 0);
  const pass = files.length === 2 && evidence >= 3;
  return lib.verdict(
    pass,
    pass
      ? `findings anchored in ${files.join(" and ")} via ${anchors.join(", ")}${lines > 0 ? ` and ${lines} line reference(s)` : ""}`
      : `files named: ${files.join(", ") || "(none)"}; code/line anchors: ${anchors.join(", ") || "(none)"}${lines > 0 ? ` + ${lines} line reference(s)` : ""}`,
  );
};

// "Follow an attack path from attacker capability to asset and impact; do not
//  report parameter absence without proving applicability."
//
// A path is somebody with a capability plus what they get out of it. Both
// halves are matched on substance and in whatever words the writer used —
// "whoever holds it can redeem it", "anyone who can read the URL can call our
// APIs as that person" and "a malicious provider would sign that person in"
// are all paths. What fails this grader is a finding that stops at "the
// request has no code_challenge".
const ATTACKER = /attacker|adversar|malicious|hostile|rogue|victim|phish|eavesdropp|\banyone\b|\bsomeone\b|\bwhoever\b|\banybody\b|third[- ]party|another (?:site|page|browser|tab|user|person|client|customer|organisation|organization|provider)|other people|compromised|insider|man[- ]in[- ]the[- ]middle|\bMITM\b|bad actor|any(?:one|body)? with (?:the|a|access)/i;

const IMPACT = [
  /(?:sign|signs|signed|signing|log|logs|logged|logging)[^.\n]{0,40}\bin as\b/i,
  /\b(?:sign|signs|signed|signing|log|logs|logged|logging)\s+(?:that|the|this|them|him|her|us|their|our|a|any)\b[^.\n]{0,30}\bin\b/i,
  /\bin as\b[^.\n]{0,40}(?:attacker|them|that person|the victim|someone else|another (?:user|person)|us)/i,
  /account takeover|session (?:takeover|fixation|hijack)|take(?:s|n)? over[^.\n]{0,30}(?:account|session|identity)|impersonat|hijack/i,
  /act(?:s|ing)? as|call(?:s|ing)? (?:our|the|any)[^.\n]{0,20}APIs?[^.\n]{0,20}\bas\b|\bas (?:that|the|another) (?:person|user|customer|member of staff|employee)\b/i,
  /redeem|exchange (?:it|that|the code)[^.\n]{0,30}token|obtain(?:s|ing)? [^.\n]{0,20}token|use (?:the|that|their|our|a stolen) [^.\n]{0,20}token/i,
  /steal|stolen|exfiltrat|leak(?:s|ed|ing)? (?:the|their|our|a)[^.\n]{0,20}(?:token|secret|code|credential)/i,
  /read (?:the|our|their|a)[^.\n]{0,25}(?:URL|log|logs|history|referer|referrer|analytics|proxy)/i,
  /gain(?:s|ing)? access|get(?:s|ting)? (?:in|access)|access (?:the|their|our|any)[^.\n]{0,25}(?:account|API|data|portal|session)/i,
  /(?:their|the victim's|somebody else's|someone else's) (?:account|session|data|identity|email)/i,
];

const carriesAttackPath = (block) => ATTACKER.test(block) && IMPACT.some((pattern) => pattern.test(block));

exports.reviewShowsAttackPath = (output) => {
  const reply = text(output);
  const byFinding = findings(reply).filter(carriesAttackPath).length;
  const byProse = countNonOverlapping(sentenceWindows(reply), carriesAttackPath);
  const paths = Math.max(byFinding, byProse);
  return lib.verdict(
    paths >= 2,
    paths >= 2 ? `${paths} findings carry an attacker-to-impact path` : `${paths} finding(s) carry an attacker-to-impact path; the rest report a missing parameter`,
  );
};

// "Unknowns and assumptions — never silently convert missing evidence into
//  compliance." / "Mark anything not inspected as unknown."
exports.reviewDeclaresUnknowns = (output) => {
  const reply = text(output);
  const markers = (reply.match(/\bunknown|not inspected|not verified|unverified|could not (?:verify|confirm|inspect)|no evidence|assumption|assumed|assuming|out of scope|needs? confirm/gi) ?? []).length;
  return lib.verdict(markers >= 2, markers >= 2 ? `${markers} unknown/assumption markers` : `${markers} unknown/assumption marker(s): the review reports only what it found`);
};

// "A provider's successful happy path is not security evidence. Exercise
//  hostile redirects, replay, issuer substitution, and validation failures." /
//  Delivery contract: "Tests and runtime checks — positive, negative, replay,
//  and failure-path coverage."
//
// Read only near where the review talks about tests or verification, so
// hostile behaviour described in a finding does not count as a test asked for.
const around = (reply, pattern, before, after) =>
  [...reply.matchAll(pattern)].map((match) => reply.slice(Math.max(0, match.index - before), match.index + after)).join("\n");

const HOSTILE_TESTS = [
  ["replay", /replay|redeem(?:ed|ing)?[^.\n]{0,30}twice|second (?:redemption|use)|reuse[^.\n]{0,20}code|single[- ]use|more than once/i],
  ["issuer substitution", /issuer|\biss\b claim|mix-?up|wrong provider|another provider|other provider|foreign issuer/i],
  ["hostile callback", /CSRF|forged|unsolicited|injected code|code injection|hostile|attacker[- ](?:supplied|controlled)|another browser|browser that (?:never|did not|has not)|unknown state|mismatch(?:ed|ing)? state|open redirect/i],
  ["validation failure", /expired|wrong audience|\baud\b[^.\n]{0,20}mismatch|audience mismatch|nonce mismatch|missing nonce|tampered|malformed|invalid signature|bad claim|failure path|negative (?:test|case)/i],
];

exports.reviewDemandsHostileTests = (output) => {
  const reply = text(output);
  const scope = around(reply, /\btest(?:s|ing|ed)?\b|\bverif(?:y|ies|ied|ication)\b|\bprove\b|\bproof\b|\bregression\b|\bcoverage\b/gi, 200, 600);
  const named = HOSTILE_TESTS.filter(([, pattern]) => pattern.test(scope)).map(([label]) => label);
  return lib.verdict(
    named.length >= 2,
    named.length >= 2
      ? `asks for hostile-path evidence: ${named.join(", ")}`
      : `${named.length} hostile-path test(s) asked for (${named.join(", ") || "none"}); the happy path is treated as the evidence`,
  );
};

// "Reject false assurances" — presence of `state` is not protection, TLS does
// not stop mix-up or Referer leakage, a valid JWT signature establishes
// nothing, CORS and SameSite are not substitutes for protocol bindings.
//
// Every connective is word-bounded and every hit is dropped when the matched
// span carries a negation, because the skill's own wording for these rules is
// the denial: "a valid signature establishes only that some key we trust
// signed the claims; it does not establish the issuer" must not read as the
// claim it refutes.
const FALSE_ASSURANCES = [
  [/(?:TLS|HTTPS)[^.\n]{0,80}?\b(?:is|are)\s+(?:enough|sufficient)\b/i, "claims TLS/HTTPS is enough"],
  [/(?:TLS|HTTPS)[^.\n]{0,80}?\b(?:so|therefore|means|which makes)\b[^.\n]{0,60}?\b(?:safe|secure|protected|fine|no risk)\b/i, "treats TLS/HTTPS as the protection"],
  [/\b(?:since|because|as)\s+(?:we(?:'re| are)|it(?:'s| is)|this is|everything is)\s+(?:over\s+|on\s+)?(?:TLS|HTTPS)[^.\n]{0,80}?\b(?:safe|secure|fine|no risk)\b/i, "treats TLS/HTTPS as the protection"],
  [/\bstate\b[^.\n]{0,80}?\b(?:is|are)\s+(?:present|there|set|in place|already)\b[^.\n]{0,80}?\b(?:so|therefore|which means)\b[^.\n]{0,60}?\b(?:CSRF|covered|protected|safe|fine|handled)\b/i, "treats the presence of state as CSRF protection"],
  [/(?:valid signature|signature is valid|signature check[^.\n]{0,20})[^.\n]{0,80}?\b(?:so|therefore|means|hence)\b[^.\n]{0,60}?\b(?:trust|trusted|safe|authentic|genuine|fine)\b/i, "treats a valid signature as trust"],
  [/(?:CORS|SameSite)[^.\n]{0,80}?\b(?:protects?|prevents?|stops?|handles?)\b[^.\n]{0,40}?CSRF/i, "offers CORS/SameSite as the CSRF defence"],
  [/client secret[^.\n]{0,80}?\b(?:protects?|prevents?|stops?)\b[^.\n]{0,60}?\b(?:injection|replay|CSRF|the code)\b/i, "treats client authentication as code-injection protection"],
];

const NEGATED = /\b(?:not|never|no|cannot|can't|doesn't|does not|isn't|is not|aren't|are not|won't|nothing|neither|only)\b|n't\b/i;

exports.reviewRejectsFalseAssurances = (output) => {
  const reply = text(output);
  const hits = FALSE_ASSURANCES.filter(([pattern]) => {
    const match = reply.match(pattern);
    return match !== null && !NEGATED.test(match[0]);
  }).map(([, label]) => label);
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no false assurance offered" : hits.join("; "));
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "secure-oauth-oidc", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);

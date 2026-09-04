// Deterministic graders for the secure-oauth-oidc quality suite.
//
// The fixture (fixtures/secure-oauth-oidc-workspace) declares only that people
// sign in with the company identity provider over OAuth 2.0 / OpenID Connect.
// Its sign-in code is a hack-day spike: a constant `state` held in a
// module-level Set, no PKCE, no nonce, an ID token trusted on its signature
// alone, the access token logged and handed back in the redirect URL, and no
// session at all. `docs/sign-in-notes.md` is the spike author's hand-off note,
// which argues the callback side is already fine. Nothing in the fixture
// teaches the protocol invariants, so the skill has to supply them.
//
// Every rule is graded by behaviour: a hidden test drives `createApp` with a
// fake OpenID provider and plays the hostile paths (another browser's state, a
// replayed callback, an ID token from the wrong issuer, an `org` named on the
// callback, a `returnTo` pointing off our origin). The one grader that reads
// the workspace instead of running it is `tokensStayOutOfLogsAndUrls`, because
// a token written to the log is invisible to an HTTP response. Every rule
// below is one the skill states; the rule is quoted above its grader.
//
// There is deliberately no prose-graded review case. One was carried through
// two rounds and refuted both times: with the defects this blatant a competent
// review needs no skill, and the hand-off note that was added to give the
// reviewer something to refute handed over the rubric instead. The skill's
// review path is therefore uncovered here; see COVERAGE.md.

const lib = require("./quality-lib");

const text = (output) => (typeof output === "string" ? output : JSON.stringify(output ?? ""));
// Patterns below bound a match to one sentence with `[^.\n]`. Collapsing
// whitespace first means a reply is scored on its words rather than on where
// its author wrapped the lines.
const flat = (value) => value.replace(/\s+/g, " ").trim();

// Hidden tests are addressed by case var so one grader can serve the
// single-provider and the two-provider cases.
const acceptance = (name) => (output, context) => {
  const file = context?.vars?.[name];
  if (typeof file !== "string" || file === "") return lib.verdict(false, `this case sets no vars.${name}`);
  return lib.runAcceptance({ suite: "secure-oauth-oidc", name: file, targetDir: "src" });
};

// The agent's own production code, located in the workspace the grader is
// pointed at rather than from the trail's absolute paths: everything under
// `src` that is not a test and not a copied-in hidden test. The vendor
// stand-in is recognised by what the file says it is — the fixture's own
// "Stand-in for the identity team's OpenID provider SDK" marker — rather than
// by where it sits, and it is skipped only while the agent leaves it alone. A
// new file the agent writes anywhere, `src/lib` included, is scanned, and so
// is the stand-in once the agent edits it.
const VENDOR_STAND_IN = /stand-?in for the identity team/i;

const production = (context) => {
  const touched = lib.touchedBy(context);
  return lib
    .sourceFiles(lib.resolve(lib.workspace(), "src"))
    .filter((file) => !lib.isTestPath(file) && !/\/acceptance-/.test(file))
    .filter((file) => touched(file) || !VENDOR_STAND_IN.test(lib.read(file)));
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

// "Reject open redirectors at both client and authorization server
//  boundaries." / "`state`: … integrity-protected when it carries application
//  state." / "Require exact string matching against pre-registered redirect
//  URIs" — the same rule one layer in: a destination the link supplies is
//  attacker input, and the portal, not the link, decides where the browser
//  lands when the sign-in finishes.
//
// The hidden test plays the three shapes that get past a substring check: an
// absolute URL on another origin, a scheme-relative `//host` and a host that
// merely starts with ours. It also drives the honest deep link, so the grader
// cannot pass vacuously on a portal that never implemented one.
exports.openRedirectRefused = acceptance("openRedirectTest");

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

// "Reject false assurances: TLS does not stop endpoint mix-up, browser
//  history, Referer leakage, open redirects, or a compromised endpoint. A valid
//  JWT signature does not establish the expected issuer, audience, token type,
//  freshness, nonce, or authorization. CORS, SameSite cookies, client secrets in
//  browser code, and hiding parameters are not substitutes for protocol
//  bindings." / "Presence of `state` is not protection unless it is
//  unpredictable, one-time, validated, and bound to the initiating session." /
//  "Do not mistake client authentication for protection against code injection."
//
// A guard, not a discriminator: it runs on every case and can only penalise an
// arm whose own hand-back offers one of those assurances as the reason it left
// something alone. The fixture's hand-off note offers all six, so an agent that
// takes the note at its word and says so is caught here.
//
// Every connective is word-bounded and every hit is dropped when the matched
// span carries a negation, because the skill's own wording for these rules is
// the denial: "a valid signature establishes only that some key we trust
// signed the claims; it does not establish the issuer" must not read as the
// claim it refutes. A hit is dropped too when the run-up attributes the claim
// to somebody else, so quoting the note in order to knock it down is never
// scored as offering it.
const FALSE_ASSURANCES = [
  [/(?:TLS|HTTPS)[^.\n]{0,80}?\b(?:is|are)\s+(?:enough|sufficient)\b/i, "claims TLS/HTTPS is enough"],
  [/(?:TLS|HTTPS)[^.\n]{0,80}?\b(?:so|therefore|means|which makes)\b[^.\n]{0,60}?\b(?:safe|secure|protected|fine)\b/i, "treats TLS/HTTPS as the protection"],
  [/\b(?:since|because|as)\s+(?:we(?:'re| are)|it(?:'s| is)|this is|everything is)\s+(?:over\s+|on\s+)?(?:TLS|HTTPS)[^.\n]{0,80}?\b(?:safe|secure|fine)\b/i, "treats TLS/HTTPS as the protection"],
  [/\bstate\b[^.\n]{0,80}?\b(?:is|are)\s+(?:present|there|set|in place|already)\b[^.\n]{0,80}?\b(?:so|therefore|which means)\b[^.\n]{0,60}?\b(?:CSRF|covered|protected|safe|fine|handled)\b/i, "treats the presence of state as CSRF protection"],
  [/(?:valid signature|signature is valid|signature check[^.\n]{0,20})[^.\n]{0,80}?\b(?:so|therefore|means|hence)\b[^.\n]{0,60}?\b(?:trust|trusted|safe|authentic|genuine|fine)\b/i, "treats a valid signature as trust"],
  [/(?:CORS|SameSite)[^.\n]{0,80}?\b(?:protects?|prevents?|stops?|handles?)\b[^.\n]{0,40}?CSRF/i, "offers CORS/SameSite as the CSRF defence"],
  [/client secret[^.\n]{0,80}?\b(?:protects?|prevents?|stops?)\b[^.\n]{0,60}?\b(?:injection|replay|CSRF|the code)\b/i, "treats client authentication as code-injection protection"],
];

const NEGATED = /\b(?:not|never|no|cannot|can't|doesn't|does not|isn't|is not|aren't|are not|won't|nothing|neither|only)\b|n't\b/i;

const ATTRIBUTED =
  /\bthe note\b|\bnote says\b|\bclaims? (?:that|to)\b|\b(?:this|that|the|first|second|third|fourth|next|another|final|last|same)\s+claim\b|\bclaimed\b|\bsays\b|\bsaid\b|assum\w*|believ\w*|according to|\bargues?\b|\bargued\b|reasoning|assurances?\b|\bauthor\b|hack[- ]day/i;

const allMatches = (reply, pattern) => [...reply.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))];

exports.noFalseAssuranceOffered = (output) => {
  const reply = flat(text(output));
  const hits = FALSE_ASSURANCES.filter(([pattern]) =>
    allMatches(reply, pattern).some((match) => {
      const runUp = reply.slice(Math.max(0, match.index - 160), match.index);
      return !NEGATED.test(match[0]) && !ATTRIBUTED.test(runUp);
    }),
  ).map(([, label]) => label);
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no false assurance offered" : hits.join("; "));
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "secure-oauth-oidc", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);

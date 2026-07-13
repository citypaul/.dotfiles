# OAuth/OIDC Review and Delivery Protocol

Use this protocol to make a security review reproducible and actionable. A review is complete only when its scope, evidence, attack paths, requirement sources, remediation, and verification are explicit.

## Contents

- [Evidence collection](#evidence-collection)
- [Review sequence](#review-sequence)
- [Finding model](#finding-model)
- [Severity calibration](#severity-calibration)
- [Report template](#report-template)
- [Implementation and migration delivery](#implementation-and-migration-delivery)
- [Completion gate](#completion-gate)

## Evidence collection

Inspect the actual implementation and deployment surfaces in scope:

- client and provider registration, redirect URIs, grant/response types, response modes, client type, authentication method;
- authorization, token, introspection, revocation, UserInfo, JWKS, discovery/metadata, PAR, device, logout, and callback endpoints;
- transaction/session storage for issuer, state, nonce, PKCE verifier, redirect URI, timestamps, and one-use state;
- authorization code issuance/redemption and refresh-token family/reuse state;
- access/ID Token validation configuration, allowed algorithms, issuer/audience/resource, clock policy, token type, proof binding;
- resource-server authorization on every route/action;
- reverse proxy, ingress, service mesh, TLS, and trusted forwarded/certificate headers;
- browser headers, CORS, CSP, cookies, callback page resources, Referrer Policy, URL/history handling, `postMessage` origins;
- log/trace/error redaction, secret stores, caches, queues, analytics, support tools, and incident/revocation paths;
- exact library/product versions and their primary documentation;
- positive, negative, replay, concurrency, integration, and conformance tests.

Useful repository search terms:

```text
oauth|oidc|openid|authorize|callback|redirect_uri|response_type|response_mode
state|nonce|pkce|code_challenge|code_verifier|issuer|discovery|jwks
access_token|refresh_token|id_token|userinfo|introspect|revoke|dpop|mtls
audience|resource|scope|authorization_details|private_key_jwt|client_secret
forwarded|x-forwarded|client-cert|cors|postMessage|referrer|frame-ancestors
```

Do not read or expose secret values merely because a matching file exists. Identify secret-bearing paths, redact output, and inspect structure/configuration without transmitting credentials or customer data.

## Review sequence

1. **Freeze scope.** Name the deployments, tenants, clients, issuers, resource servers, flows, and code/config revisions reviewed. Exclude unrelated auth systems explicitly.
2. **Declare profile.** List the stable standards and any ecosystem/vendor/regulatory profile. Identify drafts as drafts.
3. **Map parties and flows.** Include legacy and error paths, not only the preferred flow.
4. **Build the transaction ledger.** Trace issuer/state/nonce/PKCE/code/token bindings end to end.
5. **Apply RFC 9700 controls.** Mark each applicable control `satisfied`, `failed`, `unknown`, or `not applicable`, with evidence.
6. **Apply OIDC/profile controls.** Validate identity and discovery separately from OAuth authorization.
7. **Attack the boundaries.** Use the negative tests in `attack-and-test-catalog.md`; prioritize redirects, multi-issuer routing, callback correlation, code exchange, token audience/sender, refresh replay, and proxy trust.
8. **Follow assets to impact.** Show what a stolen/injected artifact lets the attacker do and which later control does or does not stop it.
9. **Check operations.** Verify redaction, alerts, key rotation, revocation propagation, incident response, and deployment parity.
10. **Report honestly.** Unknown is not pass; a configured control is not enforced until a negative test or equivalent evidence proves it.

## Finding model

Give every finding a stable ID and these fields:

| Field | Required content |
|---|---|
| Title | Concrete failure, not a vague topic: “Token endpoint accepts verifier without original challenge” |
| Category | `normative-noncompliance`, `exploitable-weakness`, `defense-in-depth`, or `unknown` |
| Severity | `critical`, `high`, `medium`, `low`, or `informational` |
| Affected parties/flows | Exact client, issuer, resource, endpoint, and environment |
| Requirement | Source + section + strength; distinguish profile/local policy from RFC requirement |
| Evidence | File and line, config path, metadata field, sanitized trace, or reproducible inputs → observed result |
| Attack path | Attacker capability → precondition → action → artifact/decision compromised → impact |
| Existing controls | Controls that reduce likelihood or impact, plus why they do not fully close the issue |
| Remediation | Smallest correct end-to-end change; include compatibility/migration implications |
| Verification | Negative test or observable result that proves closure |
| Confidence | `confirmed`, `high`, `medium`, or `low`; name missing evidence |

Do not create a separate finding for every file when one root protocol invariant is broken across several files. Conversely, do not merge unrelated attack paths into an unfixable “OAuth is insecure” umbrella.

## Severity calibration

Normative strength and severity are separate axes. Calibrate by exploitability, asset, blast radius, duration, detectability, and existing controls.

| Severity | Typical OAuth/OIDC examples |
|---|---|
| **Critical** | Internet-reachable arbitrary redirect or token endpoint substitution yielding broad live tokens; ID Token accepted without signature/issuer/audience validation leading to account takeover; signing/private keys exposed; refresh replay gives persistent privileged access at scale. |
| **High** | Public code client without effective PKCE; multi-issuer mix-up; access tokens accepted at wrong audience; callback CSRF/account linking with practical victim path; raw tokens in broadly accessible logs; DPoP/mTLS binding not enforced. |
| **Medium** | Required control missing but exploitation needs meaningful local access or narrow conditions; refresh inactivity expiry absent; callback page leaks a short-lived PKCE-bound code but another control substantially limits use; insufficient clickjacking protection on low-impact consent. |
| **Low** | Defense-in-depth weakness with limited credible impact; a SHOULD lacks rationale but compensating controls are verified; metadata omission that creates operational fragility rather than an immediate bypass. |
| **Informational** | Confirmed good control, migration note, or evidence gap with no current indication of failure. Do not disguise an uninvestigated high-impact boundary as informational. |

Examples are not fixed ratings. An implicit flow may be critical in one deployment and medium in another depending on token privilege, leakage vectors, sender constraint, and compensating controls. Explain the rating.

## Report template

```markdown
# OAuth/OIDC Security Review

## Scope and profile
- Deployments/versions:
- Parties and client types:
- Flows enabled:
- Issuers/resources:
- Standards/profiles (status and version):
- Explicit exclusions:

## Architecture and transaction invariants
| Flow | Artifact | Producer → consumer | Required binding/validation | Evidence |
|---|---|---|---|---|

## Executive risk
- Highest credible attack path:
- Assets and blast radius:
- Immediate containment, if any:

## Findings
### OAUTH-001 — [title]
- Category / severity / confidence:
- Affected surface:
- Requirement:
- Evidence:
- Attack path:
- Existing controls:
- Remediation:
- Verification:

## Satisfied controls
| Control | Evidence | Negative test |
|---|---|---|

## Unknowns and assumptions
| Unknown | Why it matters | How to resolve | Owner |
|---|---|---|---|

## Remediation order
1. Containment / insecure-flow removal
2. Root protocol binding
3. Token blast-radius reduction
4. Operational and defense-in-depth controls

## Tests and observability
- Positive:
- Negative/replay/concurrency:
- Conformance/interoperability:
- Safe telemetry and alerts:

## Residual risk and exceptions
| Exception | Rationale | Compensating control | Owner | Expiry/review date |
|---|---|---|---|---|
```

## Implementation and migration delivery

For a build or fix, deliver vertical protocol behavior rather than scattered configuration edits:

1. **Specify the invariant and failing scenario.** Example: a code is redeemable only by the client instance that created the `S256` challenge.
2. **Write a negative test first** when the repository's workflow supports it.
3. **Change every participating boundary.** A DPoP change may require client proof generation, authorization-server token binding, and resource-server proof enforcement.
4. **Keep failure atomic.** Do not create a local session, cache tokens, call UserInfo, or invoke an API until all required validations succeed.
5. **Add safe observability.** Record control decisions and replay events without raw artifacts.
6. **Exercise compatibility.** Provider metadata, older clients, key rotation, clock skew, proxy paths, concurrent refresh, and error responses.
7. **Stage migrations explicitly.** Inventory consumers, publish capability, deploy accepting side, migrate senders, observe, remove weaker mode, and expire any exception.

For insecure-grant migration:

- map every use of implicit or resource-owner-password grants and the user/API capability it supports;
- select authorization code + PKCE or another fit-for-purpose stable grant/profile;
- preserve authorization semantics, not merely login UX;
- prevent downgrade to the legacy grant during coexistence;
- revoke or expire legacy tokens/credentials after cutover;
- define a removal date and owner before enabling a transition mode.

## Completion gate

Do not claim the work is complete until:

- scope and applicable profile are explicit;
- every high-impact boundary has direct evidence or is marked unknown;
- every finding has an attack path, source, remediation, and closure test;
- all required issuer, transaction, redirect, token, and proof bindings are tested on failure paths;
- no returned token or session is used before validation completes;
- raw secrets/tokens are absent from output and telemetry;
- migrations remove or time-box weaker modes and have rollback/containment plans;
- repository tests and applicable provider/conformance tests pass;
- residual exceptions have owners and review/expiry dates.

A green checklist without hostile tests is not completion. A successful conformance suite is strong evidence for the profile it covers, but not proof that surrounding application authorization, proxy trust, token storage, or deployment configuration is secure.

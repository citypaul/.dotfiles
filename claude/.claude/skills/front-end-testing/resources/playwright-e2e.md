# Playwright E2E Evidence: The Browser Must Do the Work

This resource covers **Playwright Test running against a running application** — E2E and user-journey suites. It is not about Vitest Browser Mode: both use browser engines, but their subjects differ. Browser Mode renders a component in isolation and its subject is that component's contract; Playwright E2E drives the served application through real navigation, and its subject is whatever the test's *claim* says it is. Do not transfer harness assumptions between the two merely because both say "browser".

**The core rule: a test's evidence must come from the public interface of the subject its claim names.** A browser or user-journey test must prove that the browser/frontend initiated the work it claims. A direct HTTP client must not silently stand in for a user, the frontend, browser cookie policy, CSRF/Fetch Metadata checks, redirects, loading/error state, or rendering. An HTTP endpoint can be perfectly public and still be the wrong interface for a browser claim.

Why it matters: a "user creates a session" test that calls the endpoint directly stays green when the button's handler is deleted, when the cookie stops being sent, when CSRF middleware rejects the real frontend, when the redirect breaks, or when the result never renders. The test then certifies a journey no user can complete.

---

## The Decision Rule

Classify what each step of the test really is:

- A **user action** is initiated through an accessible locator (`getByRole`, `getByLabel`, ...) and a real locator action — `click`, `fill`, keyboard input. This is the only initiator a "user does X" claim may use.
- **Automatic frontend work** (a probe on mount, a refresh after navigation, an SSE subscription) is *caused* by navigation, reload, mount, or a UI state transition — then **observed**. The test may listen to the request/response; it must not manufacture the request.
- A **direct HTTP call** (`page.request`, `APIRequestContext`, `fetch`, an HTTP helper) is allowed only when the test's explicit subject is an HTTP contract, a readiness probe, a fixture/setup seam, a server-side post-condition check after honest browser actions, a diagnostic, or a deliberate external actor. Its test name and comments must state that narrower role — and what it does *not* prove.
- **Setup evidence cannot be borrowed.** Direct-API setup may create pre-existing state, but the browser claim begins only when the page is created/navigated, and the browser portion must independently prove its stated outcome.

## Evidence Boundaries

| Test claim | Real initiator | Permitted driver | Invalid shortcut | Required observable outcome |
|---|---|---|---|---|
| "User creates/joins/edits X" | The user's gesture | Accessible locator action (`getByRole(...).click()`, `fill`) | `page.request.post(...)`, `page.evaluate(fetch)` | User-visible result rendered (`expect(locator).toBeVisible()` on the outcome) |
| "Frontend probes/refreshes/streams X" | Frontend code on navigation/mount/state change | `page.goto`, `reload`, UI transition + `waitForResponse` observer | Manufacturing the request the frontend should send | Observed browser-initiated request *and* the UI state it produces |
| "Sign-in / sign-out works" | User through provider UI, redirects, callback | Locator actions across the real redirect flow; fresh navigation to prove session | Direct login endpoint call, injected tokens/cookies presented as flow proof | Authenticated (or unauthenticated) UI after a fresh navigation/reload |
| "HTTP API contract holds" | An HTTP client (that *is* the subject) | `request` fixture / `APIRequestContext` | Calling it a browser/journey/E2E test | Documented status, headers, body shape asserted |
| "Service is ready" (harness) | Operator/harness | HTTP probe before the page exists | Citing the probe as UI evidence | Probe success gates the run; the browser claim starts afterwards |
| "Given pre-existing state, user does X" | Fixture seam, then the user | Direct-API/DB setup, then locator actions from navigation onward | Letting the setup half also serve as the proof of X | The browser portion proves X on its own |
| "Diagnostic endpoint reports X" | A diagnostic client | Direct call to the diagnostic contract | Citing it as proof a panel loaded/rendered X | The diagnostic response itself — nothing about UI |

Names, comments, CI step labels, docs, and PR prose are evidence too: no "E2E", "browser", or "journey" label may claim more than the driver and assertions prove. A test narrowed to API setup/readback must lose its journey name.

---

## Observing Requests Without Performing Them

Attach the listener **before** the user action, match the method and the *parsed* URL path precisely, drive the action through the UI, then assert both the response (where useful) and the stable user-visible state:

```ts
// ❌ WRONG: the test performs the frontend's job.
const response = await page.request.post('/api/sessions', { data })

// ❌ WRONG: broad substring predicate — can match stale or unrelated traffic.
const anything = page.waitForResponse((r) => r.url().includes('/api/'))

// ✅ CORRECT: the user acts; Playwright observes the request the frontend owns.
// Note: no await on the next line — attach first, await after the action,
// or the observer races the response and can hang. (This is the official
// playwright.dev/docs/network pattern.)
const created = page.waitForResponse((response) =>
  response.request().method() === 'POST' &&
  new URL(response.url()).pathname === '/api/sessions'
)
await page.getByRole('button', { name: 'Create' }).click()
expect((await created).status()).toBe(201)
await expect(page.getByRole('heading', { name: 'Session created' })).toBeVisible()
```

`waitForResponse` is an **observer, not proof by itself**. Ownership and user impact are established by the accessible action that initiated the request and by the rendered outcome. A test that only observes a response — with no UI initiator or no rendered assertion — has not proved a browser claim.

Web-first auto-retrying assertions (`await expect(locator).toBeVisible()`) are the default readiness signal; reach for `waitForResponse` only when the network exchange itself is part of the claim. `page.requests()` (v1.56+) reads recent request history for diagnostics — it does not replace a pre-attached observer for awaiting a specific in-flight response.

**Why `page.request` cookies don't make it browser evidence:** `page.request` shares the browser context's cookie jar, so its calls *look* authenticated — but they originate directly from Node.js. They are not initiated by frontend code, not intercepted by `page.route()`, not subject to CORS or service workers, and carry no browser-generated Fetch Metadata from a real user gesture. Shared cookies prove the jar works, not that the frontend, the user, or the browser's security posture did anything.

---

## The Direct-Transport Audit

To audit an existing suite for HTTP-level shortcuts, search and classify — including **indirect wrappers and their callers**; grepping literal `fetch(` is insufficient:

- Playwright `page.request`, the `request` fixture, `APIRequestContext`, and any newly created request contexts
- Node/global `fetch`, axios and other HTTP clients, and helper functions that wrap any of them (trace each wrapper's definition to every caller)
- `page.evaluate(() => fetch(...))` or equivalent in-page request construction
- Manual security/browser headers — `Sec-Fetch-*`, `Origin`, CSRF tokens, cookies — used to impersonate a browser
- CLI/subprocess helpers that initiate HTTP, and tests that consume the fixture state they created
- Browser-owned traffic — navigation, `EventSource`, WebSocket, ordinary frontend requests — distinguishing **observation** (legitimate) from **initiation** (the finding)

Also review test names, comments, CI workflow step labels and grep tags, and canonical status/docs for **evidence overclaims** — prose that promises browser proof a direct call delivered.

Record every finding as a ledger row:

| # | Field |
|---|---|
| 1 | File and test/callers |
| 2 | Endpoint/action |
| 3 | Real initiator in production |
| 4 | Layers bypassed by the direct call (UI handler, cookie policy, CSRF/Fetch Metadata, redirects, loading/error state, rendering) |
| 5 | Exact claim the test currently makes (name + prose) |
| 6 | Disposition: **replace** (drive through UI) · **retain with narrower scope** (rename, restate subject) · **remove** |
| 7 | Justification and residual coverage gap for anything retained/removed |

---

## Anti-Patterns: False Browser/Security Confidence

- `page.request`/`APIRequestContext` performing sign-in, create, join, edit, or any action the test describes as a browser/user journey.
- `page.evaluate(fetch)` to trigger frontend-owned work — an in-page transport is still not the frontend's code path.
- Manually forging `Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Origin`, CSRF tokens, cookies, or other browser-generated evidence so a browser-only endpoint accepts a non-browser client. If an endpoint intentionally accepts only a browser-generated security posture, a direct client cannot turn it into an API contract by copying browser headers — that is fabricating the very evidence the endpoint exists to demand. Use a real browser/frontend initiator, reuse state from a separately honest upstream proof, or withdraw/narrow the claim and document the gap. Do **not** respond by weakening the endpoint. (Legitimate API headers on a real, documented non-browser API contract are fine — that is a different subject.)
- Injecting authorization/session state and then claiming provider redirects, cookie issuance, same-site/host-only behavior, logout, or frontend coordination worked.
- `dispatchEvent` or DOM evaluation for ordinary user actions when a real accessible locator action exists.
- Weakening TLS, insecure protocol substitutions, or ignoring HTTPS errors as a convenience.
- Arbitrary sleeps (`waitForTimeout`), `waitForLoadState('networkidle')` (officially discouraged — "rely on web assertions to assess readiness instead"), or repeated polling that merely hides lifecycle races (see Lifecycle below).
- Blanket retries as a *fix*. Configured suite retries that mark retried passes `flaky` — ideally with `failOnFlakyTests` gating CI — are a visibility tool; the fix lives in the app or the test's evidence model, never in retrying until green.
- Retaining a test under a "journey"/"browser"/"E2E" name after narrowing it to API setup/readback.

---

## Fixtures, Readiness, Diagnostics, Deployment

- A **fixture** may stand in for a missing upstream subsystem (e.g. inject the proposal an AI would have produced), but label it as fixture injection and keep the tested downstream user action real. The test must not claim the real upstream producer was tested.
- A **process-readiness probe** (`/health` before launching the page) is an operator/harness action — never UI evidence.
- A **diagnostic API** can be asserted directly when the diagnostic contract is the subject; it must not be cited as proof that a panel loaded or rendered it.
- **Direct API setup** is acceptable for a test whose subject starts after pre-existing state — but the test must state where the browser claim begins.
- **Production-only tests** may be skipped locally when required deployment evidence is absent, but keep test discovery, workflow wiring, environment classification, cleanup ownership, and fail-closed parsing verifiable locally.
- **Never preserve a deployed/scale claim by fabricating the property being claimed.** Honest synthetic data through a legitimate fixture seam (DB seed, admin API) can support a claim explicitly framed as "given N seeded records, the UI ..." — that is ordinary setup. What synthetic setup cannot support is a claim that browsers/users produced the load, or any seeding that only works by forging browser metadata. If no legitimate initiator or fixture seam exists, withdraw the claim, retain the honest lower-layer coverage under an accurate name, and record the deployed gap.

---

## Authentication and Lifecycle Evidence

Protocol and security design live in their own skills — load `secure-oauth-oidc` for OAuth/OIDC flows and `bff-entry-points` for session cookies, CSRF/Origin, and Fetch Metadata policy. The *testing evidence contract* is:

- Provider sign-in is proved through the provider's UI, redirects, and callback — not a direct login endpoint.
- Application-session cookies are proved through the browser's own cookie transport plus a **fresh navigation/reload** — not by asserting a `Set-Cookie` header arrived.
- Logout must survive a fresh frontend initialization and show the unauthenticated UI.
- Observe auth requests without exposing authorization codes, tokens, cookies, or credentials in logs, traces, screenshots, URLs, storage, or history.
- Run every supported auth/storage profile through the full journey — a flow proved on one profile is unproved on the others.
- Cached auth state (`storageState`, canonically saved by a setup project and loaded via project dependencies) is a fixture seam: it legitimately skips *re-proving* sign-in in unrelated tests only when the sign-in journey itself is proved by its own honest test. The official docs offer API-based login setup as a speed optimization — take it knowingly: it yields **zero evidence the login UI works**, so keep at least one real UI sign-in test whenever sign-in is a claimed behavior. Never commit saved auth state (it holds live cookies); use one account per parallel worker when tests mutate shared server state.
- For lifecycle/race-sensitive flows, repeat the **full browser journey** when practical rather than adding retries or sleeps. For time-dependent behavior, prefer the clock API (`page.clock.install()`, `fastForward`) over real waiting.
- Bound real cold-start readiness with evidence-based timeouts and deterministic failure diagnostics (trace viewer with `trace: 'on-first-retry'`, or `'retain-on-failure'` when runner retries are disabled; `--repeat-each` for reproduction) — and keep the journey itself free of manual/in-test retry loops (configured runner retries remain the visibility tool described above).

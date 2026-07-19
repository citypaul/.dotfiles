# Browser Session Coordination

One authentication coordinator sits between the UI and every protected fetch, EventSource, and WebSocket. Scattered per-component 401 handling produces duplicate sign-out storms, redirect loops, and product errors misread as session loss.

## The Coordinator

A single module owns authentication state and is the only code that interprets authentication-related responses:

```typescript
type AuthState =
  | { readonly kind: 'unknown' }                          // before first probe
  | { readonly kind: 'signed-in'; readonly user: CurrentUser }
  | { readonly kind: 'signed-out'; readonly returnPath?: SafeReturnPath };
```

- All protected fetches go through the coordinator (a wrapper or interceptor). Realtime connections register a teardown handle with it — `coordinator.track({ close })` returning an untrack function — so authentication loss can reach them. Transport concerns stay with the transport: the SSE/WebSocket wrapper owns its own retry/backoff (`EventSource` retries natively; a WebSocket wrapper implements backoff); the coordinator owns only the authentication interpretation of failures.
- The coordinator also holds the CSRF token (delivered in the login and `current-user` response bodies — see `references/endpoint-protection.md`) and attaches it as a request header on every mutation. Token rotation arrives with those same responses.
- The coordinator exposes state and transitions; components render from state. No component calls `window.location = '/login'` on its own.

## Behaviors

**Initial entry.** On load, probe the `current-user` endpoint once. A 401 is not an error: render the semantic **Sign in** state. An unauthenticated first visit is a normal state of the application, not an exception path.

**Later authentication loss.** A 401 from any protected fetch after sign-in means the session is gone (expired, revoked, logged out elsewhere). The coordinator tears down protected activity — closes EventSources and WebSockets, cancels in-flight protected requests, clears user-scoped caches — and transitions to Sign in. One 401 is authoritative; the server keeps 401 stable and non-oracular, so the client does not need to distinguish why.

**Return path.** Retain at most a validated same-origin relative path so login can restore the user's place:

```typescript
const toSafeReturnPath = (candidate: string): SafeReturnPath | undefined => {
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return undefined;   // rejects absolute, scheme-relative, and backslash-tricked targets
  }
  return brandSafeReturnPath(candidate);
};
```

Never store an absolute URL, a scheme-relative `//host` target, or anything read from an untrusted query parameter without this validation — open-redirect targets enter exactly here. Successful login returns to the safe path or falls back to the home route.

A full-page login redirect destroys in-memory state, so the coordinator's copy does not survive the OAuth round-trip. Persist the *validated* relative path server-side in the login transaction, bound to the OAuth `state` value the BFF already tracks — the browser carries nothing, and the callback handler re-validates the path before issuing the final redirect. That keeps the requirement intact: no return target, safe or otherwise, needs browser storage.

**Product refusals are not session loss.** A 403 (disclosed refusal) and a no-oracle 404 render product-level outcomes — "you can't do that", "not found" — in place. Routing them into the sign-out path both lies to the user and turns every authorization refusal into a logout. Only 401 means authentication.

**Realtime failures are ambiguous — probe, don't guess.** `EventSource` reports any failure as a generic `error` event; the WebSocket API collapses every handshake failure to close code 1006 (both by spec, to prevent network probing). A realtime failure therefore triggers **one deduplicated `current-user` probe**:

```typescript
let probe: Promise<AuthProbeResult> | undefined;
const probeSession = () => (probe ??= fetchCurrentUser().finally(() => { probe = undefined; }));
```

- Probe confirms 401 → normal authentication-loss teardown.
- Probe succeeds → the session is fine; leave the failure to the transport's retry/error handling (SSE auto-reconnect, WebSocket backoff). Do not sign the user out because a proxy hiccuped.
- Dedupe across sources: five components observing one dropped socket must produce one probe, not five.
- Cap frequency across time as well: a persistently failing transport retries on its backoff schedule, but probes get a cooldown (probe at most once per backoff cycle). A confirmed-valid session plus a still-failing stream is a transport problem — stop probing and surface the degraded state.
- A server-sent application close code (e.g. `4001` — see `references/realtime-entry-points.md`) is a strong hint that bypasses the backoff wait and triggers the probe *immediately* — but the signed-out transition still requires the probe's confirmed 401. Close codes are application data, not authenticated proof of session state; probe-then-act keeps one rule for every realtime failure.
- `EventSource` reconnects on its own only after transport interruptions; a non-200 status, wrong content type, or 204 puts it in a terminal `CLOSED` state (WHATWG). When the probe confirms the session is valid but the source is terminally closed, the transport wrapper recreates the `EventSource` on its backoff schedule — nothing recreates it otherwise.

**Nothing provider-shaped in the browser.** Provider tokens, authorization codes, callback parameters, and IdP state never enter browser state, `localStorage`, or `sessionStorage` — the BFF exists so the browser holds only the HttpOnly cookie it cannot read (OWASP Session Management Cheat Sheet names BFF as the alternative to browser token storage). The login callback URL is handled server-side; the browser lands on a clean application route. If a callback parameter appears in browser code, the boundary has already failed.

## Browser Test Coverage

Behavior-driven tests (see `front-end-testing`; mock the BFF at the network boundary):

- Initial signed-out entry renders Sign in — no error toast, no redirect loop.
- A mid-session protected-fetch 401 tears down realtime connections and returns to Sign in.
- A deep link retained through login restores only a same-origin relative path; hostile `returnTo` values (`https://evil.example`, `//evil.example`, `/\\evil.example`) fall back to home.
- A 403 and a 404 render product outcomes and do not change auth state.
- An SSE/WebSocket failure with a live session probes once and stays signed in; with a dead session, one probe confirms and signs out.
- Concurrent realtime failures produce exactly one probe.

## Sources

WHATWG HTML server-sent events and WebSocket specs (deliberate failure opacity); OWASP Session Management Cheat Sheet (no tokens in browser storage; BFF named); draft-ietf-oauth-browser-based-apps §5.1/§6.1 (token exfiltration rationale); OWASP Unvalidated Redirects and Forwards Cheat Sheet (return-path validation).

# Parity Surface Catalog

Use this catalog to build a parity map for one app. Select only surfaces that apply.

## Identity, Authn, And Authz

Inspect:

- OIDC/SAML provider config, callback URLs, logout URLs, issuer/audience, token lifetimes
- required IdP groups, roles, claims, scopes, tenant membership, admin flags
- middleware, route guards, API authorization policies, RBAC/ABAC rules
- session cookies, SameSite/Secure flags, CSRF, CORS, trusted origins
- local/CI auth bypasses, fake users, seeded users, test factories

Common drift:

- production requires a group or claim that local login bypasses
- preview apps use a different redirect URI or cookie domain
- local fixtures grant admin rights by default
- E2E tests authenticate by mutating session state and skip the real gate

Useful guards:

- contract test that asserts required claims/groups are enforced
- seeded IdP fixtures that mirror production roles
- config schema requiring the same auth mode unless an explicit test-only override is set
- E2E test that covers denied access for a user missing the production-required group

## Config, Secrets, And Feature Flags

Inspect:

- env schemas, `.env.example`, deployment env vars, secret names, config maps
- feature flag providers, defaults, bootstrap data, flag targeting rules
- production-only config branches and environment-name conditionals

Common drift:

- missing local env var falls back to permissive behavior
- production flag default differs from test default
- config branches key on `NODE_ENV` instead of capability/config values

Useful guards:

- startup validation that fails on missing required config
- generated config matrix comparing prod, CI, preview, and local keys
- tests for both enabled and disabled flag states when production can see both
- explicit list of allowed non-prod overrides

## Runtime, Build, And Dependency Shape

Inspect:

- runtime versions, package manager, lockfiles, base images, build commands
- native dependencies, browser versions, database image tags, extension versions
- production bundler/minifier/server mode versus local dev server

Common drift:

- local uses a dev server path that production never serves
- CI tests run one Node/Python/Ruby version while production image uses another
- local database image lacks extensions or collation settings used in production

Useful guards:

- pinned runtime/tool versions shared by local, CI, and production build
- CI job that builds and boots the production artifact
- migration or startup check for database extensions and settings

## Data, Database, And Tenancy

Inspect:

- schemas, migrations, seed scripts, fixtures, RLS policies, indexes, constraints
- tenant/account isolation, plan/entitlement data, lifecycle states
- backup/restore, anonymized prod snapshots, generated data realism

Common drift:

- local seed data omits restricted roles, empty states, quotas, or lifecycle edge cases
- tests use factories that bypass constraints or RLS
- migrations are tested against an empty database only

Useful guards:

- seeds for every production-critical role/state
- migration tests against realistic prior schema/data
- tests proving tenant boundaries and permission denial
- constraints and RLS exercised through public app behavior

## Backing Services And Async Work

Inspect:

- queues, workers, cron, schedulers, webhooks, cache, email, object storage
- retry/dead-letter policy, idempotency, rate limits, ordering guarantees
- local emulators and fake providers

Common drift:

- local executes jobs inline while production is eventually consistent
- fake provider always succeeds
- preview lacks webhook signature verification

Useful guards:

- contract tests for provider payloads and signatures
- worker integration tests with retry/dead-letter behavior
- local emulator configured with production-like policies where possible
- explicit divergence for intentionally synchronous local execution

## Network, Edge, And Security Policy

Inspect:

- ingress, CDN, WAF, Cloudflare/Vercel/Netlify/Fly/Render config, TLS
- CSP, HSTS, CORS, allowed origins, IP allowlists, service mesh, network policies
- cookies/domains, proxy headers, trusted hosts

Common drift:

- local permits all origins but production denies cross-origin requests
- preview lacks security headers or trusted proxy behavior
- tests call services directly and skip the edge path

Useful guards:

- smoke test through the same public route shape used by production
- header/CORS assertions in integration or E2E tests
- manifest checks for security policy deltas

## Observability And Operations

Inspect:

- health checks, readiness/liveness probes, logs, metrics, traces, alert names
- dashboards, runbooks, SLOs, error budgets, incident docs
- release, rollback, migration, and feature flag rollout procedures

Common drift:

- local success does not prove production readiness checks pass
- preview deploys without the background worker or health probe
- errors are swallowed locally but alerted in production

Useful guards:

- smoke test for readiness/health endpoints under production-equivalent config
- test or lint for required structured log fields and metrics
- runbook links in the app-specific skill for known parity failures

## Third-Party And Provider Contracts

Inspect:

- payment, email, analytics, CRM, identity, storage, search, AI, maps, and other API clients
- sandbox versus production provider settings
- webhook schemas, signature verification, idempotency keys, retry behavior

Common drift:

- provider sandbox has weaker validation than production
- mocked clients do not model provider errors, rate limits, or idempotency
- webhook tests omit signature verification or replay protection

Useful guards:

- provider contract tests or recorded fixtures
- negative-path tests for common production provider errors
- smoke tests against sandbox with production-equivalent config

## Explicit Divergence Register

Every intentional difference needs:

- surface
- production behavior
- non-production behavior
- reason
- risk
- compensating guard
- owner
- review trigger

If any field is missing, the divergence is not explicit enough.

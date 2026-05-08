# Question Patterns

Ask only after repository inspection. Each question should close a specific gap in the generated app-specific skill.

## Auth Restriction

Use when production requires a group, role, claim, scope, tenant membership, or IdP policy that non-production does not clearly mirror.

```markdown
I found production evidence for `[restriction]` in `[source]`, but `[local/CI/preview source]` does not show an equivalent.
How should non-production represent this rule?

1. Mirror production with seeded users/groups/claims. Recommended: catches auth drift in normal tests.
2. Use a lightweight emulator or fake provider that emits the same required claim. Good if the real IdP is too heavy locally.
3. Keep the local bypass, but add contract/E2E tests that prove the production restriction. Fastest local path, highest residual drift risk.
```

## Missing Production Truth

Use when code references production behavior but the source of truth is outside the repo.

```markdown
The repo references `[surface]`, but I cannot find the production source of truth for `[specific setting]`.
Where should the generated parity skill treat as authoritative?

1. `[candidate file/service/doc]`. Recommended if this is maintained with deploys.
2. A named external source such as `[dashboard/provider/admin console]`, with a manual verification step.
3. Treat it as unknown and add a blocking follow-up before the parity skill is considered complete.
```

## Intentional Divergence

Use when non-production clearly differs and may be deliberate.

```markdown
`[environment]` differs from production for `[surface]`: production `[behavior]`, non-production `[behavior]`.
Should this remain an intentional divergence?

1. No, close the drift by mirroring production. Recommended when the behavior affects auth, data safety, billing, or user-visible access.
2. Yes, keep it and add `[specific compensating guard]`.
3. Unsure, record it as a blocking parity risk with owner `[owner/team if known]`.
```

## Test Boundary

Use when there are multiple plausible places to enforce a parity guard.

```markdown
The highest-risk drift is `[risk]`. Which guard should the generated skill prefer?

1. Fast deterministic test at `[unit/integration/config]` boundary. Recommended if it can observe the production rule.
2. E2E or smoke test through `[real route/deployed preview]`. Better confidence, slower feedback.
3. Static manifest/config check. Good for infra settings, weaker for runtime behavior.
```

## Heavy Local Dependency

Use when mirroring production exactly would require expensive local infrastructure.

```markdown
Production uses `[service]`, but running it locally may be heavy.
What parity strategy should the generated skill encode?

1. Run the real service in local/CI with minimal seeded config. Highest parity, more setup cost.
2. Use an emulator/fake with contract tests against production-like fixtures. Balanced for most teams.
3. Mock it in tests, but require preview/staging smoke tests against the real integration. Fast local work, later feedback.
```

## Question Capture Format

After the user answers, capture:

- question asked
- chosen answer
- evidence that made the question necessary
- generated-skill section updated
- resulting guard or explicit divergence

If the answer is ambiguous, ask one follow-up that makes it testable.

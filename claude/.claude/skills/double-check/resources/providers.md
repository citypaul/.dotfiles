# Reviewer Capability Selection

Use this reference to choose and configure a reviewer without coupling the skill to a provider, executable, workstation, or authentication flow.

## Required Capabilities

A usable reviewer must provide:

1. A context separate from the authoring conversation.
2. Read access to the named artifact and relevant repository context.
3. Enforceable read-only behavior for files and external systems.
4. Enough reasoning capability for the risk of the work.
5. A way to return complete textual findings and the exact verdict.

Reject a candidate that cannot guarantee read-only operation. Do not solve missing isolation by granting broad permissions.

## Selection Order

1. Prefer a reviewer backed by a different model provider from the host.
2. Among independent choices, prefer stronger reasoning and safer isolation.
3. If no independent choice is usable, launch a fresh same-provider agent or process with zero inherited authoring context.
4. If neither mode is safe, report that the double-check could not run.

Discover capabilities from the host's available tools, installed integrations, and current documentation. Do not maintain a fixed vendor ranking: availability, model quality, and safety controls change.

## Invocation

Use the host or provider's current tool schema/help to determine invocation syntax. Configure:

- the strongest appropriate model or the user's configured default;
- the highest practical reasoning effort;
- read-only or plan-only access;
- a non-interactive input path when available;
- complete output capture.

Pass the brief through the host's safe artifact/input mechanism. A scratch file or structured tool argument is preferable to a long shell argument. Do not encode login instructions or attempt to alter authentication from this skill; an unusable integration is simply skipped or reported.

## Fresh Same-Provider Fallback

Round one must receive only the cold verifier brief and access to the named artifact. Do not fork the authoring conversation or reuse an existing session. Later rounds may receive the findings ledger and host responses because convergence requires dialogue.

Always report this mode as `same-provider fresh-context fallback`. Context isolation reduces anchoring but does not create model-provider independence.

## Continuity

Prefer safe session continuity after round one so the reviewer can explicitly accept or maintain each ledger item. When continuity is unavailable, include the complete prior ledger, host responses, updated scope, and validation evidence in a fresh round.

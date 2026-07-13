# OAuth/OIDC Standards Map

Use primary standards to decide what is required. Blog posts, vendor defaults, and framework examples may explain an implementation, but they do not override a protocol BCP or profile.

## Contents

- [Source precedence](#source-precedence)
- [Baseline standards](#baseline-standards)
- [Select extensions by problem](#select-extensions-by-problem)
- [OpenID Connect and high-assurance profiles](#openid-connect-and-high-assurance-profiles)
- [Active drafts and freshness](#active-drafts-and-freshness)
- [Claim discipline](#claim-discipline)

## Source precedence

Apply sources in this order:

1. **Deployment/ecosystem profile and regulation**, when explicitly applicable. Confirm the exact version and jurisdiction. A profile may strengthen or narrow choices; do not assume it may weaken an underlying mandatory behavior.
2. **Stable protocol specification and BCP**, including updates and errata.
3. **Platform BCP**, such as native-app guidance.
4. **Interoperability/conformance profile**, such as FAPI.
5. **Library documentation for the exact installed version.** This explains how to achieve a requirement, not whether the requirement exists.
6. **Secondary guidance** only for context or implementation examples.

When two sources appear to conflict, check publication status, `Updates` / `Obsoletes` relationships, applicability, and the profile's normative reference rules. Quote or link the decisive section rather than resolving it from memory.

## Baseline standards

| Source | Role in a review |
|---|---|
| [RFC 9700 / BCP 240](https://www.rfc-editor.org/info/rfc9700/) | Current OAuth 2.0 security baseline. Updates and extends RFCs 6749, 6750, and 6819; deprecates insecure modes; does not replace all their security advice. |
| [RFC 6749](https://www.rfc-editor.org/info/rfc6749/) | OAuth 2.0 framework: roles, grants, endpoints, redirect and token rules. Read through RFC 9700's updates. |
| [RFC 6750](https://www.rfc-editor.org/info/rfc6750/) | Bearer token transport and error semantics. RFC 9700 forbids the optional URI-query method for clients. |
| [RFC 6819](https://www.rfc-editor.org/info/rfc6819/) | Broader OAuth threat model and legacy controls not repeated by RFC 9700. |
| [BCP 195](https://www.rfc-editor.org/info/bcp195/) | TLS versions, algorithms, and deployment guidance referenced by RFC 9700. |

## Select extensions by problem

| Need | Stable source | Review focus |
|---|---|---|
| PKCE | [RFC 7636](https://www.rfc-editor.org/info/rfc7636/) plus RFC 9700 | Challenge/verifier generation, `S256`, code binding, verifier enforcement, downgrade rejection, metadata support. RFC 9700 expands PKCE beyond native/public clients. |
| Native apps | [RFC 8252 / BCP 212](https://www.rfc-editor.org/info/rfc8252/) | External user agent, claimed HTTPS/app links, private-use URI collision, loopback redirect and variable-port exception, PKCE. |
| Authorization-server metadata | [RFC 8414](https://www.rfc-editor.org/info/rfc8414/) | Exact issuer/metadata relationship, trusted retrieval, endpoint/key binding, advertised capabilities, cache/key rotation. |
| Protected-resource metadata | [RFC 9728](https://www.rfc-editor.org/info/rfc9728/) | Exact `resource` validation, authoritative well-known location, advertised authorization servers, SSRF/phishing boundaries, DPoP requirements. This RFC post-dates RFC 9700. |
| Dynamic client registration | [RFC 7591](https://www.rfc-editor.org/info/rfc7591/) | Registration endpoint authorization, redirect and grant metadata, software statements, initial access tokens, client-secret handling, and malicious metadata/URI inputs. Apply issuer policy before registering with a discovered server. |
| Dynamic registration management | [RFC 7592](https://www.rfc-editor.org/info/rfc7592/) (Experimental) | Registration access-token protection, read/update/delete authorization, secret rotation, immutable identifiers, and concurrency/lifecycle behavior. State its Experimental status. |
| JWT client authentication or authorization grants | [RFC 7521](https://www.rfc-editor.org/info/rfc7521/) and [RFC 7523](https://www.rfc-editor.org/info/rfc7523/) | Expected token endpoint audience, trusted issuer/subject/client binding, signature/algorithm, time and replay (`jti`) policy. Apply OIDC Core's `private_key_jwt` rules when that method is selected. |
| Sender-constrained tokens with certificates | [RFC 8705](https://www.rfc-editor.org/info/rfc8705/) | Client authentication versus certificate-bound token use, certificate/key binding, proxy handling, resource-server enforcement. |
| Sender-constrained tokens at application layer | [RFC 9449](https://www.rfc-editor.org/info/rfc9449/) | DPoP proof signature, `htu`, `htm`, `iat`, `jti`, nonce when used, access-token hash, key binding, proof replay, key compromise, resource-server enforcement. |
| Resource/audience selection | [RFC 8707](https://www.rfc-editor.org/info/rfc8707/) | Exact resource indicators, token audience, per-resource issuance, client-to-AS resource intent. |
| JWT access-token profile | [RFC 9068](https://www.rfc-editor.org/info/rfc9068/) | `typ`, issuer, audience, time, subject/client semantics, scope, signature/algorithm, resource-server validation. Do not assume every access token is a JWT. |
| JWT security | [RFC 8725 / BCP 225](https://www.rfc-editor.org/info/rfc8725/) | Algorithm verification, explicit typing, mutually exclusive validation rules, issuer/audience, key use, SSRF/injection-bearing JOSE headers. |
| Signed authorization request | [RFC 9101](https://www.rfc-editor.org/info/rfc9101/) | JAR request object signature/encryption, audience, replay/lifetime, duplicate parameter handling, client binding. |
| Pushed authorization request | [RFC 9126](https://www.rfc-editor.org/info/rfc9126/) | PAR endpoint client authentication, request URI binding/lifetime/single use, front-channel parameter restrictions. PAR is not automatically a complete request-integrity solution. |
| Issuer in authorization response | [RFC 9207](https://www.rfc-editor.org/info/rfc9207/) | `iss` value and exact comparison for mix-up defense. It identifies the issuer; it is not by itself a signed integrity guarantee. |
| Rich authorization | [RFC 9396](https://www.rfc-editor.org/info/rfc9396/) | `authorization_details` types, resource/action constraints, consent and token binding, privilege enforcement. |
| Token introspection | [RFC 7662](https://www.rfc-editor.org/info/rfc7662/) | Authenticated/authorized introspection, `active`, audience and cache semantics, data minimization. |
| Revocation | [RFC 7009](https://www.rfc-editor.org/info/rfc7009/) | Client authentication, token-type hint, cascade policy, CORS exposure, operational propagation. |
| Device authorization | [RFC 8628](https://www.rfc-editor.org/info/rfc8628/) | User-code phishing, polling interval, expiry, binding between user/device interactions, verification URI UX. RFC 9700 does not fully profile this grant. |
| Token exchange | [RFC 8693](https://www.rfc-editor.org/info/rfc8693/) | Subject/actor separation, audience/resource, delegation versus impersonation, token type, privilege attenuation. |

Do not add an extension merely because it sounds stronger. State the attacker and property it addresses, verify all parties implement it, and test the failure path. A half-enforced proof-of-possession profile can create false confidence.

## OpenID Connect and high-assurance profiles

| Source | When to apply |
|---|---|
| [OpenID Connect Core 1.0, Errata Set 2](https://openid.net/specs/openid-connect-core-1_0.html) | Every OIDC authentication flow: ID Token semantics/validation, nonce, UserInfo, authorization code/hybrid/implicit requirements, authentication context. |
| [OpenID Connect Discovery 1.0, Errata Set 2](https://openid.net/specs/openid-connect-discovery-1_0.html) | Dynamic OP discovery and metadata. Bind the discovered issuer, endpoints, and keys; apply SSRF/allowlist policy where user input influences discovery. |
| [OpenID Connect Dynamic Client Registration 1.0, Errata Set 2](https://openid.net/specs/openid-connect-registration-1_0.html) | OIDC-specific client metadata, redirect URI and response/grant registration, subject type, signed/encrypted ID Token and UserInfo algorithms, request objects, and sector identifier URI validation. Apply RFC 7591 security controls too. |
| [OIDC RP-Initiated](https://openid.net/specs/openid-connect-rpinitiated-1_0.html), [Front-Channel](https://openid.net/specs/openid-connect-frontchannel-1_0.html), [Back-Channel](https://openid.net/specs/openid-connect-backchannel-1_0.html), and [Session Management](https://openid.net/specs/openid-connect-session-1_0.html) | Apply only the logout/session specifications actually implemented. Validate issuer, audience, session/subject identifiers, token hints, registered post-logout URIs, browser framing/origin, and replay as that specification requires; distinguish local logout, OP session termination, and token revocation. |
| [JARM Final](https://openid.net/specs/oauth-v2-jarm-final.html) | Signed/encrypted authorization responses and profiles that require them. Validate the response JWT as its own token type, issuer, audience, time, and transaction. |
| [FAPI 2.0 Security Profile Final](https://openid.net/specs/fapi-security-profile-2_0-final.html) | High-value APIs requiring a formally analyzed, interoperable confidential-client profile. Apply its complete profile and attacker model; do not cherry-pick controls and claim FAPI compliance. |
| [FAPI 2.0 Attacker Model Final](https://openid.net/specs/fapi-attacker-model-2_0-final.html) | Threat-modeling a FAPI 2.0 deployment or adapting its stronger assumptions to e-health, government, finance, or similarly sensitive systems. |

OIDC Core is not an OAuth access-control profile. It establishes authentication assertions for a relying party. Resource servers must still validate access tokens and authorization independently.

## Active drafts and freshness

- [OAuth 2.1](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) remains an Internet-Draft unless the Datatracker shows a published RFC at the time of use. Do not call a draft a standard, freeze behavior to an old draft number, or use it to weaken RFC 9700. Use RFC 9700 as the stable BCP baseline.
- Browser-based-app guidance and other OAuth working-group drafts evolve. Before giving current architectural advice or exact requirements, check the IETF Datatracker and official working-group documents.
- Always open the RFC Editor **info** page for status, updates/obsoletes, and errata. For OpenID specifications, use the official final/errata document and confirm whether a newer Final specification exists.
- Record the source URL, status, and access date in high-stakes review output. Keep volatile version facts out of long-lived code comments when a stable requirement can be cited instead.

## Claim discipline

Use one of these forms:

- **“RFC 9700 §2.1.1 requires public clients to use PKCE.”** Exact normative claim.
- **“We recommend PKCE for every code client; RFC 9700 requires it for public clients and recommends it for confidential clients.”** Strong local default without misattribution.
- **“FAPI 2.0 requires this for deployments claiming that profile.”** Conditional profile claim.
- **“The installed library appears to enforce this by default; verify with version-specific documentation and a negative test.”** Implementation hypothesis, not protocol proof.

Avoid:

- calling OAuth an authentication protocol without OIDC or another explicit identity profile;
- treating OAuth 2.1 draft text as a published requirement;
- saying “JWT validation” when only signature verification was checked;
- saying “PKCE enabled” when only metadata support or client-side challenge generation was observed;
- saying “DPoP protected” when the resource server did not validate the proof and token binding;
- claiming standards compliance from selected controls instead of the complete applicable conformance profile.

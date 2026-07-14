# Evidence and Currentness

Technology selection is time-sensitive. Versions, maintainership, vulnerabilities, support windows, pricing, licenses, service terms, and ecosystem compatibility change. Research live candidates from current primary sources and date every observation.

## Evidence hierarchy

Prefer evidence closest to the fact being claimed:

| Claim | Strong primary evidence |
|---|---|
| Capability and supported usage | Official documentation, standards text, source, conformance suite |
| Current version and compatibility | Canonical registry, official releases/changelog, support matrix, EOL page |
| Maintenance and governance | Repository activity in context, governance/owners, roadmap, release history, support policy |
| Security | Project `SECURITY` policy, vendor advisories, OSV/GHSA, NVD where relevant, provenance/signing/SBOM evidence, focused source review |
| License | Exact repository/package license text, SPDX identifier, OSI text, counsel or procurement decision when required |
| Reliability and operations | SLA/SLO, status and incident history, backup/restore and recovery docs, operational exercise |
| Pricing and data handling | Exact tier/pricing page, contract, DPA, subprocessors, data-residency/export/deletion documentation |
| Performance | Representative reproducible benchmark on the intended version and workload |

Use secondary articles, community reports, stars, downloads, and search rankings to discover candidates or counterevidence. Do not promote them into decisive facts without checking the underlying primary source.

An OpenSSF Scorecard result is one machine-generated security-health signal. Inspect the checks and project context; it is not a trust verdict. A clean advisory search is also not proof that a dependency is safe.

## Minimum evidence record

For each finalist record:

- exact candidate and observed version, release, commit, or service tier;
- observation date;
- source URL and source type;
- the specific finding, not only a link;
- relevance to a requirement or risk;
- uncertainty, staleness, or conflicting evidence.

For offline research, identify the newest local artifact inspected and mark all live status claims unverified. Recheck before implementation.

## Supply-chain and execution safety

Research does not authorize execution.

- Inspect package metadata, exact sources, transitive dependencies, install scripts, binary provenance, and requested permissions before installation.
- Prefer canonical registries and signed/verifiable artifacts where the ecosystem supports them.
- Avoid piping remote scripts into a shell.
- Use a disposable least-privilege sandbox for an authorized proof-of-fit. A temporary directory alone does not isolate home files, repositories, credentials, host services, or the network.
- Deny home/repository mounts, network, credentials, and host services by default; mount disposable inputs only and document each authorized exception.
- Disable lifecycle/install scripts where supported and verify exact artifact integrity, checksums, signatures, or provenance before execution when the ecosystem provides them.
- Do not expose credentials, proprietary code, personal data, or production payloads.
- Record the precise version tested; “latest” is not reproducible evidence.

## Methodology sources

### Titus Winters, Tom Manshreck, and Hyrum Wright — *Software Engineering at Google*

- [Chapter 21: Dependency Management](https://abseil.io/resources/swe-book/html/ch21.html)
- Reuse avoids redevelopment when a dependency genuinely satisfies the task, but importing it creates an ongoing compatibility, maintenance, security, and support relationship.
- A dependency is a contract; testing and CI provide stronger compatibility evidence than version-number assumptions alone.

### UK Government Digital Service

- [Managing software dependencies](https://www.gov.uk/service-manual/technology/managing-software-dependencies)
- [Technology Code of Practice](https://www.gov.uk/data-ethics-guidance/the-technology-code-of-practice)
- Reuse can save development time across open-source, commercial, and internally shared software, while every dependency must be kept current, secured, tested, and actively managed.
- Technology decisions span design, build, buy, migration, and the full lifecycle rather than initial delivery alone.

### NIST

- [Secure Software Development Framework, SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
- The SSDF supplies security practices and a shared vocabulary for producers, purchasers, consumers, and software-acquisition discussions. It informs the third-party and supplier security gates; it is not a product-ranking system.

### Open Source Security Foundation

- [OpenSSF Scorecard](https://openssf.org/scorecard/)
- Scorecard can help assess an open-source project's security posture for a particular use case. The local workflow deliberately treats it as one input rather than a universal numeric verdict.

These sources inform the method. Every real decision still requires candidate-specific, current evidence.

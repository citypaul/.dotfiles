# Documentation for AI Agents: What's Real (2026)

The durable finding: good agent docs and good human docs CONVERGE.
Structure, self-containment, text-over-pixels, and machine-readable
specs — all pre-AI best practice — are what agents need. Advice that
departs from plain good writing (keyword-stuffing for embeddings,
agent-only content) has no evidence behind it.

## llms.txt — the honest verdict

The spec (Jeremy Howard, llmstxt.org): root-level markdown — H1 name,
blockquote summary, H2 sections of [name](url) links, an "Optional"
section skippable under context pressure. Measured adoption (Burridge
crawl; OtterlyAI monitoring): ~5-10% of sites publish one; ~0.1% of
AI-crawler requests fetch it; Google confirmed it won't support it
(Illyes, 2025). BUT IDE agents, MCP servers, and in-product
assistants DO fetch it. Ship it for developer-tool docs — cheap, real
consumers; skip it as an SEO/GEO tactic (the hype the data refutes).

## Serve clean markdown to agents

Mintlify's traffic data: approaching half of docs traffic is agents;
they arrive with a task, and their failures are invisible — no bug
report, no bounce signal. Prescription: one knowledge source, two
renderings — rich HTML for humans, clean markdown endpoints for
agents; add agent-traffic analytics so the invisible failures show.

## RAG-chunkable pages (Kapa.ai practice)

Strict heading hierarchy; self-contained sections; code examples with
imports included and one sentence of context above each;
troubleshooting as literal Q&A pairs; every screenshot's information
also stated in text; no load-bearing PDFs; acronyms defined in-page.
(Every-Page-is-Page-One and accessibility rules, restated.)

## Agent Experience (Netlify's AX framing)

Agents are users who must discover what your service does, call it
reliably, and recover when something goes wrong. Context files
(agents.md-style) carry architecture, standards, and integration
facts — never secrets. Error messages with identifiers and
remediation serve the recovery leg (see docs-quality).

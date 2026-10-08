---
name: explain-clearly
description: "Use before writing, rewriting, or reviewing explanations or other human-facing prose, including routine README edits, documentation, guides, reports, proposals, PR descriptions, release notes, articles, messages, and UI copy. Also use for requests to explain a concept here in chat or create a beautiful HTML/interactive explainer. Load it even when the request sounds simple or names no skill. It supplies plain English, meaning preservation, teaching structure, typography, and accessible layout together. Agent-facing instructions such as SKILL.md or AGENTS.md belong to writing-for-agents."
license: MIT
---

# Explain clearly

Help the intended reader understand, remember, decide, or act. Own the whole
communication: its meaning, explanation, wording, and presentation. This is the
single entry point for human-facing writing; it needs no separate prose or
design skill to produce a document or explainer.

**For a rewrite from supplied facts, preserve meaning before improving tone.**
First make a compact private inventory of claims and their qualifications.
Carry possibility words such as “may” into the sentence describing the action;
keep “should” advisory and “must” mandatory. Treat a defined status as its stated
definition: labels such as “fresh”, “valid”, or “ready” do not by themselves
guarantee accuracy, safety, or success. After drafting, compare each claim with
that inventory, including table cells, captions, and sentences added to reassure.
Repair stronger claims before delivering. Keep this working inventory private.
Requests for reassuring, positive, or confident wording change tone; they supply
no evidence about severity, urgency, safety, or likelihood. Convey calm through
known mechanisms and useful next steps. “Nothing to worry about”, “usually fixes
itself”, and “no need to act urgently” need support in the source.

Use the core below for every task. Load additional guidance only for the output
being made:

| Task | Read |
| --- | --- |
| Documentation, procedures, READMEs, reference, or maintained knowledge | [Documentation](resources/documentation.md) |
| Articles, messages, UI copy, voice matching, or substantial prose editing | [Prose and editing](resources/prose.md) |
| HTML, interactive explainers, or a designed reading surface | [HTML explainers](resources/html-explainers.md) |
| Checking a source, standard, attribution, or rationale | [Sources](resources/sources.md) and [source notes](resources/source-notes.md) |

A task can need more than one reference, such as an HTML operations guide.
Match the effort to the request: a brief answer needs the core, not a planning
ceremony, file, design system, or browser session. Keep the requested medium.
Reviews produce findings; edits change the authorised target. Drafting a
message does not authorise sending it.

## 1. Find the reader's job

Infer the reader, their prior knowledge, the question they bring, and the
intended outcome from the request and available material. Ask only when a
missing answer would materially change the work. For substantial pieces,
settle on one sentence describing what the reader will understand or do.

Select the material and order that serve that outcome. A reader looking up a
flag needs a predictable reference entry; someone learning a mechanism needs
an explanation; a decision-maker needs options, evidence, and trade-offs.
Fit structure to that job. Reuse the user's terminology and house style.

## 2. Build understanding

Lead with the answer, purpose, or useful orientation. Introduce prerequisites
before relying on them. Develop one coherent line of thought: connect claims
through cause, sequence, comparison, condition, or consequence.

- Explain necessary terms at first use, at the reader's level. Keep precise
  domain terms when substituting an everyday word would change the meaning.
- Use a concrete worked example when abstraction is the obstacle. Carry the
  same example through the mechanism, then show a useful variation or limit.
  Label invented examples and illustrative numbers.
- Choose representations by the question: prose for reasoning, a table for
  comparison or lookup, a diagram for relationships or sequence, a plot for
  quantitative change, interaction for exploring a meaningful variable.
- Keep labels and explanations beside the thing they describe. Use consistent
  names, colours, and symbols across prose, diagrams, and controls.
- Break complex material into reader-paced steps. Keep the essential account
  visible and put optional depth where readers can choose it.
- State the limit of an analogy where it could create a false prediction.
  Show the mechanism itself when an analogy would require more explanation.

For an explanation, check whether the reader could use the account to explain
an unfamiliar example or predict an outcome. For instructions, check whether
the reader can recognise successful completion and recover from likely errors.

## 3. Write plain, precise English

Use familiar words, concrete subjects, and direct verbs. Prefer active voice
when the actor matters. Put a condition before the instruction it controls.
Keep terminology consistent, sentences complete, and paragraphs connected.
Use sentence length and rhythm to make the thought easy to follow; retain the
detail needed to understand it.

Preserve facts, attribution, scope, uncertainty, obligations, and exceptions.
Words such as “may”, “should”, and “must” carry different meanings. Preserve
exact identifiers, commands, quotations, links, numbers, and required notices.
Make meaning simpler to grasp without making the claim stronger.

Keep thresholds inclusive or exclusive as stated, and keep an example value
distinct from a default.
Reassure through clear consequences and useful next steps; claims that something
is immediate, accurate, harmless, normal, or likely to fix itself need evidence.

Remove filler, unsupported praise, repeated conclusions, and generic prose
that could describe anything. Replace vague claims with supported mechanisms
or examples. If evidence is missing, qualify the claim, mark the gap, or ask;
invented detail cannot repair it. Preserve the author's voice and genuine
experience. Use ordinary punctuation, contractions, and emphasis when they
help the medium; no mechanical word-count or vocabulary compliance target.

## 4. Shape the reading experience

Make hierarchy visible through informative headings, typography, proximity,
and spacing. Use lists for parallel items or sequences, and tables for facts
readers need to compare. Let paragraphs carry reasoning. Give each section
the space its importance deserves.

For designed documents, make deliberate choices about type, composition,
colour, and illustration. Beauty comes from a coherent visual idea and
careful execution. Respect an existing visual identity. Let the subject and
reader guide the design, and use the HTML reference for concrete implementation
and accessibility checks.

## 5. Verify meaning and use

Read the result as the intended reader. Correct the most consequential
problems in meaning, missing reasoning, navigation, and presentation. Compare
rewrites against the original for lost conditions or changed certainty.
Check added sentences as carefully as retained ones. A qualifier elsewhere
cannot repair a sentence that turns a possibility into a promise.
For a rewrite saved to a file, reopen the source and final artifact for this
comparison. Trace each added factual claim to its evidence; remove unsupported
reassurance and invented product behaviour before handing it back.

### Material Claims Need Receipts

Check material capability, current-state, compatibility, and quantitative
claims against authoritative evidence. Verify commands, examples, and links
proportionately; execute examples only when safe and authorised. Label a
fragment as a fragment. Keep sources near the claims they support. An
explanation or clearly stated design judgment does not need a fabricated
measurement. State any remaining evidence gap honestly.

For HTML, inspect the rendered result and exercise its meaningful controls as
described in the reference. Passing automated checks does not establish human
comprehension or complete accessibility. With reader feedback available, use
their ability to find, explain, or apply the information as the strongest test.

Deliver the requested answer or artifact and report material limitations.
Keep the internal checklist out of the document unless the user asks for it.

## Scope and foundations

This skill applies ISO 24495-1's reader outcomes, Diátaxis document purposes,
Mayer's learning principles, typography guidance, and WCAG/COGA accessibility
guidance. The sources distinguish standards, research, and house preferences.
Following this skill is not a claim of ISO, ASD-STE100, or WCAG conformance.

Domain-specific work can still need its own authority: API contracts, diagrams
with specialised syntax, document file formats, or application behaviour.
This skill owns their human-facing explanation; it does not replace those
contracts or require loading other writing skills. Agent-facing instructions
belong to `writing-for-agents` when available. Product interface implementation
can use the project's design workflow; an ordinary explainer needs no product
discovery interview.

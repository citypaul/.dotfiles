---
name: wtf
description: Re-explain the immediately previous LLM response when it did not land, using plain, precise UK English.
disable-model-invocation: true
---

# WTF

Use this skill when the immediately previous response from an LLM was unclear, too dense, or difficult to follow.

## Procedure

1. Read the immediately previous LLM response.
2. If the response uses domain terms, first inspect repository guidance for its declared glossary authority and bounded-context scope. If none is declared, check common locations such as `CONTEXT.md`, `GLOSSARY.md`, `UBIQUITOUS_LANGUAGE.md`, and `*.glossary.yml` without creating a new convention.
3. Use only the glossary that owns the relevant context to select canonical terms and meanings.
4. Re-explain the previous response with a clearer structure and simpler wording.
5. Preserve its meaning and all relevant technical details.
6. Keep the explanation about the previous response.
7. Do not perform a new task.
8. Do not introduce information from the terminology files that the previous response did not contain.

## Writing Rules

Write in a style inspired by ASD-STE100 Simplified Technical English.

- Use active voice.
- Use plain UK English.
- Write for a reading level between Key Stage 4 and Further Education.
- Use the same term for the same concept throughout the explanation.
- Use precise and technically accurate wording.
- Use short sentences where possible.
- Use the imperative form for direct instructions.
- Put one main action in each sentence.
- Define an uncommon abbreviation or specialist term when it first appears.
- Preserve technical details, including constraints, exceptions, conditions, dependencies, examples, values, units, and warnings.
- Prioritise technical accuracy and unambiguous meaning when clarity and brevity conflict.

## Clarity Controls

- Put each prerequisite, condition, warning, or limitation before the action to which it applies.
- Use the exact nouns from the previous response for files, commands, components, and values.
- Replace vague pronouns with the specific subject.
- Remove idioms, unnecessary synonyms, ambiguous references, and complex noun clusters.
- Do not add information that is not present in the previous response.
- State uncertainty when the previous response was uncertain.

## Completion Criterion

The new explanation is complete when it re-explains the immediately previous LLM response, preserves its meaning and relevant technical details, and uses clearer plain language without starting new work.

## Attribution

Adapted from Adam Bulmer's MIT-licensed Mintuz `wtf` skill at pinned revision
`e436942ef328e692567300dba51424c68850ab12`. See
`references/source-notes.md` and `LICENSE`.

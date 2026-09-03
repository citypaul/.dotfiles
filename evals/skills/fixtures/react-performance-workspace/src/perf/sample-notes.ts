// Sample data for the benchmarks, and only for the benchmarks: a deterministic
// pseudo-random team's worth of notes, so every run scores exactly the same
// text. It lives in the harness rather than beside the app because the size
// and shape of the sample is part of the measurement, not part of the product.
import type { Note } from "../notes";

const TITLE_WORDS = [
  "revenue",
  "hiring",
  "roadmap",
  "incident",
  "onboarding",
  "pricing",
  "retro",
  "migration",
  "budget",
  "support",
];
const BODY_WORDS = [
  "the",
  "team",
  "agreed",
  "that",
  "we",
  "should",
  "revisit",
  "this",
  "before",
  "the",
  "next",
  "review",
  "because",
  "numbers",
  "moved",
];
const TAG_POOL = [
  "design",
  "growth",
  "platform",
  "support",
  "finance",
  "people",
];

// Long enough that scanning a note costs something, short enough that the
// sample as a whole stays small: the benchmark measures work, not the garbage
// collector.
const WORDS_PER_BODY = 40;

export const makeNotes = (count: number): readonly Note[] => {
  let seed = 1337;
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_ignored, index) => {
    const title = Array.from(
      { length: 3 },
      () => TITLE_WORDS[Math.floor(next() * TITLE_WORDS.length)] ?? "note",
    ).join(" ");
    const body = Array.from(
      { length: WORDS_PER_BODY },
      () => BODY_WORDS[Math.floor(next() * BODY_WORDS.length)] ?? "word",
    ).join(" ");
    const tags = [TAG_POOL[Math.floor(next() * TAG_POOL.length)] ?? "design"];
    return {
      id: `note-${index}`,
      title: `${title} ${index}`,
      body,
      tags,
      updatedAt: 1_700_000_000_000 + index * 60_000,
    };
  });
};

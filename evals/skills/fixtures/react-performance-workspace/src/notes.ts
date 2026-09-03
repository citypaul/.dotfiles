export type Note = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly updatedAt: number;
};

const CHAR_WEIGHTS = [3, 5, 7, 11, 13];
const SCORE_PASSES = 24;
const WORD_PASSES = 24;

const haystackOf = (note: Note): string =>
  `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase();

export const normaliseQuery = (query: string): string =>
  query.trim().toLowerCase();

export const matchesQuery = (note: Note, query: string): boolean => {
  const needle = normaliseQuery(query);
  return needle === "" || haystackOf(note).includes(needle);
};

// How well a note answers a query. Scans the note once per pass so a longer
// note costs more than a short one.
export const relevanceScore = (note: Note, query: string): number => {
  const needle = normaliseQuery(query);
  if (needle === "") return 0;
  const haystack = haystackOf(note);
  let score = 0;
  for (let pass = 0; pass < SCORE_PASSES; pass += 1) {
    for (let at = 0; at < haystack.length; at += 1) {
      for (let offset = 0; offset < needle.length; offset += 1) {
        if (haystack.charCodeAt(at + offset) !== needle.charCodeAt(offset))
          break;
        score += CHAR_WEIGHTS[offset % CHAR_WEIGHTS.length] ?? 1;
      }
    }
  }
  return score;
};

// Words in a note's body, counted by walking the characters.
export const wordCount = (note: Note): number => {
  const body = note.body;
  let words = 0;
  for (let pass = 0; pass < WORD_PASSES; pass += 1) {
    words = 0;
    let inWord = false;
    for (let at = 0; at < body.length; at += 1) {
      const isSpace = body.charCodeAt(at) === 32;
      if (!isSpace && !inWord) words += 1;
      inWord = !isSpace;
    }
  }
  return words;
};

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

// Deterministic sample data for the benchmarks: same notes on every run.
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
      { length: 40 },
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

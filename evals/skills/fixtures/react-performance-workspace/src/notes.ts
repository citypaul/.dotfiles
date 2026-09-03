export type Note = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly updatedAt: number;
};

// Longer runs of the query are worth more than short ones, so a note that
// contains the whole word beats one that merely starts the same way.
const CHAR_WEIGHTS = [3, 5, 7, 11, 13];

const haystackOf = (note: Note): string =>
  `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase();

export const normaliseQuery = (query: string): string =>
  query.trim().toLowerCase();

export const matchesQuery = (note: Note, query: string): boolean => {
  const needle = normaliseQuery(query);
  return needle === "" || haystackOf(note).includes(needle);
};

// How well a note answers a query: every position in the note that begins a
// run of the query's characters adds weight, so a note that repeats the query
// scores above one that mentions it once, and a longer note costs more to
// score than a short one.
export const relevanceScore = (note: Note, query: string): number => {
  const needle = normaliseQuery(query);
  if (needle === "") return 0;
  const haystack = haystackOf(note);
  let score = 0;
  for (let at = 0; at < haystack.length; at += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack.charCodeAt(at + offset) !== needle.charCodeAt(offset)) break;
      score += CHAR_WEIGHTS[offset % CHAR_WEIGHTS.length] ?? 1;
    }
  }
  return score;
};

// Words in a note's body, counted by walking its characters so that runs of
// spaces and trailing spaces do not count as words.
export const wordCount = (note: Note): number => {
  const body = note.body;
  let words = 0;
  let inWord = false;
  for (let at = 0; at < body.length; at += 1) {
    const isSpace = body.charCodeAt(at) === 32;
    if (!isSpace && !inWord) words += 1;
    inWord = !isSpace;
  }
  return words;
};

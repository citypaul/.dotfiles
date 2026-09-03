import { useState } from "react";
import { matchesQuery, relevanceScore, type Note } from "./notes";

export const RESULT_LIMIT = 20;

type NoteSearchProps = {
  readonly notes: readonly Note[];
};

type ScoredNote = {
  readonly note: Note;
  readonly score: number;
};

const byRelevance = (left: ScoredNote, right: ScoredNote): number =>
  right.score - left.score ||
  left.note.title.localeCompare(right.note.title) ||
  left.note.id.localeCompare(right.note.id);

export const NoteSearch = ({ notes }: NoteSearchProps) => {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const scored = notes.map((note) => ({
    note,
    score: relevanceScore(note, query),
  }));
  const results = [...scored]
    .sort(byRelevance)
    .filter((candidate) => matchesQuery(candidate.note, query))
    .slice(0, RESULT_LIMIT);

  return (
    <section>
      <label htmlFor="note-search">Search notes</label>
      <input
        id="note-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p>
        {results.length} of {notes.length} notes
      </p>
      <ul>
        {results.map((result) => (
          <li key={result.note.id}>
            <button type="button" onClick={() => setOpenId(result.note.id)}>
              {result.note.title}
            </button>
            {openId === result.note.id ? <p>{result.note.body}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

import { useState } from "react";
import { searchNotes, type Note, type NotesState } from "./notes";

type NotesListProps = {
  readonly state: NotesState;
  readonly onSelect: (id: string) => void;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

const NoteRow = ({
  note,
  onSelect,
}: {
  readonly note: Note;
  readonly onSelect: (id: string) => void;
}) => (
  <li>
    <button type="button" onClick={() => onSelect(note.id)}>
      <strong>{note.title}</strong>
      <span>{formatDate(note.updatedAt)}</span>
      <span>{note.tags.map((tag) => `#${tag}`).join(" ")}</span>
      <p>{note.body.slice(0, 120)}</p>
    </button>
  </li>
);

export const NotesList = ({ state, onSelect }: NotesListProps) => {
  const [query, setQuery] = useState("");
  const visible = searchNotes(state, query).map((note) => ({
    ...note,
    tags: [...note.tags].sort(),
  }));

  return (
    <section>
      <input
        type="search"
        placeholder="Search notes"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul>
        {visible.map((note) => (
          <NoteRow key={note.id} note={note} onSelect={(id) => onSelect(id)} />
        ))}
      </ul>
    </section>
  );
};

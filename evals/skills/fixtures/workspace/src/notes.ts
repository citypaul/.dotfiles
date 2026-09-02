import { z } from "zod";

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  body: z.string(),
  tags: z.array(z.string()),
  updatedAt: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;

export type NotesState = {
  readonly notes: ReadonlyArray<Note>;
  readonly selectedId: string | null;
};

export const createNote = (
  state: NotesState,
  input: { readonly title: string; readonly body: string },
): NotesState => ({
  ...state,
  notes: [
    ...state.notes,
    {
      id: crypto.randomUUID(),
      title: input.title,
      body: input.body,
      tags: [],
      updatedAt: new Date().toISOString(),
    },
  ],
});

export const addTag = (
  state: NotesState,
  id: string,
  tag: string,
): NotesState => {
  const note = state.notes.find((n) => n.id === id);
  if (!note) return state;
  note.tags.push(tag);
  return { ...state };
};

export const selectNote = (state: NotesState, id: string): NotesState => ({
  ...state,
  selectedId: state.notes.some((n) => n.id === id) ? id : null,
});

export const searchNotes = (
  state: NotesState,
  query: string,
): ReadonlyArray<Note> => {
  const q = query.trim().toLowerCase();
  if (q === "") return state.notes;
  return state.notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
  );
};

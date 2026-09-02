import { describe, expect, it } from "vitest";
import { archiveNote, createNote, initialState, searchNotes } from "./notes";

// Builds state only through the public API so any legitimate internal
// representation the agent chose still works.
const withNotes = (...titles: ReadonlyArray<string>) =>
  titles.reduce(
    (state, title) => createNote(state, { title, body: `${title} body` }),
    initialState,
  );

const idOf = (state: ReturnType<typeof withNotes>, title: string) => {
  const note = state.notes.find((n) => n.title === title);
  if (!note) throw new Error(`fixture: no note titled ${title}`);
  return note.id;
};

const titles = (notes: ReadonlyArray<{ readonly title: string }>) =>
  notes.map((n) => n.title);

describe("acceptance: archiving a note", () => {
  it("drops the archived note from an unfiltered search", () => {
    const state = withNotes("Groceries", "Work");
    const next = archiveNote(state, idOf(state, "Groceries"));
    expect(titles(searchNotes(next, ""))).toEqual(["Work"]);
  });

  it("drops the archived note from a matching query", () => {
    const state = withNotes("Groceries", "Work");
    const next = archiveNote(state, idOf(state, "Groceries"));
    expect(searchNotes(next, "groceries")).toEqual([]);
  });

  it("keeps the archived note in state", () => {
    const state = withNotes("Groceries", "Work");
    const next = archiveNote(state, idOf(state, "Groceries"));
    expect(titles(next.notes)).toEqual(["Groceries", "Work"]);
  });

  it("leaves state unchanged for an unknown id", () => {
    const state = withNotes("Groceries", "Work");
    expect(archiveNote(state, "missing")).toEqual(state);
  });

  it("does not mutate the original state", () => {
    const state = withNotes("Groceries", "Work");
    archiveNote(state, idOf(state, "Groceries"));
    expect(titles(searchNotes(state, ""))).toEqual(["Groceries", "Work"]);
  });
});

import { describe, expect, it } from "vitest";
import { createNote, initialState, pinNote, searchNotes } from "./notes";

// Builds state only through the public API so any legitimate internal
// representation the agent chose still works.
const withNotes = (...titles: ReadonlyArray<string>) =>
  titles.reduce(
    (state, title) => createNote(state, { title, body: "shared body" }),
    initialState,
  );

const idOf = (state: ReturnType<typeof withNotes>, title: string) => {
  const note = state.notes.find((n) => n.title === title);
  if (!note) throw new Error(`fixture: no note titled ${title}`);
  return note.id;
};

const titles = (notes: ReadonlyArray<{ readonly title: string }>) =>
  notes.map((n) => n.title);

describe("acceptance: pinning a note", () => {
  it("puts a pinned note first in search results", () => {
    const state = withNotes("One", "Two", "Three");
    const next = pinNote(state, idOf(state, "Three"));
    expect(titles(searchNotes(next, ""))).toEqual(["Three", "One", "Two"]);
  });

  it("keeps the existing order among pinned notes and among unpinned notes", () => {
    const state = withNotes("One", "Two", "Three");
    const next = pinNote(
      pinNote(state, idOf(state, "Two")),
      idOf(state, "Three"),
    );
    expect(titles(searchNotes(next, "shared"))).toEqual([
      "Two",
      "Three",
      "One",
    ]);
  });

  it("applies to filtered results too", () => {
    const state = withNotes("One", "Two", "Three");
    const next = pinNote(state, idOf(state, "Two"));
    expect(titles(searchNotes(next, "shared"))).toEqual([
      "Two",
      "One",
      "Three",
    ]);
  });

  it("leaves state unchanged for an unknown id", () => {
    const state = withNotes("One", "Two");
    expect(pinNote(state, "missing")).toEqual(state);
  });
});

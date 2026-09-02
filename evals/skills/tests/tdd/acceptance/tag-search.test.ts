import { describe, expect, it } from "vitest";
import { addTag, createNote, initialState, searchNotes } from "./notes";

// Builds state only through the public API so any legitimate internal
// representation the agent chose still works.
const withNotes = (
  ...notes: ReadonlyArray<{
    readonly title: string;
    readonly body: string;
    readonly tags: ReadonlyArray<string>;
  }>
) =>
  notes.reduce((state, note) => {
    const created = createNote(state, { title: note.title, body: note.body });
    const id = created.notes[created.notes.length - 1]?.id ?? "";
    return note.tags.reduce((s, tag) => addTag(s, id, tag), created);
  }, initialState);

const titles = (notes: ReadonlyArray<{ readonly title: string }>) =>
  notes.map((n) => n.title);

describe("acceptance: searching by tag", () => {
  const state = () =>
    withNotes(
      { title: "Call plumber", body: "kitchen tap", tags: ["urgent", "home"] },
      { title: "Read book", body: "chapter 3", tags: [] },
    );

  it("finds a note by an exact tag", () => {
    expect(titles(searchNotes(state(), "urgent"))).toEqual(["Call plumber"]);
  });

  it("matches tags case-insensitively", () => {
    expect(titles(searchNotes(state(), "URGENT"))).toEqual(["Call plumber"]);
  });

  it("still matches title and body", () => {
    expect(titles(searchNotes(state(), "chapter"))).toEqual(["Read book"]);
    expect(titles(searchNotes(state(), "plumber"))).toEqual(["Call plumber"]);
  });

  it("does not duplicate a note that matches on both title and tag", () => {
    const both = withNotes({
      title: "Urgent things",
      body: "",
      tags: ["urgent"],
    });
    expect(titles(searchNotes(both, "urgent"))).toEqual(["Urgent things"]);
  });
});

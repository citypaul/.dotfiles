import { describe, expect, it } from "vitest";
import { createNote, initialState, searchNotes, selectNote, type Note, type NotesState } from "./notes";

const aNote = (overrides: Partial<Note> = {}): Note => ({
  id: "note-1",
  title: "Groceries",
  body: "milk, eggs",
  tags: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const stateWith = (...notes: ReadonlyArray<Note>): NotesState => ({ ...initialState, notes });

describe("creating notes", () => {
  it("appends a note with the given title and body", () => {
    const next = createNote(stateWith(), { title: "Trip", body: "pack socks" });

    expect(next.notes.map((n) => n.title)).toEqual(["Trip"]);
    expect(next.notes[0]?.body).toBe("pack socks");
  });

  it("does not change the original state", () => {
    const original = stateWith();
    createNote(original, { title: "Trip", body: "" });

    expect(original.notes).toEqual([]);
  });
});

describe("searching notes", () => {
  const groceries = aNote({ id: "g", title: "Groceries", body: "milk, eggs" });
  const work = aNote({ id: "w", title: "Work", body: "deploy on Friday" });

  it("returns every note for an empty query", () => {
    expect(searchNotes(stateWith(groceries, work), "  ")).toEqual([groceries, work]);
  });

  it("matches the title case-insensitively", () => {
    expect(searchNotes(stateWith(groceries, work), "WORK")).toEqual([work]);
  });

  it("matches the body", () => {
    expect(searchNotes(stateWith(groceries, work), "eggs")).toEqual([groceries]);
  });
});

describe("selecting a note", () => {
  it("selects a note that exists", () => {
    expect(selectNote(stateWith(aNote({ id: "x" })), "x").selectedId).toBe("x");
  });

  it("clears the selection for an unknown id", () => {
    expect(selectNote(stateWith(aNote({ id: "x" })), "nope").selectedId).toBeNull();
  });
});

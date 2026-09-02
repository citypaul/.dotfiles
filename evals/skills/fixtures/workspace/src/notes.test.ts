import { describe, expect, it, vi } from "vitest";
import { createNote, searchNotes, selectNote, type NotesState } from "./notes";

const emptyState: NotesState = { notes: [], selectedId: null };

describe("notes", () => {
  it("createNote pushes a note", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("1-2-3-4-5");
    const next = createNote(emptyState, { title: "a", body: "b" });
    expect(next.notes.length).toBe(1);
    expect(next.notes[0].id).toBe("1-2-3-4-5");
  });

  it("searchNotes calls filter", () => {
    const state: NotesState = {
      notes: [
        { id: "1", title: "Groceries", body: "milk", tags: [], updatedAt: "" },
        { id: "2", title: "Work", body: "deploy", tags: [], updatedAt: "" },
      ],
      selectedId: null,
    };
    const spy = vi.spyOn(state.notes, "filter");
    searchNotes(state, "milk");
    expect(spy).toHaveBeenCalled();
  });

  it("selectNote", () => {
    expect(selectNote(emptyState, "nope").selectedId).toBeNull();
  });
});

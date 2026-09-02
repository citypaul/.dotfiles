import { describe, expect, it } from "vitest";
import { addTag, createNote, initialState, searchNotes } from "./notes";

const withOneNote = () => {
  const state = createNote(initialState, { title: "Groceries", body: "milk" });
  const id = state.notes[0]?.id ?? "";
  return { state, id };
};

describe("acceptance: addTag leaves earlier state untouched", () => {
  it("adds the tag to the new state", () => {
    const { state, id } = withOneNote();
    expect(addTag(state, id, "urgent").notes[0]?.tags).toEqual(["urgent"]);
  });

  it("does not change the state it was given", () => {
    const { state, id } = withOneNote();
    addTag(state, id, "urgent");
    expect(state.notes[0]?.tags).toEqual([]);
  });

  it("leaves state unchanged for an unknown id", () => {
    const { state } = withOneNote();
    expect(addTag(state, "missing", "urgent")).toEqual(state);
  });

  it("keeps searching working on the new state", () => {
    const { state, id } = withOneNote();
    expect(searchNotes(addTag(state, id, "urgent"), "").map((n) => n.title)).toEqual(["Groceries"]);
  });
});

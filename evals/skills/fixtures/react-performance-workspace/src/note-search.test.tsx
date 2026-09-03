import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoteSearch } from "./note-search";
import type { Note } from "./notes";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Alpha",
  body: "nothing much happened",
  tags: ["design"],
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

const type = (value: string): void => {
  fireEvent.change(screen.getByLabelText("Search notes"), {
    target: { value },
  });
};

const shown = (): readonly string[] =>
  screen.getAllByRole("listitem").map((item) => item.textContent ?? "");

describe("searching notes", () => {
  it("lists every note before anything is typed", () => {
    render(
      <NoteSearch
        notes={[
          note({ id: "a", title: "Alpha" }),
          note({ id: "b", title: "Beta" }),
        ]}
      />,
    );

    expect(shown()).toEqual(["Alpha", "Beta"]);
  });

  it("keeps only the notes that mention the query", () => {
    render(
      <NoteSearch
        notes={[
          note({ id: "a", title: "Alpha", body: "revenue is up" }),
          note({ id: "b", title: "Beta", body: "hiring is paused" }),
        ]}
      />,
    );

    type("revenue");

    expect(shown()).toEqual(["Alpha"]);
  });

  it("puts the note that mentions the query most often first", () => {
    render(
      <NoteSearch
        notes={[
          note({ id: "a", title: "Alpha", body: "revenue" }),
          note({ id: "b", title: "Beta", body: "revenue revenue revenue" }),
        ]}
      />,
    );

    type("revenue");

    expect(shown()).toEqual(["Beta", "Alpha"]);
  });

  it("reports how many of the notes are showing", () => {
    render(
      <NoteSearch
        notes={[
          note({ id: "a", title: "Alpha", body: "revenue is up" }),
          note({ id: "b", title: "Beta", body: "hiring is paused" }),
        ]}
      />,
    );

    type("revenue");

    expect(screen.getByText("1 of 2 notes")).toBeDefined();
  });

  it("shows a note's body once its title is clicked", () => {
    render(
      <NoteSearch
        notes={[note({ id: "a", title: "Alpha", body: "the full story" })]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    expect(screen.getByText("the full story")).toBeDefined();
  });
});

// Hidden acceptance test: what the notes search must still do, however it is
// made faster. Everything is driven through the rendered output, so a
// restructured component, a different hook, or a new module all pass as long
// as a person typing sees the same thing.
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { NoteSearch } from "./note-search";
import type { Note } from "./notes";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n",
  title: "Untitled",
  body: "no content",
  tags: ["design"],
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

const show = (notes: readonly Note[]): void => {
  render(createElement(NoteSearch, { notes }));
};

const type = (value: string): void => {
  const input = document.querySelector("input");
  if (input === null) throw new Error("the note search renders no input");
  fireEvent.change(input, { target: { value } });
};

const titles = (): readonly string[] =>
  screen.getAllByRole("listitem").map((item) => item.textContent?.trim() ?? "");

describe("acceptance: searching the notes", () => {
  // The notes arrive in the order they are expected back, so this says only
  // "every note is still listed" — it does not pin an ordering for the empty
  // query. Skipping the scoring pass entirely when nothing has been typed is
  // one of the fixes the skill prefers, and it leaves the notes in the order
  // they were given; scoring them all to zero and sorting by title is the
  // fixture's own behaviour. Both must pass here.
  it("shows every note until something is typed", () => {
    show([
      note({ id: "a", title: "Hiring plan" }),
      note({ id: "b", title: "Pricing review" }),
    ]);

    expect(titles()).toEqual(["Hiring plan", "Pricing review"]);
  });

  it("drops the notes that do not mention what was typed", () => {
    show([
      note({ id: "a", title: "Pricing review", body: "margin is thin" }),
      note({ id: "b", title: "Hiring plan", body: "two more engineers" }),
      note({ id: "c", title: "Retro", body: "hiring took too long" }),
    ]);

    type("hiring");

    expect(titles()).toEqual(["Hiring plan", "Retro"]);
  });

  it("ranks the note that mentions the query most often first", () => {
    show([
      note({ id: "a", title: "Alpha", body: "budget" }),
      note({ id: "b", title: "Beta", body: "budget budget budget budget" }),
      note({ id: "c", title: "Gamma", body: "budget budget" }),
    ]);

    type("budget");

    expect(titles()).toEqual(["Beta", "Gamma", "Alpha"]);
  });

  it("matches on the body and the tags, not only the title", () => {
    show([
      note({ id: "a", title: "Alpha", body: "nothing", tags: ["platform"] }),
      note({
        id: "b",
        title: "Beta",
        body: "the platform bill",
        tags: ["finance"],
      }),
      note({ id: "c", title: "Gamma", body: "nothing", tags: ["growth"] }),
    ]);

    type("platform");

    expect(titles().length).toBe(2);
    expect(titles().join(" ")).toContain("Alpha");
    expect(titles().join(" ")).toContain("Beta");
  });

  it("ignores case and surrounding spaces in the query", () => {
    show([
      note({ id: "a", title: "Pricing review" }),
      note({ id: "b", title: "Hiring plan" }),
    ]);

    type("  PRICING  ");

    expect(titles()).toEqual(["Pricing review"]);
  });

  it("says how many of the notes are showing", () => {
    show([
      note({ id: "a", title: "Pricing review" }),
      note({ id: "b", title: "Hiring plan" }),
      note({ id: "c", title: "Retro" }),
    ]);

    type("pricing");

    expect(screen.getByText("1 of 3 notes")).toBeDefined();
  });

  it("opens a note's body when its title is clicked", () => {
    show([
      note({ id: "a", title: "Pricing review", body: "we agreed to hold" }),
    ]);

    expect(screen.queryByText("we agreed to hold")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pricing review" }));

    expect(screen.getByText("we agreed to hold")).toBeDefined();
  });
});

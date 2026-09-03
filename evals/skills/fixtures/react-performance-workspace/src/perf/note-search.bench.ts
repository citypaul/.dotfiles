import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { bench } from "vitest";
import { NoteSearch } from "../note-search";
import { makeNotes } from "../notes";

const notes = makeNotes(2000);

const searchInput = (): HTMLElement => {
  const input = document.querySelector("input");
  if (input === null) throw new Error("the note search has no input");
  return input;
};

bench("note search: opening the page and typing one query", () => {
  render(createElement(NoteSearch, { notes }));
  fireEvent.change(searchInput(), { target: { value: "revenue" } });
  cleanup();
});

import { fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { bench } from "vitest";
import { NoteSearch } from "../note-search";
import { makeNotes } from "./sample-notes";

// The page is opened once, outside the measurement, because that is not what
// people complain about. What is measured is the thing they do complain
// about: one more character in the search box, with a big team's notes
// already on screen.
const notes = makeNotes(8000);
render(createElement(NoteSearch, { notes }));

const searchInput = (): HTMLElement => {
  const input = document.querySelector("input");
  if (input === null) throw new Error("the note search has no input");
  return input;
};

// Every iteration types a different query — each word of the vocabulary letter
// by letter, then pairs of words — so no two keystrokes in one run ask the
// same question and every one is a real change of the box's value.
const WORDS = ["revenue", "roadmap", "hiring", "incident", "onboarding", "pricing", "retro", "migration", "budget", "support"];
const PREFIXES = WORDS.flatMap((word) => Array.from({ length: word.length - 2 }, (_, i) => word.slice(0, i + 3)));
const PAIRS = WORDS.flatMap((a) => WORDS.filter((b) => b !== a).map((b) => `${a} ${b}`));
const QUERIES = [...PREFIXES, ...PAIRS];
let keystrokes = 0;

bench(
  "note search: one keystroke with the page open",
  () => {
    const query = QUERIES[keystrokes % QUERIES.length] ?? "revenue";
    keystrokes += 1;
    fireEvent.change(searchInput(), { target: { value: query } });
  },
  { time: 3000 },
);

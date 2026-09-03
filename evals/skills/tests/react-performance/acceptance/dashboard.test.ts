// Hidden acceptance test: what the dashboard must still show, however its
// re-rendering is fixed. It only reads the rendered output and lets the real
// interval fire, so splitting the context, moving the clock, or memoising a
// child all pass.
import { act, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
import type { Note } from "./notes";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n",
  title: "Untitled",
  body: "one two three",
  tags: ["design"],
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

const rows = (): readonly string[] =>
  screen.getAllByRole("listitem").map((item) => item.textContent?.trim() ?? "");

const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe("acceptance: the team dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T09:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("totals notes and words for every tag, in alphabetical order", () => {
    render(
      createElement(Dashboard, {
        notes: [
          note({ id: "a", tags: ["growth"], body: "one two" }),
          note({
            id: "b",
            tags: ["design", "growth"],
            body: "one two three four",
          }),
          note({ id: "c", tags: ["design"], body: "one" }),
        ],
      }),
    );

    expect(rows()).toEqual([
      "design — 2 notes, 5 words",
      "growth — 2 notes, 6 words",
    ]);
  });

  it("shows the current time and moves it on every second", () => {
    render(createElement(Dashboard, { notes: [note()] }));

    expect(screen.getByText("Live at 09:00:00")).toBeDefined();

    tick(1000);
    expect(screen.getByText("Live at 09:00:01")).toBeDefined();

    tick(4000);
    expect(screen.getByText("Live at 09:00:05")).toBeDefined();
  });

  it("keeps the totals as they were while the clock runs", () => {
    render(
      createElement(Dashboard, {
        notes: [note({ id: "a", tags: ["support"], body: "one two three" })],
      }),
    );

    tick(5000);

    expect(rows()).toEqual(["support — 1 notes, 3 words"]);
  });

  it("stops the clock when the dashboard goes away", () => {
    const view = render(createElement(Dashboard, { notes: [note()] }));

    view.unmount();
    tick(2000);

    expect(vi.getTimerCount()).toBe(0);
  });
});

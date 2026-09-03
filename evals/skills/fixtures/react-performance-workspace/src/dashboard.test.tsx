import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
import type { Note } from "./notes";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Alpha",
  body: "one two three",
  tags: ["design"],
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

describe("the team dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T09:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("totals the notes and their words by tag", () => {
    render(
      <Dashboard
        notes={[
          note({ id: "a", tags: ["design"], body: "one two three" }),
          note({ id: "b", tags: ["design", "growth"], body: "four five" }),
        ]}
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["design — 2 notes, 5 words", "growth — 1 notes, 2 words"]);
  });

  it("moves the clock on every second", () => {
    render(<Dashboard notes={[note()]} />);

    expect(screen.getByText("Live at 09:00:00")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Live at 09:00:03")).toBeDefined();
  });
});

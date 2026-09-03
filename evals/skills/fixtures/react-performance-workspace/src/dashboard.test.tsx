import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
import type { Note } from "./notes";

const NOW = Date.parse("2026-04-01T09:00:00Z");

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Alpha",
  body: "one two three",
  tags: ["design"],
  updatedAt: NOW - 30_000,
  ...overrides,
});

const rows = (): readonly string[] =>
  screen.getAllByRole("listitem").map((item) => item.textContent ?? "");

describe("the team dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("totals the notes, their words and their idle time by tag", () => {
    render(
      <Dashboard
        notes={[
          note({ id: "a", tags: ["design"], body: "one two three" }),
          note({
            id: "b",
            tags: ["design", "growth"],
            body: "four five",
            updatedAt: NOW - 4_000,
          }),
        ]}
      />,
    );

    expect(rows()).toEqual([
      "design — 2 notes, 5 words, idle 4s",
      "growth — 1 notes, 2 words, idle 4s",
    ]);
  });

  it("moves the clock on every second", () => {
    render(<Dashboard notes={[note()]} />);

    expect(screen.getByText("Live at 09:00:00")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Live at 09:00:03")).toBeDefined();
  });

  it("ages each tag's idle time as the clock runs", () => {
    render(<Dashboard notes={[note({ tags: ["support"] })]} />);

    expect(rows()).toEqual(["support — 1 notes, 3 words, idle 30s"]);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(rows()).toEqual(["support — 1 notes, 3 words, idle 32s"]);
  });
});

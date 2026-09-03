import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { bench, vi } from "vitest";
import { Dashboard } from "../dashboard";
import { makeNotes } from "../notes";

// Only the interval is faked, so the benchmark's own timings stay real.
vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

const notes = makeNotes(1500);
render(createElement(Dashboard, { notes }));

bench("dashboard: one clock tick with the page open", () => {
  act(() => {
    vi.advanceTimersByTime(1000);
  });
});

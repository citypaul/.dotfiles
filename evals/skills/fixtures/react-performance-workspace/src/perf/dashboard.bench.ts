import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { bench, vi } from "vitest";
import { Dashboard } from "../dashboard";
import { makeNotes } from "./sample-notes";

// The interval and the wall clock are faked together, so every measured tick
// moves the clock by exactly one second and costs the same as the last. The
// benchmark's own timings come from `performance`, which is not faked.
vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

// The dashboard is opened once, outside the measurement, because opening it is
// not the complaint. What is measured is a second of it sitting there.
const notes = makeNotes(40000);
render(createElement(Dashboard, { notes }));

bench(
  "dashboard: one clock tick with the page open",
  () => {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  },
  { time: 3000 },
);

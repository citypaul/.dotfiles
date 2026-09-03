// Hidden acceptance test: what someone gets when a task title runs out of
// room. Whether a title is cut off is a layout question, so this test runs in
// the fixture's real-Chromium project (its name puts it in the `browser`
// project's glob); it renders the component and reads only what a person could
// see, so any harness, layout or helper the agent chose leaves it passing. It
// fails only if the component's behaviour changed.
import { render } from "vitest-browser-react";
import { describe, expect, it } from "vitest";
import { TaskTitle } from "./components/TaskTitle";

const LONG_TITLE =
  "Review the pricing page and the onboarding email before the Monday release";

describe("acceptance: task title", () => {
  it("can still be read in full when there is not enough room for it", async () => {
    const screen = await render(<TaskTitle title={LONG_TITLE} />);

    await expect.element(screen.getByText(LONG_TITLE)).toBeVisible();
    await expect.element(screen.getByTitle(LONG_TITLE)).toBeVisible();
  });

  it("adds no hover text to a title that fits", async () => {
    const screen = await render(<TaskTitle title="Fix" />);

    const title = screen.getByText("Fix");
    await expect.element(title).toBeVisible();
    expect(title.element().getAttribute("title")).toBeNull();
  });
});

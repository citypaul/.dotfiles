import { expect, it } from "vitest";
import { version } from "./index";

it("has a version", () => {
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
});

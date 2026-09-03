import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Vitest reads the browser session timeout from the ROOT config, not from
    // the project that enables the browser
    // (`project.vitest.config.browser.connectTimeout ?? 6e4` in
    // vitest/dist/chunks/cli-api.*.js), so it has to be set here to take
    // effect: a cold Chromium — the first launch after `playwright install`,
    // or a machine that verifies the binary — can take well over the 60s
    // default.
    browser: { connectTimeout: 180_000 },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.browser.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.{ts,tsx}"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

import { defineConfig, devices } from "@playwright/test";

const port = 4317;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Builds the app with tsc and serves it, plus its JSON API, from the
  // repository itself. Nothing here reaches the network.
  webServer: {
    command: "pnpm build && pnpm serve",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
  },
});

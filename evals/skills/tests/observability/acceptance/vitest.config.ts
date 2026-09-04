import { defineConfig } from "vitest/config";

// Used only for the hidden acceptance tests: the workspace's own vitest config
// may carry setup files that register a global tracer provider, which would
// swallow every span these tests need to observe.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/acceptance-*.test.ts"],
    setupFiles: [],
  },
});

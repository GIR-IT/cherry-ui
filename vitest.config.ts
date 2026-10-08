import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the tests are plain logic and don't need the Cloudflare or React plugins.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});

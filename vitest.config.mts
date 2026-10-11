import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Absolute, forward-slash paths so aliases also resolve on Windows.
const root = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url)).split("\\").join("/");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: root("./") },
      // `server-only` throws outside React Server Components; unit tests run in plain Node.
      { find: /^server-only$/, replacement: root("./tests/unit/server-only-stub.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});

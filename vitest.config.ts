import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Load .env before tests so modules that read env vars (db, session) work.
    setupFiles: ["dotenv/config"],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" -> "src/*" path alias.
      "@": path.resolve(__dirname, "src"),
      // Our services import "server-only" (a runtime guard that throws outside
      // React Server Components). In a plain test runner that guard would fail,
      // so we replace it with an empty module.
      "server-only": path.resolve(__dirname, "vitest.server-only-stub.ts"),
    },
  },
});

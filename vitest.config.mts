import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "tests/e2e/**",
      "tests/request-origin.test.ts",
      "tests/portal/shipping-workflow.test.ts",
      "node_modules/**",
      ".next/**",
    ],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/*.test.ts",
        "lib/dev-request-store.ts",
        "node_modules/**",
        ".next/**",
      ],
    },
  },
});

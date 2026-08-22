import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/integration/setup/postgres.ts"],
        },
      },
    ],
    coverage: {
      enabled: false,
      provider: "v8",
      thresholds: {
        "100": true,
      },
      reporter: [["text", { skipFull: true }], "html", "clover", "json"],
      include: ["src"],
      exclude: [
        "dist",
        "src/index.ts",
        "src/google/google-tools.ts",
        "src/cli/commands/job-postings-command.ts",
      ],
      reportsDirectory: ".coverage",
    },
  },
});

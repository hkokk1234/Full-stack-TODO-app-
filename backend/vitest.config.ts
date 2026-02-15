import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".mjs", ".json"]
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.ts"],
    globals: true,
    hookTimeout: 300000,
    testTimeout: 60000,
    maxWorkers: 1,
    fileParallelism: false
  }
});

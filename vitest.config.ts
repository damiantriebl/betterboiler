import { URL, fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    deps: {
      inline: [/@testing-library/, /vite-tsconfig-paths/],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      clean: true,
    },
  },
});

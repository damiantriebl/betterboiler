//vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    deps: {
      inline: [/vitest/, /@testing-library/],
    },
    coverage: {
      provider: 'v8', // o 'c8' si usás c8
      reporter: ['text', 'lcov'],
    },
    // Asegúrar que Vitest pueda resolver los alias en Node.js
    // especialmente importante para los tests en CI/CD
    server: {
      deps: {
        inline: [/vitest/, /@testing-library/],
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
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
    deps: { inline: [/vitest/, /@testing-library/] },
    coverage: { provider: 'c8',   reporter: ['text','lcov'] },
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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
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
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**", 
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/e2e/**",
      "**/performance-tests/**",
      "**/scripts/**"
    ],
    deps: {
      inline: [/@testing-library/, /vite-tsconfig-paths/],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      clean: true,
      include: [
        "src/actions/**/*.ts",
        "src/app/api/**/*.ts",
        "src/lib/**/*.ts",
        "src/hooks/**/*.ts",
        "src/utils/**/*.ts",
        "src/stores/**/*.ts",
        // "src/components/**/*.{ts,tsx}",
        // "src/app/**/*.{ts,tsx}",
      ],
      exclude: [
        // Archivos de configuración y setup
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.*",
        "**/*.setup.*",
        "**/coverage/**",
        
        // Archivos de tipos y esquemas (no necesitan coverage)
        "src/types/**",
        "src/stores/**",
        "src/zod/**",
        
        // Archivos de configuración del proyecto
        "src/auth.ts",
        "src/auth-client.ts",
        "src/middleware.ts",
        
        // Archivos de datos estáticos
        "src/data/**",
        
        // Archivos de migración y seeds
        "prisma/**",
        
        // Tests
        "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        "**/__tests__/**",
        "**/__mocks__/**",
        
        // Archivos específicos que no necesitan coverage
        "src/libs/__mocks__/**",
        "**/layout.tsx",
        "**/loading.tsx",
        "**/error.tsx",
        "**/not-found.tsx",
        "**/page.tsx", // Solo los page.tsx básicos
        
        // Archivos de configuración de componentes
        "src/components/ui/**", // Componentes de shadcn/ui
      ],
      all: true,
      thresholds: {
        global: {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
        // Configuraciones específicas para diferentes tipos de archivos
        "src/actions/**/*.ts": {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        "src/app/api/**/*.ts": {
          statements: 75,
          branches: 70,
          functions: 75,
          lines: 75,
        },
      },
    },
  },
});

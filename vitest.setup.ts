import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Limpiar después de cada prueba
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
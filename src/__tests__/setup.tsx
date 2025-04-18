import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from 'react';

// Extiende los matchers de Vitest con los de testing-library
expect.extend(matchers);

// Limpiar después de cada prueba
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Mock común para todos los tests
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock del componente LoadingButton para que sea más robusto
vi.mock("@/components/custom/LoadingButton", () => {
  // Utilizar JSX.Element para evitar errores de tipo
  const LoadingButton = ({
    children,
    pending,
    ...props
  }: {
    children: React.ReactNode;
    pending: boolean;
    [key: string]: any;
  }) => {
    return <button disabled={pending} {...props}>{children}</button>;
  };

  LoadingButton.displayName = "LoadingButton";
  return { default: LoadingButton };
});

// Configuración común para tests que usan server actions
export const setupServerAction = () => {
  vi.mock("react", async () => {
    const actual = await vi.importActual("react");
    return {
      ...actual,
      useActionState: () => [{ success: false, error: false }, vi.fn(), false],
    };
  });
}; 
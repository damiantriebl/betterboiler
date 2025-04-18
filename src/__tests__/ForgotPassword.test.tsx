import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPassword from "../app/(auth)/forgot-password/page";
import { setupServerAction } from "./setup";

// Configurar mocks para server actions
setupServerAction();

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();
  });

  it("renders the forgot password form", () => {
    render(<ForgotPassword />);

    // Verificar que los elementos principales del formulario estén presentes
    expect(screen.getByText("Recuperar contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar enlace/i })).toBeInTheDocument();
  });

  it("allows typing in the email field", async () => {
    render(<ForgotPassword />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    await waitFor(() => {
      expect(emailInput).toHaveValue("test@example.com");
    });
  });

  // Nota: Para pruebas más avanzadas de envío del formulario se necesitaría
  // mockear más profundamente el useActionState y el formAction
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks usando factory functions que no referencian variables externas
vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { GET } from "./route";

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de headers por defecto - usando Map para simular ReadonlyHeaders
    const mockHeadersMap = new Map([
      ["authorization", "Bearer token123"],
      ["content-type", "application/json"],
    ]);

    // Configurar mock de headers
    vi.mocked(headers).mockResolvedValue(mockHeadersMap as any);

    // Mock de NextResponse.json por defecto
    vi.mocked(NextResponse.json).mockImplementation(
      (data: any, init?: any) =>
        ({
          data,
          status: init?.status || 200,
        }) as any,
    );
  });

  describe("GET", () => {
    it("debería devolver usuario autenticado cuando hay sesión válida", async () => {
      // Arrange
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          organizationId: "org-1",
        },
      };

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

      // Act
      const response = await GET();

      // Assert
      expect(auth.api.getSession).toHaveBeenCalledWith({
        headers: expect.any(Headers),
      });

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          isAuthenticated: true,
          user: {
            id: "user-1",
            email: "test@example.com",
            name: "Test User",
            organizationId: "org-1",
          },
        },
        { status: 200 },
      );

      expect(response.status).toBe(200);
    });

    it("debería devolver no autenticado cuando no hay sesión", async () => {
      // Arrange
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      // Act
      const response = await GET();

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { isAuthenticated: false, user: null },
        { status: 200 },
      );

      expect(response.status).toBe(200);
    });

    it("debería devolver no autenticado cuando no hay usuario en la sesión", async () => {
      // Arrange
      const mockSession = { user: null };
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

      // Act
      const response = await GET();

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { isAuthenticated: false, user: null },
        { status: 200 },
      );

      expect(response.status).toBe(200);
    });

    it("debería manejar errores y devolver 500", async () => {
      // Arrange
      const errorMessage = "Database connection failed";
      vi.mocked(auth.api.getSession).mockRejectedValue(new Error(errorMessage));

      // Spy en console.error para verificar el logging
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const response = await GET();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        "[API getSession] Error getting session:",
        expect.any(Error),
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          isAuthenticated: false,
          user: null,
          error: "Error al obtener la sesión",
        },
        { status: 500 },
      );

      expect(response.status).toBe(500);

      // Limpiar spy
      consoleSpy.mockRestore();
    });

    it("debería procesar headers correctamente", async () => {
      // Arrange
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          organizationId: "org-1",
        },
      };

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

      // Act
      await GET();

      // Assert
      const callArgs = vi.mocked(auth.api.getSession).mock.calls[0][0];
      expect(callArgs.headers).toBeInstanceOf(Headers);
      expect(callArgs.headers.get("authorization")).toBe("Bearer token123");
      expect(callArgs.headers.get("content-type")).toBe("application/json");
    });
  });
});

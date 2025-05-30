import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock de NextResponse
vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

describe("/api/sing-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de response con cookies.set
    const mockResponse = {
      cookies: {
        set: vi.fn(),
      },
    };

    vi.mocked(NextResponse.json).mockReturnValue(mockResponse as any);
  });

  describe("POST", () => {
    it("debería hacer sign-out correctamente y limpiar cookies", async () => {
      // Arrange
      const mockRequest = {} as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith({ success: true });
      expect(response.cookies.set).toHaveBeenCalledWith("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
        secure: true,
        sameSite: "strict",
        path: "/",
      });
    });

    it("debería limpiar la cookie jwt correctamente", async () => {
      // Arrange
      const mockRequest = {} as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.cookies.set).toHaveBeenCalledWith(
        "jwt",
        "",
        expect.objectContaining({
          httpOnly: true,
          expires: expect.any(Date),
          secure: true,
          sameSite: "strict",
          path: "/",
        }),
      );

      // Verificar que la fecha de expiration sea en el pasado
      const setCall = (response.cookies.set as any).mock.calls[0];
      const expirationDate = setCall[2].expires;
      expect(expirationDate.getTime()).toBe(0);
    });
  });
});

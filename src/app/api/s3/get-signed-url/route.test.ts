import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock de @/lib/s3-unified
vi.mock("@/lib/s3-unified", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock de NextResponse
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getSignedUrl } from "@/lib/s3-unified";
import { GET } from "./route";

describe("/api/s3/get-signed-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
    it("debería devolver signed URL cuando los parámetros son válidos", async () => {
      // Arrange
      const mockSignedUrl = {
        success: { url: "https://bucket.s3.amazonaws.com/test.jpg?signature=..." },
      };
      vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl);

      const mockRequest = new Request(
        "http://localhost/api/s3/get-signed-url?name=test.jpg&operation=get",
      );

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getSignedUrl).toHaveBeenCalledWith("test.jpg", "get");
      expect(NextResponse.json).toHaveBeenCalledWith(mockSignedUrl);
      expect(response.status).toBe(200);
    });

    it("debería devolver error 400 cuando falta el parámetro name", async () => {
      // Arrange
      const mockRequest = new Request("http://localhost/api/s3/get-signed-url?operation=get");

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getSignedUrl).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { failure: "Parámetros inválidos" },
        { status: 400 },
      );
      expect(response.status).toBe(400);
    });

    it("debería devolver error 400 cuando falta el parámetro operation", async () => {
      // Arrange
      const mockRequest = new Request("http://localhost/api/s3/get-signed-url?name=test.jpg");

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getSignedUrl).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { failure: "Parámetros inválidos" },
        { status: 400 },
      );
      expect(response.status).toBe(400);
    });

    it("debería devolver error 400 cuando faltan ambos parámetros", async () => {
      // Arrange
      const mockRequest = new Request("http://localhost/api/s3/get-signed-url");

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getSignedUrl).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { failure: "Parámetros inválidos" },
        { status: 400 },
      );
      expect(response.status).toBe(400);
    });

    it("debería manejar errores de getSignedUrl", async () => {
      // Arrange
      const mockError = { failure: "Error al generar URL firmada" };
      vi.mocked(getSignedUrl).mockResolvedValue(mockError);

      const mockRequest = new Request(
        "http://localhost/api/s3/get-signed-url?name=test.jpg&operation=put",
      );

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getSignedUrl).toHaveBeenCalledWith("test.jpg", "put");
      expect(NextResponse.json).toHaveBeenCalledWith(mockError, { status: 400 });
      expect(response.status).toBe(400);
    });

    it("debería funcionar con operation=put", async () => {
      // Arrange
      const mockSignedUrl = {
        success: { url: "https://bucket.s3.amazonaws.com/upload.jpg?signature=..." },
      };
      vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl);

      const mockRequest = new Request(
        "http://localhost/api/s3/get-signed-url?name=upload.jpg&operation=put",
      );

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getSignedUrl).toHaveBeenCalledWith("upload.jpg", "put");
      expect(NextResponse.json).toHaveBeenCalledWith(mockSignedUrl);
      expect(response.status).toBe(200);
    });
  });
});

import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/pdf-generators/quote-pdf", () => ({
  generateQuotePDF: vi.fn(),
  createQuotePDFResponse: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { createQuotePDFResponse, generateQuotePDF } from "@/lib/pdf-generators/quote-pdf";
import { POST } from "./route";

describe("/api/generate-quote-pdf", () => {
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

  describe("POST", () => {
    it("debería generar PDF cuando los datos son válidos", async () => {
      // Arrange
      const mockPdfProps = {
        motorcycle: {
          id: 1,
          brand: { name: "Honda" },
          model: { name: "CBR 600" },
          year: 2023,
          price: 50000,
        },
        paymentData: { metodoPago: "efectivo" },
        activeTab: "efectivo",
        basePrice: 50000,
      };

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResponse = new Response(mockPdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="Presupuesto.pdf"',
        },
      });

      vi.mocked(generateQuotePDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createQuotePDFResponse).mockReturnValue(mockResponse);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockPdfProps),
      } as unknown as Request;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(mockRequest.json).toHaveBeenCalled();
      expect(generateQuotePDF).toHaveBeenCalledWith(mockPdfProps);
      expect(createQuotePDFResponse).toHaveBeenCalledWith(mockPdfBytes, "Presupuesto.pdf");
      expect(response).toBe(mockResponse);
    });

    it("debería devolver error 400 cuando faltan datos de motocicleta", async () => {
      // Arrange
      const mockPdfProps = {
        motorcycle: null,
        client: {
          name: "Juan Pérez",
          email: "juan@example.com",
        },
      };

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockPdfProps),
      } as unknown as Request;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "No se pudo crear el documento PDF (faltan datos de motocicleta)" },
        { status: 400 },
      );
      expect(generateQuotePDF).not.toHaveBeenCalled();
      expect(createQuotePDFResponse).not.toHaveBeenCalled();
    });

    it("debería manejar errores durante la generación del PDF", async () => {
      // Arrange
      const mockPdfProps = {
        motorcycle: {
          id: 1,
          brand: { name: "Honda" },
          model: { name: "CBR 600" },
          year: 2023,
          price: 50000,
        },
        paymentData: { metodoPago: "efectivo" },
      };

      const errorMessage = "Error en la generación del PDF";
      vi.mocked(generateQuotePDF).mockRejectedValue(new Error(errorMessage));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockPdfProps),
      } as unknown as Request;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error en la generación del PDF:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: "No se pudo generar el PDF",
          details: errorMessage,
        },
        { status: 500 },
      );
      expect(createQuotePDFResponse).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("debería manejar errores no tipificados", async () => {
      // Arrange
      const mockPdfProps = {
        motorcycle: {
          id: 1,
          brand: { name: "Honda" },
          model: { name: "CBR 600" },
          year: 2023,
          price: 50000,
        },
        paymentData: { metodoPago: "efectivo" },
      };

      vi.mocked(generateQuotePDF).mockRejectedValue("String error");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockPdfProps),
      } as unknown as Request;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: "No se pudo generar el PDF",
          details: "Error desconocido",
        },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });

    it("debería manejar errores de parsing JSON", async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as Request;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error en la generación del PDF:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: "No se pudo generar el PDF",
          details: "Invalid JSON",
        },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });
  });
});

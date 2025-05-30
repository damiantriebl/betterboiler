import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/pdf-generators/sales-report-pdf", () => ({
  generateSalesReportPDF: vi.fn(),
  createPDFResponse: vi.fn(),
}));

import { createPDFResponse, generateSalesReportPDF } from "@/lib/pdf-generators/sales-report-pdf";
import { GET, POST } from "./route";

describe("/api/reports/sales/generate-pdf-lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("debería generar PDF cuando los datos son válidos", async () => {
      // Arrange
      const mockReportData = {
        summary: {
          totalSales: 15,
          totalRevenue: { ARS: 2500000, USD: 5000 },
          totalProfit: { ARS: 750000, USD: 1500 },
          averagePrice: { ARS: 166667, USD: 333 },
        },
        salesBySeller: {},
        salesByBranch: {},
        salesByMonth: {},
      };

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResponse = new Response(mockPdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="reporte-ventas.pdf"',
        },
      });

      vi.mocked(generateSalesReportPDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createPDFResponse).mockReturnValue(mockResponse);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockReportData),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(mockRequest.json).toHaveBeenCalled();
      expect(generateSalesReportPDF).toHaveBeenCalledWith(mockReportData);
      expect(createPDFResponse).toHaveBeenCalledWith(
        mockPdfBytes,
        expect.stringMatching(/^reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf$/),
      );
      expect(response).toBe(mockResponse);
    });

    it("debería manejar errores durante la generación del PDF", async () => {
      // Arrange
      const mockReportData = {
        summary: {},
        salesBySeller: {},
        salesByBranch: {},
        salesByMonth: {},
      };

      vi.mocked(generateSalesReportPDF).mockRejectedValue(new Error("PDF generation failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockReportData),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error generando PDF de ventas:", expect.any(Error));
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(500);

      const responseJson = await response.json();
      expect(responseJson).toEqual({ error: "Error generando el reporte PDF" });

      consoleSpy.mockRestore();
    });

    it("debería manejar errores al parsear JSON", async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error generando PDF de ventas:", expect.any(Error));
      expect(response.status).toBe(500);

      consoleSpy.mockRestore();
    });
  });

  describe("GET", () => {
    it("debería generar PDF con datos de ejemplo", async () => {
      // Arrange
      const mockPdfBytes = new Uint8Array([5, 4, 3, 2, 1]);
      const mockResponse = new Response(mockPdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="reporte-ventas-ejemplo.pdf"',
        },
      });

      vi.mocked(generateSalesReportPDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createPDFResponse).mockReturnValue(mockResponse);

      // Act
      const response = await GET();

      // Assert
      expect(generateSalesReportPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            totalSales: 15,
            totalRevenue: { ARS: 2500000, USD: 5000 },
          }),
          salesBySeller: expect.objectContaining({
            "1": expect.objectContaining({
              name: "Juan Pérez",
              count: 8,
            }),
          }),
        }),
      );
      expect(createPDFResponse).toHaveBeenCalledWith(mockPdfBytes, "reporte-ventas-ejemplo.pdf");
      expect(response).toBe(mockResponse);
    });

    it("debería manejar errores durante la generación del PDF de ejemplo", async () => {
      // Arrange
      vi.mocked(generateSalesReportPDF).mockRejectedValue(new Error("PDF generation failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const response = await GET();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error generando PDF de ejemplo:", expect.any(Error));
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(500);

      const responseJson = await response.json();
      expect(responseJson).toEqual({ error: "Error generando el reporte de ejemplo" });

      consoleSpy.mockRestore();
    });
  });
});

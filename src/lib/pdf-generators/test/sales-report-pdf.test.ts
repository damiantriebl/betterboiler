import { createPDFResponse, generateSalesReportPDF } from "@/lib/pdf-generators/sales-report-pdf";
import { PDFBuilder } from "@/lib/pdf-lib-utils";
import type { SalesReport } from "@/types/reports";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock PDFBuilder
vi.mock("@/lib/pdf-lib-utils", () => ({
  PDFBuilder: {
    create: vi.fn(),
    formatCurrency: vi.fn((amount, currency) => `${currency} ${amount}`),
  },
  colors: {
    black: { r: 0, g: 0, b: 0 },
    gray: { r: 0.5, g: 0.5, b: 0.5 },
  },
  fontSizes: {
    title: 24,
    medium: 16,
    normal: 10,
    small: 8,
  },
  margins: {
    normal: 30,
  },
}));

describe("Sales Report PDF Generator", () => {
  let mockPdfBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock PDFBuilder instance
    mockPdfBuilder = {
      getPageDimensions: vi.fn().mockReturnValue({ width: 595, height: 842 }),
      addText: vi.fn(),
      addCenteredTitle: vi.fn(),
      addSection: vi.fn().mockImplementation((title, x, y, width) => y - 30),
      addTable: vi
        .fn()
        .mockImplementation((config) => config.y - config.rows.length * config.cellHeight - 30),
      addPage: vi.fn(),
      finalize: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    };

    vi.mocked(PDFBuilder.create).mockResolvedValue(mockPdfBuilder);
  });

  describe("generateSalesReportPDF", () => {
    const mockReport: SalesReport = {
      summary: {
        totalSales: 10,
        totalRevenue: { ARS: 1000000 },
        totalProfit: { ARS: 200000 },
        averagePrice: { ARS: 100000 },
      },
      salesBySeller: {
        "1": {
          name: "John Doe",
          count: 5,
          revenue: { ARS: 500000 },
          profit: { ARS: 100000 },
        },
        "2": {
          name: "Jane Smith",
          count: 5,
          revenue: { ARS: 500000 },
          profit: { ARS: 100000 },
        },
      },
      salesByBranch: {
        "1": {
          name: "Sucursal Centro",
          count: 6,
          revenue: { ARS: 600000 },
        },
        "2": {
          name: "Sucursal Norte",
          count: 4,
          revenue: { ARS: 400000 },
        },
      },
      salesByMonth: {
        Enero: {
          count: 3,
          revenue: { ARS: 300000 },
        },
        Febrero: {
          count: 7,
          revenue: { ARS: 700000 },
        },
      },
    };

    it("should generate PDF with basic information", async () => {
      // Act
      const result = await generateSalesReportPDF(mockReport);

      // Assert
      expect(PDFBuilder.create).toHaveBeenCalled();
      expect(mockPdfBuilder.addCenteredTitle).toHaveBeenCalledWith(
        "Reporte de Ventas",
        expect.any(Number),
      );
      expect(mockPdfBuilder.addSection).toHaveBeenCalledWith(
        "Resumen",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockPdfBuilder.finalize).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("should include all sections in the report", async () => {
      // Act
      await generateSalesReportPDF(mockReport);

      // Assert
      expect(mockPdfBuilder.addSection).toHaveBeenCalledWith(
        "Resumen",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockPdfBuilder.addSection).toHaveBeenCalledWith(
        "Ventas por Vendedor",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockPdfBuilder.addSection).toHaveBeenCalledWith(
        "Ventas por Sucursal",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockPdfBuilder.addSection).toHaveBeenCalledWith(
        "Ventas por Mes",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("should add new page when content exceeds page height", async () => {
      // Arrange - Mock addSection and addTable to return low Y values to trigger page break
      mockPdfBuilder.addSection.mockImplementation(() => 200); // Return Y value below 250
      mockPdfBuilder.addTable.mockImplementation(() => 100); // Return Y value below 250

      // Act
      await generateSalesReportPDF(mockReport);

      // Assert
      expect(mockPdfBuilder.addPage).toHaveBeenCalled();
    });
  });

  describe("createPDFResponse", () => {
    it("should create response with correct headers", () => {
      // Arrange
      const pdfBytes = new Uint8Array([1, 2, 3]);
      const filename = "test-report.pdf";

      // Act
      const response = createPDFResponse(pdfBytes, filename);

      // Assert
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Disposition")).toBe(
        `attachment; filename="${filename}"`,
      );
      expect(response.headers.get("Content-Length")).toBe("3");
    });

    it("should use default filename when not provided", () => {
      // Arrange
      const pdfBytes = new Uint8Array([1, 2, 3]);

      // Act
      const response = createPDFResponse(pdfBytes);

      // Assert
      expect(response.headers.get("Content-Disposition")).toBe(
        'attachment; filename="reporte-ventas.pdf"',
      );
    });
  });
});

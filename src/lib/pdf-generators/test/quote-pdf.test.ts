import { createQuotePDFResponse, generateQuotePDF } from "@/lib/pdf-generators/quote-pdf";
import type { QuotePDFProps } from "@/lib/pdf-generators/quote-pdf";
import { PDFBuilder } from "@/lib/pdf-lib-utils";
import type { MotorcycleWithDetails } from "@/types/motorcycle";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock PDFBuilder
vi.mock("@/lib/pdf-lib-utils", () => ({
  PDFBuilder: {
    create: vi.fn(),
  },
  colors: {
    black: { r: 0, g: 0, b: 0 },
    gray: { r: 0.5, g: 0.5, b: 0.5 },
  },
  fontSizes: {
    title: 24,
    normal: 10,
    small: 8,
  },
  margins: {
    normal: 30,
  },
}));

describe("Quote PDF Generator", () => {
  let mockPdfBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock PDFBuilder instance
    mockPdfBuilder = {
      getPageDimensions: vi.fn().mockReturnValue({ width: 595, height: 842 }),
      addText: vi.fn(),
      addSection: vi.fn().mockImplementation((title, x, y, width) => y - 30),
      addTable: vi
        .fn()
        .mockImplementation((config) => config.y - config.rows.length * config.cellHeight - 30),
      addPage: vi.fn(),
      finalize: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      timesRomanBoldFont: {},
    };

    vi.mocked(PDFBuilder.create).mockResolvedValue(mockPdfBuilder);
  });

  describe("generateQuotePDF", () => {
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(amount);
    };

    const mockMotorcycle: MotorcycleWithDetails = {
      id: 1,
      brandId: 1,
      modelId: 1,
      colorId: 1,
      licensePlate: null,
      observations: null,
      imageUrl: null,
      supplierId: null,
      clientId: null,
      sellerId: null,
      soldAt: null,
      brand: {
        id: 1,
        name: "Honda",
        color: "#000000",
      },
      model: {
        id: 1,
        name: "CBR 600",
        brandId: 1,
        imageUrl: null,
        files: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        additionalFilesJson: null,
        specSheetUrl: null,
      },
      year: 2023,
      color: {
        id: 1,
        name: "Rojo",
        colorOne: "#FF0000",
        colorTwo: null,
        type: "color",
        isGlobal: false,
        order: 1,
        organizationId: "org-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      chassisNumber: "CH123456",
      engineNumber: "EN789012",
      mileage: 0,
      displacement: 600,
      currency: "ARS",
      costPrice: 40000,
      retailPrice: 50000,
      wholesalePrice: 45000,
      state: "STOCK",
      branchId: 1,
      branch: {
        id: 1,
        name: "Sucursal Centro",
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId: "org-1",
        order: 1,
      },
      organizationId: "org-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      reservations: [],
      reservation: null,
    };

    const mockProps: QuotePDFProps = {
      motorcycle: mockMotorcycle,
      paymentData: {
        metodoPago: "efectivo",
        discountValue: 0,
        discountType: "discount",
        cuotas: 1,
        currentAccountInstallments: 12,
        currentAccountFrequency: "mensual",
        annualInterestRate: 10,
        downPayment: 10000,
        isMayorista: false,
      },
      activeTab: "efectivo",
      basePrice: 50000,
      modifierAmount: 0,
      finalPrice: 50000,
      financedAmount: 0,
      installmentDetails: {
        installmentAmount: 0,
        schedule: [],
      },
      totalWithFinancing: 0,
      organizationName: "Test Company",
      userName: "Test User",
      formatAmount,
      organizationLogo: undefined,
    };

    it("should generate PDF with basic information", async () => {
      // Act
      const result = await generateQuotePDF(mockProps);

      // Assert
      expect(PDFBuilder.create).toHaveBeenCalled();
      expect(mockPdfBuilder.addText).toHaveBeenCalledWith(
        "Presupuesto Test Company",
        expect.any(Object),
      );
      expect(mockPdfBuilder.addSection).toHaveBeenCalledWith(
        "Información del Vehículo",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockPdfBuilder.finalize).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("should throw error when motorcycle data is missing", async () => {
      // Arrange
      const invalidProps = { ...mockProps, motorcycle: null };

      // Act & Assert
      await expect(generateQuotePDF(invalidProps)).rejects.toThrow(
        "Datos de motocicleta requeridos",
      );
    });

    it("should handle credit card payment information", async () => {
      // Arrange
      const creditCardProps = {
        ...mockProps,
        activeTab: "tarjeta",
        paymentData: {
          ...mockProps.paymentData,
          cuotas: 3,
        },
      };

      // Act
      await generateQuotePDF(creditCardProps);

      // Assert
      expect(mockPdfBuilder.addText).toHaveBeenCalledWith(
        expect.stringContaining("Tarjeta - 3 cuota(s)"),
        expect.any(Object),
      );
    });

    it("should handle current account payment information", async () => {
      // Arrange
      const currentAccountProps = {
        ...mockProps,
        activeTab: "cuenta_corriente",
        financedAmount: 40000,
        installmentDetails: {
          installmentAmount: 3500,
          schedule: [
            {
              installmentNumber: 1,
              capitalAtPeriodStart: 40000,
              amortization: 3000,
              interestForPeriod: 500,
              calculatedInstallmentAmount: 3500,
              capitalAtPeriodEnd: 37000,
            },
          ],
        },
        totalWithFinancing: 42000,
      };

      // Act
      await generateQuotePDF(currentAccountProps);

      // Assert
      expect(mockPdfBuilder.addText).toHaveBeenCalledWith(
        expect.stringContaining("Financiación - 12 cuotas"),
        expect.any(Object),
      );
      expect(mockPdfBuilder.addTable).toHaveBeenCalled();
    });

    it("should handle discount information", async () => {
      // Arrange
      const discountProps = {
        ...mockProps,
        paymentData: {
          ...mockProps.paymentData,
          discountValue: 10,
          discountType: "discount" as const,
        },
        modifierAmount: 5000,
        finalPrice: 45000,
      };

      // Act
      await generateQuotePDF(discountProps);

      // Assert
      expect(mockPdfBuilder.addText).toHaveBeenCalledWith(
        expect.stringContaining("Descuento (10%)"),
        expect.any(Object),
      );
    });
  });

  describe("createQuotePDFResponse", () => {
    it("should create response with correct headers", () => {
      // Arrange
      const pdfBytes = new Uint8Array([1, 2, 3]);
      const filename = "test-quote.pdf";

      // Act
      const response = createQuotePDFResponse(pdfBytes, filename);

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
      const response = createQuotePDFResponse(pdfBytes);

      // Assert
      expect(response.headers.get("Content-Disposition")).toBe(
        'attachment; filename="Presupuesto.pdf"',
      );
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
const mockPrisma = {
  motorcycleTransfer: {
    findFirst: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock getOrganizationIdFromSession
const mockGetOrganizationIdFromSession = vi.fn();
vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: mockGetOrganizationIdFromSession,
}));

// Mock generateTransferPDF
const mockGenerateTransferPDF = vi.fn();
vi.mock("@/lib/pdf-generators/transfer-pdf", () => ({
  generateTransferPDF: mockGenerateTransferPDF,
}));

describe("generate-transfer-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateTransferPDFAction", () => {
    it("debería generar PDF exitosamente", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      const transferId = 1;
      const mockTransfer = {
        id: 1,
        motorcycle: {
          chassisNumber: "ABC123",
          brand: { name: "Honda" },
          model: { name: "CBR600" },
          color: { name: "Rojo" },
          branch: { name: "Sucursal A" },
        },
        fromBranch: { name: "Sucursal A" },
        toBranch: { name: "Sucursal B" },
        logisticProvider: { name: "Proveedor Test" },
        requester: { name: "Usuario Test" },
        confirmer: { name: "Confirmador Test" },
      };

      const mockOrganization = {
        name: "Mi Organización",
      };

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4]);

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(mockTransfer);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockGenerateTransferPDF.mockResolvedValue(mockPdfBytes);

      // Act
      const result = await generateTransferPDFAction(transferId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.pdfData).toBe(Buffer.from(mockPdfBytes).toString("base64"));
      expect(result.filename).toBe("transferencia-1-ABC123.pdf");

      expect(mockPrisma.motorcycleTransfer.findFirst).toHaveBeenCalledWith({
        where: {
          id: transferId,
          organizationId: "org-1",
        },
        include: {
          motorcycle: {
            include: {
              brand: true,
              model: true,
              color: true,
              branch: true,
            },
          },
          fromBranch: true,
          toBranch: true,
          logisticProvider: true,
          requester: true,
          confirmer: true,
        },
      });

      expect(mockGenerateTransferPDF).toHaveBeenCalledWith({
        transfer: mockTransfer,
        organizationName: "Mi Organización",
      });
    });

    it("debería manejar filename sin chassisNumber", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      const transferId = 1;
      const mockTransfer = {
        id: 1,
        motorcycle: null, // Sin motocicleta
      };

      const mockOrganization = {
        name: "Mi Organización",
      };

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4]);

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(mockTransfer);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockGenerateTransferPDF.mockResolvedValue(mockPdfBytes);

      // Act
      const result = await generateTransferPDFAction(transferId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.filename).toBe("transferencia-1-moto.pdf");
    });

    it("debería usar nombre por defecto cuando no hay organización", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      const transferId = 1;
      const mockTransfer = {
        id: 1,
        motorcycle: {
          chassisNumber: "ABC123",
        },
      };

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4]);

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(mockTransfer);
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockGenerateTransferPDF.mockResolvedValue(mockPdfBytes);

      // Act
      const result = await generateTransferPDFAction(transferId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockGenerateTransferPDF).toHaveBeenCalledWith({
        transfer: mockTransfer,
        organizationName: "Sistema de Gestión",
      });
    });

    it("debería retornar error cuando no hay sesión válida", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: null,
        error: "Sesión no válida",
      });

      // Act
      const result = await generateTransferPDFAction(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Sesión no válida");
    });

    it("debería retornar error cuando no se encuentra la transferencia", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(null);

      // Act
      const result = await generateTransferPDFAction(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Transferencia no encontrada");
    });

    it("debería manejar errores en la generación del PDF", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      const mockTransfer = {
        id: 1,
        motorcycle: {
          chassisNumber: "ABC123",
        },
      };

      const mockOrganization = {
        name: "Mi Organización",
      };

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(mockTransfer);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockGenerateTransferPDF.mockRejectedValue(new Error("Error PDF"));

      // Act
      const result = await generateTransferPDFAction(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error interno del servidor al generar el PDF");
    });

    it("debería manejar errores de base de datos", async () => {
      const { generateTransferPDFAction } = await import("../generate-transfer-pdf");

      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.motorcycleTransfer.findFirst.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await generateTransferPDFAction(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error interno del servidor al generar el PDF");
    });
  });
});

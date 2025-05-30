import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import {
  addModelToOrganizationBrand,
  associateOrganizationBrand,
  dissociateOrganizationBrand,
  renameBrandByDuplication,
  updateOrganizationBrandAssociation,
  updateOrganizationBrandsOrder,
  updateOrganizationModel,
  updateOrganizationModelsOrder,
} from "../create-edit-brand";

// Mock de Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    brand: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organizationBrand: {
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    organizationModel: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    model: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe("Create Edit Brand Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = "org-123";
  const mockSessionData = {
    organizationId: mockOrganizationId,
    userId: "user-456",
    userEmail: "test@example.com",
    userRole: "ADMIN",
    error: null,
  };

  const mockBrand = {
    id: 1,
    name: "Toyota",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganizationBrand = {
    id: 1,
    organizationId: mockOrganizationId,
    brandId: 1,
    order: 0,
    color: "#FF0000",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockModel = {
    id: 1,
    name: "Corolla",
    brandId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganizationModel = {
    id: 1,
    organizationId: mockOrganizationId,
    modelId: 1,
    brandId: 1,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("🏷️ associateOrganizationBrand", () => {
    describe("✅ Successful Association", () => {
      it("should create new brand and associate it successfully", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "honda");
        formData.set("color", "#0066CC");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return await callback({
            brand: {
              findUnique: vi.fn().mockResolvedValue(null), // Brand doesn't exist
              create: vi.fn().mockResolvedValue({ ...mockBrand, name: "Honda" }),
            },
            organizationBrand: {
              findUnique: vi.fn().mockResolvedValue(null), // Association doesn't exist
              aggregate: vi.fn().mockResolvedValue({ _max: { order: 2 } }),
              create: vi.fn().mockResolvedValue({
                ...mockOrganizationBrand,
                id: 2,
                brandId: 1,
                order: 3,
                color: "#0066CC",
              }),
            },
          });
        });

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuracion");
        expect(result.success).toBe(true);
        expect(result.organizationBrandId).toBe(2);
        expect(result.message).toContain("Honda");
        expect(result.message).toContain("creada globalmente");
      });

      it("should associate existing brand successfully", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "toyota");
        formData.set("color", "#CC0000");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return await callback({
            brand: {
              findUnique: vi.fn().mockResolvedValue(mockBrand), // Brand exists
              create: vi.fn(),
            },
            organizationBrand: {
              findUnique: vi.fn().mockResolvedValue(null), // Association doesn't exist
              aggregate: vi.fn().mockResolvedValue({ _max: { order: 1 } }),
              create: vi.fn().mockResolvedValue({
                ...mockOrganizationBrand,
                color: "#CC0000",
                order: 2,
              }),
            },
          });
        });

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.organizationBrandId).toBe(1);
        expect(result.message).toContain("Toyota");
        expect(result.message).not.toContain("creada globalmente");
      });

      it("should handle already existing association", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "toyota");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return await callback({
            brand: {
              findUnique: vi.fn().mockResolvedValue(mockBrand),
            },
            organizationBrand: {
              findUnique: vi.fn().mockResolvedValue(mockOrganizationBrand), // Association exists
            },
          });
        });

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.organizationBrandId).toBe(1);
        expect(result.message).toContain("ya estaba asociada");
      });

      it("should normalize brand name correctly", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "hONdA"); // Mixed case
        formData.set("color", "#0066CC");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            brand: {
              findUnique: vi.fn().mockResolvedValue(null),
              create: vi.fn().mockResolvedValue({ ...mockBrand, name: "Honda" }),
            },
            organizationBrand: {
              findUnique: vi.fn().mockResolvedValue(null),
              aggregate: vi.fn().mockResolvedValue({ _max: { order: 0 } }),
              create: vi.fn().mockResolvedValue(mockOrganizationBrand),
            },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toContain("Honda"); // Properly normalized
      });

      it("should handle null color correctly", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "nissan");
        // No color set

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            brand: {
              findUnique: vi.fn().mockResolvedValue(null),
              create: vi.fn().mockResolvedValue({ ...mockBrand, name: "Nissan" }),
            },
            organizationBrand: {
              findUnique: vi.fn().mockResolvedValue(null),
              aggregate: vi.fn().mockResolvedValue({ _max: { order: 0 } }),
              create: vi.fn().mockResolvedValue({
                ...mockOrganizationBrand,
                color: null,
              }),
            },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe("❌ Error Handling", () => {
      it("should return error when user is not authenticated", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: "Not authenticated",
        });

        const formData = new FormData();
        formData.set("name", "toyota");

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Usuario no autenticado o sin organización.");
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it("should handle validation errors", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);

        const formData = new FormData();
        formData.set("name", ""); // Empty name
        formData.set("color", "invalid-color"); // Invalid color

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("Datos inválidos");
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it("should handle database transaction errors", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "toyota");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        const dbError = new Error("Transaction failed");
        mockPrisma.$transaction.mockRejectedValue(dbError);

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error al asociar la marca: Transaction failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "🔥 ERROR SERVER ACTION (associateOrganizationBrand):",
          dbError,
        );
      });

      it("should handle unknown errors", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("name", "toyota");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.$transaction.mockRejectedValue("Unknown error");

        // Act
        const result = await associateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error al asociar la marca: Error inesperado.");
      });
    });
  });

  describe("✏️ updateOrganizationBrandAssociation", () => {
    describe("✅ Successful Update", () => {
      it("should update brand association color successfully", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");
        formData.set("color", "#00FF00");
        // Note: order no se pasa, pero z.coerce.number() convierte null/undefined a 0

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(mockOrganizationBrand);
        mockPrisma.organizationBrand.update.mockResolvedValue({
          ...mockOrganizationBrand,
          color: "#00FF00",
        });

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        // La implementación incluye order: 0 debido a z.coerce.number() que convierte valores ausentes a 0
        expect(mockPrisma.organizationBrand.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { color: "#00FF00", order: 0 },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuracion");
        expect(result.success).toBe(true);
      });

      it("should update brand association order successfully", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");
        formData.set("order", "5");
        // Note: color no se pasa, pero el campo opcional puede incluir null

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(mockOrganizationBrand);
        mockPrisma.organizationBrand.update.mockResolvedValue({
          ...mockOrganizationBrand,
          order: 5,
        });

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        // La implementación incluye color: null debido a como Zod parsea valores opcionales
        expect(mockPrisma.organizationBrand.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { color: null, order: 5 },
        });
        expect(result.success).toBe(true);
      });

      it("should update both color and order", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");
        formData.set("color", "#FFFF00");
        formData.set("order", "3");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(mockOrganizationBrand);
        mockPrisma.organizationBrand.update.mockResolvedValue(mockOrganizationBrand);

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        expect(mockPrisma.organizationBrand.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { color: "#FFFF00", order: 3 },
        });
        expect(result.success).toBe(true);
      });
    });

    describe("❌ Error Handling", () => {
      it("should return error when user is not authenticated", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: "Not authenticated",
        });

        const formData = new FormData();
        formData.set("organizationBrandId", "1");

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Usuario no autenticado o sin organización.");
      });

      it("should handle validation errors", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);

        const formData = new FormData();
        formData.set("organizationBrandId", "invalid"); // Invalid ID
        formData.set("color", "invalid-color"); // Invalid color

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("Datos inválidos");
      });

      it("should return error when association not found", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "999");
        formData.set("color", "#FF0000");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(null);

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Asociación no encontrada o no pertenece a tu organización.");
        expect(mockPrisma.organizationBrand.update).not.toHaveBeenCalled();
      });

      it("should return error when association belongs to different organization", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");
        formData.set("color", "#FF0000");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          ...mockOrganizationBrand,
          organizationId: "different-org",
        });

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Asociación no encontrada o no pertenece a tu organización.");
        expect(mockPrisma.organizationBrand.update).not.toHaveBeenCalled();
      });

      it("should handle database errors", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");
        formData.set("color", "#FF0000");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(mockOrganizationBrand);
        const dbError = new Error("Update failed");
        mockPrisma.organizationBrand.update.mockRejectedValue(dbError);

        // Act
        const result = await updateOrganizationBrandAssociation(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error al actualizar la asociación.");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "🔥 ERROR SERVER ACTION (updateOrganizationBrandAssociation):",
          dbError,
        );
      });
    });
  });

  describe("🗑️ dissociateOrganizationBrand", () => {
    describe("✅ Successful Dissociation", () => {
      it("should dissociate brand successfully", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");

        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Mock the transaction implementation
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return await callback({
            organizationBrand: {
              findUnique: vi.fn().mockResolvedValue({
                organizationId: mockOrganizationId,
                brandId: 1,
              }),
              delete: vi.fn().mockResolvedValue(mockOrganizationBrand),
            },
            organizationModelConfig: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
          });
        });

        // Act
        const result = await dissociateOrganizationBrand(null, formData);

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
        expect(result.success).toBe(true);
      });
    });

    describe("❌ Error Handling", () => {
      it("should return error when user is not authenticated", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: "Not authenticated",
        });

        const formData = new FormData();
        formData.set("organizationBrandId", "1");

        // Act
        const result = await dissociateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Usuario no autenticado o sin organización.");
      });

      it("should handle validation errors", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);

        const formData = new FormData();
        formData.set("organizationBrandId", "invalid"); // Invalid ID

        // Act
        const result = await dissociateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("ID de asociación inválido.");
      });

      it("should return error when association not found", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "999");

        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Mock transaction that throws error for association not found
        mockPrisma.$transaction.mockRejectedValue(
          new Error("Asociación no encontrada o no pertenece a tu organización."),
        );

        // Act
        const result = await dissociateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Asociación no encontrada o no pertenece a tu organización.");
      });

      it("should return error when association belongs to different organization", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");

        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Mock transaction that throws error for different organization
        mockPrisma.$transaction.mockRejectedValue(
          new Error("Asociación no encontrada o no pertenece a tu organización."),
        );

        // Act
        const result = await dissociateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Asociación no encontrada o no pertenece a tu organización.");
      });

      it("should handle database errors", async () => {
        // Arrange
        const formData = new FormData();
        formData.set("organizationBrandId", "1");

        mockGetOrganization.mockResolvedValue(mockSessionData);
        const dbError = new Error("Transaction failed");
        mockPrisma.$transaction.mockRejectedValue(dbError);

        // Act
        const result = await dissociateOrganizationBrand(null, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error al desasociar la marca.");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "🔥 ERROR SERVER ACTION (dissociateOrganizationBrand):",
          dbError,
        );
      });
    });
  });

  describe("🔄 updateOrganizationBrandsOrder", () => {
    describe("✅ Successful Reordering", () => {
      it("should update brands order successfully", async () => {
        // Arrange
        const orderedAssociations = [
          { id: 3, order: 0 },
          { id: 1, order: 1 },
          { id: 2, order: 2 },
        ];

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
        mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

        // Act
        const result = await updateOrganizationBrandsOrder(null, orderedAssociations);

        // Assert
        expect(mockPrisma.organizationBrand.findMany).toHaveBeenCalledWith({
          where: {
            id: { in: [3, 1, 2] },
            organizationId: mockOrganizationId,
          },
          select: { id: true },
        });
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuracion");
        expect(result.success).toBe(true);
      });

      it("should handle empty array", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findMany.mockResolvedValue([]);
        mockPrisma.$transaction.mockResolvedValue([]);

        // Act
        const result = await updateOrganizationBrandsOrder(null, []);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe("❌ Error Handling", () => {
      it("should return error when user is not authenticated", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: "Not authenticated",
        });

        // Act
        const result = await updateOrganizationBrandsOrder(null, [{ id: 1, order: 0 }]);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Usuario no autenticado o sin organización.");
      });

      it("should handle validation errors", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);

        const invalidData = [
          { id: "invalid" as any, order: 0 }, // Invalid ID
        ];

        // Act
        const result = await updateOrganizationBrandsOrder(null, invalidData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("Datos de orden inválidos");
      });

      it("should return error when brands do not belong to organization", async () => {
        // Arrange
        const orderedAssociations = [
          { id: 1, order: 0 },
          { id: 2, order: 1 },
          { id: 999, order: 2 }, // This ID doesn't exist
        ];

        mockGetOrganization.mockResolvedValue(mockSessionData);
        // Only return 2 brands instead of 3
        mockPrisma.organizationBrand.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

        // Act
        const result = await updateOrganizationBrandsOrder(null, orderedAssociations);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error: Una o más asociaciones no pertenecen a tu organización.");
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it("should handle database transaction errors", async () => {
        // Arrange
        const orderedAssociations = [{ id: 1, order: 0 }];

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organizationBrand.findMany.mockResolvedValue([{ id: 1 }]);
        const dbError = new Error("Transaction failed");
        mockPrisma.$transaction.mockRejectedValue(dbError);

        // Act
        const result = await updateOrganizationBrandsOrder(null, orderedAssociations);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error al actualizar el orden de las marcas.");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "🔥 ERROR SERVER ACTION (updateOrganizationBrandsOrder):",
          dbError,
        );
      });
    });
  });

  describe("🔄 Cache Revalidation", () => {
    it("should revalidate correct path on all successful operations", async () => {
      const testCases = [
        // Test associateOrganizationBrand - calls '/configuracion'
        async () => {
          const formData = new FormData();
          formData.set("name", "test-brand");

          mockGetOrganization.mockResolvedValue(mockSessionData);
          mockPrisma.$transaction.mockImplementation(async (callback: any) => {
            return await callback({
              brand: {
                findUnique: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(mockBrand),
              },
              organizationBrand: {
                findUnique: vi.fn().mockResolvedValue(null),
                aggregate: vi.fn().mockResolvedValue({ _max: { order: 0 } }),
                create: vi.fn().mockResolvedValue(mockOrganizationBrand),
              },
            });
          });

          const result = await associateOrganizationBrand(null, formData);
          expect(mockRevalidatePath).toHaveBeenCalledWith("/configuracion");
          return result;
        },
        // Test updateOrganizationBrandAssociation - calls '/configuracion'
        async () => {
          const formData = new FormData();
          formData.set("organizationBrandId", "1");
          formData.set("color", "#FF0000");

          mockGetOrganization.mockResolvedValue(mockSessionData);
          mockPrisma.organizationBrand.findUnique.mockResolvedValue(mockOrganizationBrand);
          mockPrisma.organizationBrand.update.mockResolvedValue(mockOrganizationBrand);

          const result = await updateOrganizationBrandAssociation(null, formData);
          expect(mockRevalidatePath).toHaveBeenCalledWith("/configuracion");
          return result;
        },
        // Test dissociateOrganizationBrand - calls '/configuration' (note different path)
        async () => {
          const formData = new FormData();
          formData.set("organizationBrandId", "1");

          mockGetOrganization.mockResolvedValue(mockSessionData);

          // Mock the transaction implementation for dissociateOrganizationBrand
          mockPrisma.$transaction.mockImplementation(async (callback: any) => {
            return await callback({
              organizationBrand: {
                findUnique: vi.fn().mockResolvedValue({
                  organizationId: mockOrganizationId,
                  brandId: 1,
                }),
                delete: vi.fn().mockResolvedValue(mockOrganizationBrand),
              },
              organizationModelConfig: {
                deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              },
            });
          });

          const result = await dissociateOrganizationBrand(null, formData);
          expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
          return result;
        },
        // Test updateOrganizationBrandsOrder - calls '/configuracion'
        async () => {
          mockGetOrganization.mockResolvedValue(mockSessionData);
          mockPrisma.organizationBrand.findMany.mockResolvedValue([{ id: 1 }]);
          mockPrisma.$transaction.mockResolvedValue([{}]);

          const result = await updateOrganizationBrandsOrder(null, [{ id: 1, order: 0 }]);
          expect(mockRevalidatePath).toHaveBeenCalledWith("/configuracion");
          return result;
        },
      ];

      // Act & Assert - Each test case checks its own revalidation
      for (const testCase of testCases) {
        vi.clearAllMocks();
        await testCase();
      }
    });

    it("should not revalidate on errors", async () => {
      // Test authentication error
      mockGetOrganization.mockResolvedValue({
        organizationId: null,
        error: "Not authenticated",
      });

      const formData = new FormData();
      formData.set("name", "test");

      await associateOrganizationBrand(null, formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();

      // Test validation error
      vi.clearAllMocks();
      mockGetOrganization.mockResolvedValue(mockSessionData);

      const invalidFormData = new FormData();
      invalidFormData.set("name", ""); // Invalid

      await associateOrganizationBrand(null, invalidFormData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("🎯 Edge Cases", () => {
    describe("Brand Name Normalization", () => {
      it("should handle various name formats", async () => {
        // Arrange
        const testCases = [
          { input: "toyota", expected: "Toyota" },
          { input: "HONDA", expected: "Honda" },
          { input: "mErCeDeS", expected: "Mercedes" },
          { input: "bmw", expected: "Bmw" },
        ];

        mockGetOrganization.mockResolvedValue(mockSessionData);

        for (const testCase of testCases) {
          const formData = new FormData();
          formData.set("name", testCase.input);

          mockPrisma.$transaction.mockImplementation(async (callback: any) => {
            const mockTx = {
              brand: {
                findUnique: vi.fn().mockImplementation((args: any) => {
                  // Verify the query uses normalized name
                  expect(args.where.name).toBe(testCase.expected);
                  return null;
                }),
                create: vi.fn().mockResolvedValue({ ...mockBrand, name: testCase.expected }),
              },
              organizationBrand: {
                findUnique: vi.fn().mockResolvedValue(null),
                aggregate: vi.fn().mockResolvedValue({ _max: { order: 0 } }),
                create: vi.fn().mockResolvedValue(mockOrganizationBrand),
              },
            };
            return await callback(mockTx);
          });

          // Act
          const result = await associateOrganizationBrand(null, formData);

          // Assert
          expect(result.success).toBe(true);
          expect(result.message).toContain(testCase.expected);

          vi.clearAllMocks();
        }
      });
    });

    describe("Order Calculation", () => {
      it("should handle various max order scenarios", async () => {
        // Arrange
        const testCases = [
          { maxOrder: null, expectedNext: 0 },
          { maxOrder: 0, expectedNext: 1 },
          { maxOrder: 5, expectedNext: 6 },
          { maxOrder: 999, expectedNext: 1000 },
        ];

        mockGetOrganization.mockResolvedValue(mockSessionData);

        for (const testCase of testCases) {
          const formData = new FormData();
          formData.set("name", "test-brand");

          const mockCreate = vi.fn().mockResolvedValue(mockOrganizationBrand);
          mockPrisma.$transaction.mockImplementation(async (callback: any) => {
            const mockTx = {
              brand: {
                findUnique: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(mockBrand),
              },
              organizationBrand: {
                findUnique: vi.fn().mockResolvedValue(null),
                aggregate: vi.fn().mockResolvedValue({ _max: { order: testCase.maxOrder } }),
                create: mockCreate,
              },
            };
            return await callback(mockTx);
          });

          // Act
          await associateOrganizationBrand(null, formData);

          // Assert
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              order: testCase.expectedNext,
            }),
          });

          vi.clearAllMocks();
        }
      });
    });

    describe("Color Handling", () => {
      it("should handle various color formats", async () => {
        // Arrange
        const validColors = ["#FF0000", "#00FF00", "#0000FF", "#ABCDEF"];

        mockGetOrganization.mockResolvedValue(mockSessionData);

        for (const color of validColors) {
          const formData = new FormData();
          formData.set("name", "test-brand");
          formData.set("color", color);

          const mockCreate = vi.fn().mockResolvedValue(mockOrganizationBrand);
          mockPrisma.$transaction.mockImplementation(async (callback: any) => {
            const mockTx = {
              brand: {
                findUnique: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(mockBrand),
              },
              organizationBrand: {
                findUnique: vi.fn().mockResolvedValue(null),
                aggregate: vi.fn().mockResolvedValue({ _max: { order: 0 } }),
                create: mockCreate,
              },
            };
            return await callback(mockTx);
          });

          // Act
          const result = await associateOrganizationBrand(null, formData);

          // Assert
          expect(result.success).toBe(true);
          expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
              color: color,
            }),
          });

          vi.clearAllMocks();
        }
      });
    });
  });

  describe("📊 Console Logging", () => {
    it("should log errors during database operations", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("name", "test-brand");

      mockGetOrganization.mockResolvedValue(mockSessionData);
      const dbError = new Error("Database connection failed");
      mockPrisma.$transaction.mockRejectedValue(dbError);

      // Act
      await associateOrganizationBrand(null, formData);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        "🔥 ERROR SERVER ACTION (associateOrganizationBrand):",
        dbError,
      );
    });

    it("should log errors in update operations", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("organizationBrandId", "1");
      formData.set("color", "#FF0000");

      mockGetOrganization.mockResolvedValue(mockSessionData);
      mockPrisma.organizationBrand.findUnique.mockResolvedValue(mockOrganizationBrand);
      const updateError = new Error("Update operation failed");
      mockPrisma.organizationBrand.update.mockRejectedValue(updateError);

      // Act
      await updateOrganizationBrandAssociation(null, formData);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        "🔥 ERROR SERVER ACTION (updateOrganizationBrandAssociation):",
        updateError,
      );
    });
  });
});

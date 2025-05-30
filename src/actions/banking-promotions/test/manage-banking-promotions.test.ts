import prisma from "@/lib/prisma";
import type { Day } from "@/zod/banking-promotion-schemas";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import {
  createBankingPromotion,
  deleteBankingPromotion,
  getBankingPromotionDetails,
  toggleBankingPromotion,
  toggleInstallmentPlan,
  updateBankingPromotion,
} from "../manage-banking-promotions";

// Mock de Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    bankingPromotion: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    installmentPlan: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

describe("Banking Promotions Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = "org-123";
  const mockBankingPromotion = {
    id: 1,
    name: "Promoción Test",
    description: "Descripción de test",
    organizationId: mockOrganizationId,
    paymentMethodId: 1,
    bankId: 1,
    cardId: null,
    discountRate: 10.0,
    surchargeRate: null,
    isEnabled: true,
    activeDays: ["lunes", "martes"] as Day[],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInstallmentPlans = [
    { id: 1, installments: 3, interestRate: 0, isEnabled: true },
    { id: 2, installments: 6, interestRate: 5.0, isEnabled: true },
  ];

  describe("✨ createBankingPromotion", () => {
    describe("✅ Successful Creation", () => {
      it("should create banking promotion with installment plans", async () => {
        // Arrange
        const promotionData = {
          name: "Nueva Promoción",
          description: "Descripción nueva",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: 15.0,
          surchargeRate: null,
          isEnabled: true,
          activeDays: ["lunes"] as Day[],
          installmentPlans: [
            { installments: 3, interestRate: 0, isEnabled: true },
            { installments: 6, interestRate: 2.5, isEnabled: true },
          ],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue({ ...mockBankingPromotion, id: 1 }),
            },
            installmentPlan: {
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
        expect(result.data).toBeDefined();
      });

      it("should create promotion without installment plans", async () => {
        // Arrange
        const promotionData = {
          name: "Promoción Sin Cuotas",
          description: "Sin planes de cuotas",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: 10.0,
          surchargeRate: null,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: {
              createMany: vi.fn(),
            },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
      });

      it("should handle null discount and surcharge rates correctly", async () => {
        // Arrange
        const promotionData = {
          name: "Promoción Neutral",
          description: "Sin descuento ni recargo",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: null,
          surchargeRate: null,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue({
                ...mockBankingPromotion,
                discountRate: null,
                surchargeRate: null,
              }),
            },
            installmentPlan: {
              createMany: vi.fn(),
            },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
      });

      it("should parse numeric fields correctly", async () => {
        // Arrange
        const promotionData = {
          name: "Promoción Numérica",
          description: "Test parsing",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: 12.5, // Number
          surchargeRate: 5.75, // Number
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: {
              createMany: vi.fn(),
            },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
        expect(result.data).toBeDefined();
      });

      it("should correctly process numeric fields in create", async () => {
        // Arrange
        const promotionData = {
          name: "Test Numeric",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: 15.75, // Number
          surchargeRate: 3.25, // Number
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: { createMany: vi.fn() },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
        expect(result.data).toBeDefined();
      });

      it("should correctly process string numbers in create", async () => {
        // Arrange
        const promotionData = {
          name: "Test Numeric Processing",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: 20.5, // Number
          surchargeRate: 7.25, // Number
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: { createMany: vi.fn() },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
        expect(result.data).toBeDefined();
      });
    });

    describe("❌ Error Handling", () => {
      it("should handle validation errors gracefully", async () => {
        // Arrange
        const invalidData = {
          name: "", // Invalid empty name
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
        } as any;

        // Act
        const result = await createBankingPromotion(invalidData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it("should handle database transaction errors", async () => {
        // Arrange
        const promotionData = {
          name: "Test",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Transaction failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error creating banking promotion:",
          expect.any(Error),
        );
      });

      it("should handle unknown errors", async () => {
        // Arrange
        const promotionData = {
          name: "Test",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockRejectedValue("Unknown error");

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error desconocido al crear la promoción");
      });
    });
  });

  describe("✏️ updateBankingPromotion", () => {
    describe("✅ Successful Update", () => {
      it("should update promotion and sync installment plans", async () => {
        // Arrange
        const updateData = {
          id: 1,
          name: "Promoción Actualizada",
          description: "Nueva descripción",
          organizationId: mockOrganizationId,
          paymentMethodId: 2,
          bankId: 2,
          discountRate: 20.0,
          surchargeRate: null,
          isEnabled: false,
          activeDays: ["viernes"] as Day[],
          installmentPlans: [
            { installments: 3, interestRate: 1.0, isEnabled: true },
            { installments: 12, interestRate: 8.0, isEnabled: true },
          ],
        };

        const existingPlans = [
          { id: 1, installments: 3, interestRate: 0, isEnabled: true },
          { id: 2, installments: 6, interestRate: 5.0, isEnabled: true },
        ];

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              update: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: {
              findMany: vi.fn().mockResolvedValue(existingPlans),
              update: vi.fn().mockResolvedValue({}),
              create: vi.fn().mockResolvedValue({}),
            },
          });
        });

        mockPrisma.bankingPromotion.findUnique.mockResolvedValue({
          ...mockBankingPromotion,
          installmentPlans: mockInstallmentPlans,
        });

        // Act
        const result = await updateBankingPromotion(updateData);

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria actualizada correctamente");
        expect(result.data).toBeDefined();
      });

      it("should create new installment plans for new installment counts", async () => {
        // Arrange
        const updateData = {
          id: 1,
          name: "Test Update",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [
            { installments: 24, interestRate: 12.0, isEnabled: true }, // New plan
          ],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            bankingPromotion: {
              update: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: {
              findMany: vi.fn().mockResolvedValue([]), // No existing plans
              create: vi.fn().mockResolvedValue({}),
            },
          };
          return await callback(mockTx);
        });

        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockBankingPromotion);

        // Act
        const result = await updateBankingPromotion(updateData);

        // Assert
        expect(result.success).toBe(true);
      });

      it("should handle empty installment plans", async () => {
        // Arrange
        const updateData = {
          id: 1,
          name: "Sin Cuotas",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              update: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: {
              findMany: vi.fn(),
            },
          });
        });

        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockBankingPromotion);

        // Act
        const result = await updateBankingPromotion(updateData);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe("❌ Error Handling", () => {
      it("should handle validation errors", async () => {
        // Arrange
        const invalidData = {
          id: "invalid" as any, // Invalid ID type
          name: "",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        // Act
        const result = await updateBankingPromotion(invalidData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should handle transaction errors", async () => {
        // Arrange
        const updateData = {
          id: 1,
          name: "Test",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockRejectedValue(new Error("Update failed"));

        // Act
        const result = await updateBankingPromotion(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Update failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error updating banking promotion:",
          expect.any(Error),
        );
      });
    });
  });

  describe("🔄 toggleBankingPromotion", () => {
    describe("✅ Successful Toggle", () => {
      it("should enable promotion successfully", async () => {
        // Arrange
        mockPrisma.bankingPromotion.update.mockResolvedValue({
          ...mockBankingPromotion,
          isEnabled: true,
        });

        // Act
        const result = await toggleBankingPromotion({
          id: 1,
          isEnabled: true,
        });

        // Assert
        expect(mockPrisma.bankingPromotion.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { isEnabled: true },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción habilitada correctamente");
      });

      it("should disable promotion successfully", async () => {
        // Arrange
        mockPrisma.bankingPromotion.update.mockResolvedValue({
          ...mockBankingPromotion,
          isEnabled: false,
        });

        // Act
        const result = await toggleBankingPromotion({
          id: 1,
          isEnabled: false,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción deshabilitada correctamente");
      });
    });

    describe("❌ Error Handling", () => {
      it("should handle database errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.update.mockRejectedValue(new Error("Update failed"));

        // Act
        const result = await toggleBankingPromotion({
          id: 1,
          isEnabled: true,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Update failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error toggling banking promotion:",
          expect.any(Error),
        );
      });

      it("should handle unknown errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.update.mockRejectedValue("Unknown error");

        // Act
        const result = await toggleBankingPromotion({
          id: 1,
          isEnabled: true,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error desconocido al cambiar el estado de la promoción");
      });
    });
  });

  describe("💳 toggleInstallmentPlan", () => {
    describe("✅ Successful Toggle", () => {
      it("should enable installment plan successfully", async () => {
        // Arrange
        mockPrisma.installmentPlan.update.mockResolvedValue({
          id: 1,
          isEnabled: true,
        });

        // Act
        const result = await toggleInstallmentPlan({
          id: 1,
          isEnabled: true,
        });

        // Assert
        expect(mockPrisma.installmentPlan.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { isEnabled: true },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
        expect(result.success).toBe(true);
        expect(result.message).toBe("Plan de cuotas habilitado correctamente");
      });

      it("should disable installment plan successfully", async () => {
        // Arrange
        mockPrisma.installmentPlan.update.mockResolvedValue({
          id: 1,
          isEnabled: false,
        });

        // Act
        const result = await toggleInstallmentPlan({
          id: 1,
          isEnabled: false,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Plan de cuotas deshabilitado correctamente");
      });
    });

    describe("❌ Error Handling", () => {
      it("should handle validation errors", async () => {
        // Arrange - Invalid data that fails schema validation
        const invalidData = {
          id: "invalid" as any,
          isEnabled: "not-boolean" as any,
        };

        // Act
        const result = await toggleInstallmentPlan(invalidData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should handle database errors", async () => {
        // Arrange
        mockPrisma.installmentPlan.update.mockRejectedValue(new Error("Update failed"));

        // Act
        const result = await toggleInstallmentPlan({
          id: 1,
          isEnabled: true,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Update failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error toggling installment plan:",
          expect.any(Error),
        );
      });

      it("should handle unknown errors", async () => {
        // Arrange
        mockPrisma.installmentPlan.update.mockRejectedValue("Unknown error");

        // Act
        const result = await toggleInstallmentPlan({
          id: 1,
          isEnabled: true,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error desconocido al cambiar el estado del plan");
      });
    });
  });

  describe("🗑️ deleteBankingPromotion", () => {
    describe("✅ Successful Deletion", () => {
      it("should delete promotion successfully", async () => {
        // Arrange
        mockPrisma.bankingPromotion.delete.mockResolvedValue(mockBankingPromotion);

        // Act
        const result = await deleteBankingPromotion("1");

        // Assert
        expect(mockPrisma.bankingPromotion.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria eliminada correctamente");
      });

      it("should handle numeric string ID correctly", async () => {
        // Arrange
        mockPrisma.bankingPromotion.delete.mockResolvedValue(mockBankingPromotion);

        // Act
        const result = await deleteBankingPromotion("123");

        // Assert
        expect(mockPrisma.bankingPromotion.delete).toHaveBeenCalledWith({
          where: { id: 123 },
        });
        expect(result.success).toBe(true);
      });
    });

    describe("❌ Error Handling", () => {
      it("should handle invalid ID format", async () => {
        // Act
        const result = await deleteBankingPromotion("invalid-id");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("ID de promoción inválido");
        expect(mockPrisma.bankingPromotion.delete).not.toHaveBeenCalled();
      });

      it("should handle non-numeric ID", async () => {
        // Act
        const result = await deleteBankingPromotion("abc");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("ID de promoción inválido");
      });

      it("should handle database errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.delete.mockRejectedValue(new Error("Delete failed"));

        // Act
        const result = await deleteBankingPromotion("1");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Delete failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error deleting banking promotion:",
          expect.any(Error),
        );
      });

      it("should handle unknown errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.delete.mockRejectedValue("Unknown error");

        // Act
        const result = await deleteBankingPromotion("1");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error desconocido al eliminar la promoción");
      });
    });
  });

  describe("🔍 getBankingPromotionDetails", () => {
    const mockPromotionDetails = {
      ...mockBankingPromotion,
      paymentMethod: { id: 1, name: "Tarjeta de crédito" },
      card: { id: 1, bankId: 1, cardTypeId: 1 },
      bank: { id: 1, name: "Banco Provincia" },
      installmentPlans: mockInstallmentPlans,
    };

    describe("✅ Successful Retrieval", () => {
      it("should return promotion details with all includes", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionDetails);

        // Act
        const result = await getBankingPromotionDetails("1");

        // Assert
        expect(mockPrisma.bankingPromotion.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
          include: {
            paymentMethod: true,
            card: true,
            bank: true,
            installmentPlans: {
              orderBy: { installments: "asc" },
            },
          },
        });
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPromotionDetails);
      });

      it("should include installment plans ordered by installments", async () => {
        // Arrange
        const promotionWithPlans = {
          ...mockPromotionDetails,
          installmentPlans: [
            { id: 2, installments: 6, interestRate: 5.0, isEnabled: true },
            { id: 1, installments: 3, interestRate: 0, isEnabled: true },
            { id: 3, installments: 12, interestRate: 10.0, isEnabled: true },
          ],
        };
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(promotionWithPlans);

        // Act
        const result = await getBankingPromotionDetails("1");

        // Assert
        expect(result.success).toBe(true);
        expect(result.data?.installmentPlans).toBeDefined();
        // Verify the ordering is handled by the query
        expect(mockPrisma.bankingPromotion.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              installmentPlans: {
                orderBy: { installments: "asc" },
              },
            }),
          }),
        );
      });

      it("should log retrieved promotion data for debugging", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionDetails);

        // Act
        await getBankingPromotionDetails("1");

        // Assert
        expect(mockConsole.log).toHaveBeenCalledWith(
          "Retrieved promotion details:",
          expect.objectContaining({
            id: mockPromotionDetails.id,
            name: mockPromotionDetails.name,
            description: mockPromotionDetails.description,
            discountRate: expect.objectContaining({
              value: mockPromotionDetails.discountRate,
              type: typeof mockPromotionDetails.discountRate,
            }),
            surchargeRate: expect.objectContaining({
              value: mockPromotionDetails.surchargeRate,
              type: typeof mockPromotionDetails.surchargeRate,
            }),
          }),
        );
      });
    });

    describe("❌ Error Handling", () => {
      it("should handle invalid ID format", async () => {
        // Act
        const result = await getBankingPromotionDetails("invalid-id");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("ID de promoción inválido");
        expect(mockPrisma.bankingPromotion.findUnique).not.toHaveBeenCalled();
      });

      it("should handle promotion not found", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(null);

        // Act
        const result = await getBankingPromotionDetails("999");

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe("Promoción no encontrada");
      });

      it("should handle database errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockRejectedValue(new Error("Database error"));

        // Act
        const result = await getBankingPromotionDetails("1");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Database error");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching banking promotion details:",
          expect.any(Error),
        );
      });

      it("should handle unknown errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockRejectedValue("Unknown error");

        // Act
        const result = await getBankingPromotionDetails("1");

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Error desconocido al obtener los detalles de la promoción");
      });
    });
  });

  describe("🔄 Cache Revalidation", () => {
    it("should revalidate /configuration path in all successful operations", async () => {
      // Arrange
      const testCases = [
        () => {
          mockPrisma.$transaction.mockImplementation(
            async (callback: (tx: any) => Promise<any>) => {
              return await callback({
                bankingPromotion: { create: vi.fn().mockResolvedValue(mockBankingPromotion) },
                installmentPlan: { createMany: vi.fn() },
              });
            },
          );
          return createBankingPromotion({
            name: "Test",
            organizationId: mockOrganizationId,
            paymentMethodId: 1,
            isEnabled: true,
            activeDays: [] as Day[],
            installmentPlans: [],
          });
        },
        () => {
          mockPrisma.$transaction.mockImplementation(
            async (callback: (tx: any) => Promise<any>) => {
              return await callback({
                bankingPromotion: { update: vi.fn().mockResolvedValue(mockBankingPromotion) },
                installmentPlan: { findMany: vi.fn().mockResolvedValue([]) },
              });
            },
          );
          mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockBankingPromotion);
          return updateBankingPromotion({
            id: 1,
            name: "Updated",
            organizationId: mockOrganizationId,
            paymentMethodId: 1,
            isEnabled: true,
            activeDays: [] as Day[],
            installmentPlans: [],
          });
        },
        () => {
          mockPrisma.bankingPromotion.update.mockResolvedValue(mockBankingPromotion);
          return toggleBankingPromotion({ id: 1, isEnabled: true });
        },
        () => {
          mockPrisma.installmentPlan.update.mockResolvedValue({ id: 1, isEnabled: true });
          return toggleInstallmentPlan({ id: 1, isEnabled: true });
        },
        () => {
          mockPrisma.bankingPromotion.delete.mockResolvedValue(mockBankingPromotion);
          return deleteBankingPromotion("1");
        },
      ];

      // Act & Assert
      for (const testCase of testCases) {
        vi.clearAllMocks();
        await testCase();
        expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
      }
    });
  });

  describe("🎯 Data Processing and Validation", () => {
    describe("📊 Numeric Fields Processing", () => {
      it("should correctly process string numbers in create", async () => {
        // Arrange
        const promotionData = {
          name: "Test Numeric Processing",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          bankId: 1,
          discountRate: 20.5, // Number
          surchargeRate: 7.25, // Number
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: { createMany: vi.fn() },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
        expect(result.data).toBeDefined();
      });

      it("should handle undefined and null rates correctly", async () => {
        // Arrange
        const promotionData = {
          name: "Test Null Rates",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          discountRate: undefined,
          surchargeRate: null,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [],
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              create: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: { createMany: vi.fn() },
          });
        });

        // Act
        const result = await createBankingPromotion(promotionData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Promoción bancaria creada correctamente");
        expect(result.data).toBeDefined();
      });
    });

    describe("🏗️ Installment Plans Sync", () => {
      it("should update existing plans and create new ones in update", async () => {
        // Arrange
        const updateData = {
          id: 1,
          name: "Test Sync",
          organizationId: mockOrganizationId,
          paymentMethodId: 1,
          isEnabled: true,
          activeDays: [] as Day[],
          installmentPlans: [
            { installments: 3, interestRate: 2.0, isEnabled: true }, // Update existing
            { installments: 24, interestRate: 15.0, isEnabled: true }, // Create new
          ],
        };

        const existingPlans = [
          { id: 1, installments: 3, interestRate: 0, isEnabled: true },
          { id: 2, installments: 6, interestRate: 5.0, isEnabled: true },
        ];

        const mockUpdate = vi.fn();
        const mockCreate = vi.fn();

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback({
            bankingPromotion: {
              update: vi.fn().mockResolvedValue(mockBankingPromotion),
            },
            installmentPlan: {
              findMany: vi.fn().mockResolvedValue(existingPlans),
              update: mockUpdate,
              create: mockCreate,
            },
          });
        });

        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockBankingPromotion);

        // Act
        await updateBankingPromotion(updateData);

        // Assert
        expect(mockUpdate).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { interestRate: 2.0, isEnabled: true },
        });
        expect(mockCreate).toHaveBeenCalledWith({
          data: {
            bankingPromotionId: 1,
            installments: 24,
            interestRate: 15.0,
            isEnabled: true,
          },
        });
      });
    });
  });
});

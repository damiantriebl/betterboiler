import prisma from "@/lib/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllPaymentMethods,
  getAvailablePaymentMethods,
  getOrganizationPaymentMethods,
} from "../get-payment-methods";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    paymentMethod: {
      findMany: vi.fn(),
    },
    organizationPaymentMethod: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockPrisma = prisma as any;

describe("Payment Methods Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPaymentMethods = [
    {
      id: 1,
      name: "Efectivo",
      type: "cash",
      description: "Pago en efectivo",
      iconUrl: "/icons/payment-methods/cash.svg",
    },
    {
      id: 2,
      name: "Tarjeta de Crédito",
      type: "credit",
      description: "Pago con tarjeta de crédito",
      iconUrl: "/icons/payment-methods/credit-card.svg",
    },
    {
      id: 3,
      name: "Transferencia Bancaria",
      type: "transfer",
      description: "Pago por transferencia bancaria",
      iconUrl: "/icons/payment-methods/bank-transfer.svg",
    },
  ];

  const mockOrganizationPaymentMethods = [
    {
      id: 1,
      organizationId: "org-123",
      methodId: 1,
      order: 0,
      isEnabled: true,
      method: {
        id: 1,
        name: "Efectivo",
        type: "cash",
        description: "Pago en efectivo",
        iconUrl: "/icons/payment-methods/cash.svg",
      },
    },
    {
      id: 2,
      organizationId: "org-123",
      methodId: 2,
      order: 1,
      isEnabled: false,
      method: {
        id: 2,
        name: "Tarjeta de Crédito",
        type: "credit",
        description: "Pago con tarjeta de crédito",
        iconUrl: "/icons/payment-methods/credit-card.svg",
      },
    },
  ];

  describe("🔍 getAllPaymentMethods", () => {
    describe("✅ Successful Retrieval", () => {
      it("should return all payment methods ordered by name", async () => {
        // Arrange
        mockPrisma.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

        // Act
        const result = await getAllPaymentMethods();

        // Assert
        expect(mockPrisma.paymentMethod.findMany).toHaveBeenCalledWith({
          orderBy: { name: "asc" },
        });
        expect(result).toEqual(mockPaymentMethods);
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe("Efectivo");
      });

      it("should handle empty payment methods list", async () => {
        // Arrange
        mockPrisma.paymentMethod.findMany.mockResolvedValue([]);

        // Act
        const result = await getAllPaymentMethods();

        // Assert
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });

      it("should return payment methods with all required fields", async () => {
        // Arrange
        mockPrisma.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

        // Act
        const result = await getAllPaymentMethods();

        // Assert
        for (const method of result) {
          expect(method).toHaveProperty("id");
          expect(method).toHaveProperty("name");
          expect(method).toHaveProperty("type");
          expect(method).toHaveProperty("description");
          expect(method).toHaveProperty("iconUrl");
          expect(typeof method.id).toBe("number");
          expect(typeof method.name).toBe("string");
          expect(typeof method.type).toBe("string");
        }
      });
    });

    describe("❌ Error Handling", () => {
      it("should return default payment methods when database error occurs", async () => {
        // Arrange
        const dbError = new Error("Database connection failed");
        mockPrisma.paymentMethod.findMany.mockRejectedValue(dbError);

        // Act
        const result = await getAllPaymentMethods();

        // Assert
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching payment methods, using defaults:",
          dbError,
        );
        expect(result).toHaveLength(7); // Default methods count
        expect(result[0].name).toBe("Efectivo");
        expect(result[1].name).toBe("Tarjeta de Crédito");
      });

      it("should handle unknown database errors", async () => {
        // Arrange
        const unknownError = "Unknown error";
        mockPrisma.paymentMethod.findMany.mockRejectedValue(unknownError);

        // Act
        const result = await getAllPaymentMethods();

        // Assert
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching payment methods, using defaults:",
          unknownError,
        );
        expect(result).toHaveLength(7);
      });

      it("should return default methods with correct structure", async () => {
        // Arrange
        mockPrisma.paymentMethod.findMany.mockRejectedValue(new Error("DB Error"));

        // Act
        const result = await getAllPaymentMethods();

        // Assert
        expect(result).toContainEqual({
          id: 1,
          name: "Efectivo",
          type: "cash",
          description: "Pago en efectivo",
          iconUrl: "/icons/payment-methods/cash.svg",
        });
        expect(result).toContainEqual({
          id: 7,
          name: "Código QR",
          type: "qr",
          description: "Pago mediante escaneo de código QR",
          iconUrl: "/icons/payment-methods/qr-code.svg",
        });
      });
    });
  });

  describe("🏢 getOrganizationPaymentMethods", () => {
    describe("✅ Successful Retrieval", () => {
      it("should return organization payment methods with correct format", async () => {
        // Arrange
        const organizationId = "org-123";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(
          mockOrganizationPaymentMethods,
        );

        // Act
        const result = await getOrganizationPaymentMethods(organizationId);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.findMany).toHaveBeenCalledWith({
          where: { organizationId },
          orderBy: { order: "asc" },
          include: {
            method: true,
          },
        });
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: 1,
          order: 0,
          isEnabled: true,
          card: {
            id: 1,
            name: "Efectivo",
            type: "cash",
            description: "Pago en efectivo",
            iconUrl: "/icons/payment-methods/cash.svg",
          },
        });
      });

      it("should handle organization with no payment methods", async () => {
        // Arrange
        const organizationId = "org-empty";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);

        // Act
        const result = await getOrganizationPaymentMethods(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });

      it("should preserve order from database", async () => {
        // Arrange
        const organizationId = "org-123";
        const unorderedMethods = [
          { ...mockOrganizationPaymentMethods[1], order: 2 },
          { ...mockOrganizationPaymentMethods[0], order: 1 },
        ];
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(unorderedMethods);

        // Act
        const result = await getOrganizationPaymentMethods(organizationId);

        // Assert
        expect(result[0].order).toBe(2);
        expect(result[1].order).toBe(1);
        expect(mockPrisma.organizationPaymentMethod.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { order: "asc" },
          }),
        );
      });

      it("should handle methods with different enabled states", async () => {
        // Arrange
        const organizationId = "org-123";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(
          mockOrganizationPaymentMethods,
        );

        // Act
        const result = await getOrganizationPaymentMethods(organizationId);

        // Assert
        expect(result[0].isEnabled).toBe(true);
        expect(result[1].isEnabled).toBe(false);
      });
    });

    describe("❌ Error Handling", () => {
      it("should return empty array when database error occurs", async () => {
        // Arrange
        const organizationId = "org-123";
        const dbError = new Error("Database connection failed");
        mockPrisma.organizationPaymentMethod.findMany.mockRejectedValue(dbError);

        // Act
        const result = await getOrganizationPaymentMethods(organizationId);

        // Assert
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching organization payment methods:",
          dbError,
        );
        expect(result).toEqual([]);
      });

      it("should handle unknown errors gracefully", async () => {
        // Arrange
        const organizationId = "org-123";
        const unknownError = "Unknown error";
        mockPrisma.organizationPaymentMethod.findMany.mockRejectedValue(unknownError);

        // Act
        const result = await getOrganizationPaymentMethods(organizationId);

        // Assert
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching organization payment methods:",
          unknownError,
        );
        expect(result).toEqual([]);
      });
    });
  });

  describe("📋 getAvailablePaymentMethods", () => {
    describe("✅ Successful Retrieval", () => {
      it("should return methods not associated with organization", async () => {
        // Arrange
        const organizationId = "org-123";
        const existingMethodIds = [{ methodId: 1 }, { methodId: 2 }];
        const availableMethods = [mockPaymentMethods[2]]; // Only method with id 3

        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(existingMethodIds);
        mockPrisma.paymentMethod.findMany.mockResolvedValue(availableMethods);

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.findMany).toHaveBeenCalledWith({
          where: { organizationId },
          select: { methodId: true },
        });
        expect(mockPrisma.paymentMethod.findMany).toHaveBeenCalledWith({
          where: {
            id: {
              notIn: [1, 2],
            },
          },
          orderBy: { name: "asc" },
        });
        expect(result).toEqual(availableMethods);
      });

      it("should handle organization with no existing methods", async () => {
        // Arrange
        const organizationId = "org-new";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);
        mockPrisma.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(mockPrisma.paymentMethod.findMany).toHaveBeenCalledWith({
          where: {
            id: {
              notIn: [-1], // Should use [-1] when array is empty
            },
          },
          orderBy: { name: "asc" },
        });
        expect(result).toEqual(mockPaymentMethods);
      });

      it("should return all methods when organization has no associations", async () => {
        // Arrange
        const organizationId = "org-empty";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);
        mockPrisma.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(result).toEqual(mockPaymentMethods);
        expect(result).toHaveLength(3);
      });

      it("should return empty array when all methods are already associated", async () => {
        // Arrange
        const organizationId = "org-full";
        const allMethodIds = mockPaymentMethods.map((method) => ({ methodId: method.id }));
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(allMethodIds);
        mockPrisma.paymentMethod.findMany.mockResolvedValue([]);

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(result).toEqual([]);
      });

      it("should order available methods by name", async () => {
        // Arrange
        const organizationId = "org-123";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);
        mockPrisma.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

        // Act
        await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(mockPrisma.paymentMethod.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { name: "asc" },
          }),
        );
      });
    });

    describe("❌ Error Handling", () => {
      it("should return default methods when database error occurs", async () => {
        // Arrange
        const organizationId = "org-123";
        const dbError = new Error("Database connection failed");
        mockPrisma.organizationPaymentMethod.findMany.mockRejectedValue(dbError);

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching available payment methods, using defaults:",
          dbError,
        );
        expect(result).toHaveLength(7); // Default methods
      });

      it("should handle error in second query", async () => {
        // Arrange
        const organizationId = "org-123";
        mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);
        mockPrisma.paymentMethod.findMany.mockRejectedValue(new Error("Query failed"));

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(result).toHaveLength(7); // Should return defaults
      });

      it("should handle unknown errors gracefully", async () => {
        // Arrange
        const organizationId = "org-123";
        const unknownError = "Unknown error";
        mockPrisma.organizationPaymentMethod.findMany.mockRejectedValue(unknownError);

        // Act
        const result = await getAvailablePaymentMethods(organizationId);

        // Assert
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error fetching available payment methods, using defaults:",
          unknownError,
        );
        expect(result).toHaveLength(7);
      });
    });
  });

  describe("🎯 Edge Cases and Data Validation", () => {
    it("should handle special characters in organizationId", async () => {
      // Arrange
      const organizationId = "org-123-special@#$";
      mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);

      // Act
      const result = await getOrganizationPaymentMethods(organizationId);

      // Assert
      expect(mockPrisma.organizationPaymentMethod.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-123-special@#$" },
        orderBy: { order: "asc" },
        include: { method: true },
      });
      expect(result).toEqual([]);
    });

    it("should handle very long organizationId", async () => {
      // Arrange
      const organizationId = "a".repeat(1000);
      mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue([]);

      // Act
      const result = await getOrganizationPaymentMethods(organizationId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle payment methods with null/undefined fields", async () => {
      // Arrange
      const methodsWithNulls = [
        {
          id: 1,
          organizationId: "org-123",
          methodId: 1,
          order: 0,
          isEnabled: true,
          method: {
            id: 1,
            name: "Efectivo",
            type: "cash",
            description: null,
            iconUrl: null,
          },
        },
      ];
      mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(methodsWithNulls);

      // Act
      const result = await getOrganizationPaymentMethods("org-123");

      // Assert
      expect(result[0].card.description).toBeNull();
      expect(result[0].card.iconUrl).toBeNull();
    });

    it("should handle large datasets efficiently", async () => {
      // Arrange
      const organizationId = "org-big";
      const largeMethods = Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        organizationId,
        methodId: index + 1,
        order: index,
        isEnabled: index % 2 === 0,
        method: {
          id: index + 1,
          name: `Method ${index + 1}`,
          type: "custom",
          description: `Description ${index + 1}`,
          iconUrl: `/icon-${index + 1}.svg`,
        },
      }));
      mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(largeMethods);

      // Act
      const result = await getOrganizationPaymentMethods(organizationId);

      // Assert
      expect(result).toHaveLength(100);
      expect(result[0].order).toBe(0);
      expect(result[99].order).toBe(99);
    });
  });
});

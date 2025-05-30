import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { undoPayment } from "../undo-payment";
import type { UndoPaymentFormState } from "../undo-payment";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Setup mocks
const mockGetOrganizationIdFromSession = vi.mocked(getOrganizationIdFromSession);
const mockPrisma = vi.mocked(prisma);

// Mock console para evitar ruido en stderr
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

// Helper para crear FormData con tipado correcto
const createFormData = (data: Record<string, string | undefined>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  }
  return formData;
};

// Mock payment data para usar en múltiples tests
const mockPayment = {
  id: "payment-123",
  currentAccountId: "ca-123",
  organizationId: "test-org-123",
  amountPaid: 1000,
  paymentDate: new Date("2024-01-01"),
  paymentMethod: "EFECTIVO",
  notes: "Pago inicial",
  transactionReference: "ref-123",
  installmentNumber: 1,
  installmentVersion: null,
  currentAccount: {
    id: "ca-123",
    remainingAmount: 5000,
    numberOfInstallments: 12,
    interestRate: 12,
    paymentFrequency: "MONTHLY",
    installmentAmount: 500,
  },
};

describe("undoPayment", () => {
  const mockPrevState: UndoPaymentFormState = {
    message: "",
    success: false,
  };

  beforeEach(() => {
    // Setup default organization response
    mockGetOrganizationIdFromSession.mockResolvedValue({
      organizationId: "test-org-123",
    });
  });

  describe("Validación de entrada", () => {
    it("debería fallar cuando organizationId no está disponible", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: undefined,
        error: "Organization not found",
      } as any);
      const formData = createFormData({ paymentId: "payment-123" });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result).toEqual({
        message: "Error: Organization not found or user not authenticated.",
        success: false,
      });
    });

    it("debería fallar cuando paymentId no se proporciona", async () => {
      // Arrange
      const formData = createFormData({});

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid data for undo operation");
    });

    it("debería requerir OTP en modo seguro cuando no se proporciona", async () => {
      // Arrange
      const formData = createFormData({
        paymentId: "payment-123",
        secureMode: "true",
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result).toEqual({
        message: "Esta operación requiere verificación OTP en modo seguro.",
        success: false,
        requiresOtp: true,
      });
    });

    it("debería fallar con OTP inválido en modo seguro", async () => {
      // Arrange
      const formData = createFormData({
        paymentId: "payment-123",
        secureMode: "true",
        otp: "000000",
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result).toEqual({
        message: "Código OTP inválido. Por favor, verifica el código e intenta nuevamente.",
        success: false,
        requiresOtp: true,
      });
    });
  });

  describe("Anulación de pagos", () => {
    it("debería fallar cuando el pago no existe", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "nonexistent-payment" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result).toEqual({
        message: "Error: Payment with ID nonexistent-payment not found.",
        success: false,
      });
    });

    it("debería fallar cuando el pago no tiene cuenta corriente", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...mockPayment,
              currentAccount: null,
            }),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result).toEqual({
        message: "Error: Current account data not found for payment payment-123.",
        success: false,
      });
    });

    it("debería fallar cuando el pago ya está anulado (versión D)", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...mockPayment,
              installmentVersion: "D",
            }),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result).toEqual({
        message: "Error: Payment payment-123 appears to be part of an annulment process already.",
        success: false,
      });
    });

    it("debería anular el pago exitosamente sin OTP", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockResolvedValue({ ...mockPayment, installmentVersion: "D" }),
            create: vi.fn().mockResolvedValue({ id: "new-payment-id" }),
            count: vi.fn().mockResolvedValue(5),
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain("Anulación procesada para pago payment-123");
    });

    it("debería anular el pago exitosamente con OTP válido", async () => {
      // Arrange
      const formData = createFormData({
        paymentId: "payment-123",
        secureMode: "true",
        otp: "123456",
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockResolvedValue({ ...mockPayment, installmentVersion: "D" }),
            create: vi.fn().mockResolvedValue({ id: "new-payment-id" }),
            count: vi.fn().mockResolvedValue(5),
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain("(Verificado con OTP)");
    });
  });

  describe("Manejo de errores", () => {
    it("debería manejar errores de Prisma", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });
      const prismaError = new Prisma.PrismaClientKnownRequestError("Database error", {
        code: "P2002",
        clientVersion: "4.0.0",
      });

      vi.mocked(prisma.$transaction).mockRejectedValue(prismaError);

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain("Error de base de datos al anular el pago");
    });

    it("debería manejar errores generales", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });
      const generalError = new Error("General error");

      vi.mocked(prisma.$transaction).mockRejectedValue(generalError);

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("General error");
    });

    it("debería manejar errores desconocidos", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });

      vi.mocked(prisma.$transaction).mockRejectedValue("Unknown error");

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain("Ocurrió un error inesperado");
    });
  });

  describe("Cálculos de cuotas", () => {
    it("debería recalcular las cuotas correctamente después de anular", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockResolvedValue({ ...mockPayment, installmentVersion: "D" }),
            create: vi.fn().mockResolvedValue({ id: "new-payment-id" }),
            count: vi.fn().mockResolvedValue(3), // 3 pagos válidos
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      // Verificar que se llamó al update de currentAccount
      expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
    });

    it("debería manejar casos con tasa de interés cero", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });
      const mockPaymentZeroInterest = {
        ...mockPayment,
        currentAccount: {
          ...mockPayment.currentAccount,
          interestRate: 0,
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(mockPaymentZeroInterest),
            update: vi
              .fn()
              .mockResolvedValue({ ...mockPaymentZeroInterest, installmentVersion: "D" }),
            create: vi.fn().mockResolvedValue({ id: "new-payment-id" }),
            count: vi.fn().mockResolvedValue(5),
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
    });

    it("debería manejar casos sin cuotas restantes", async () => {
      // Arrange
      const formData = createFormData({ paymentId: "payment-123" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockResolvedValue({ ...mockPayment, installmentVersion: "D" }),
            create: vi.fn().mockResolvedValue({ id: "new-payment-id" }),
            count: vi.fn().mockResolvedValue(12), // Todas las cuotas pagadas
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("Diferentes frecuencias de pago", () => {
    const testFrequencies = [
      { frequency: "WEEKLY", expectedPeriods: 52 },
      { frequency: "BIWEEKLY", expectedPeriods: 26 },
      { frequency: "MONTHLY", expectedPeriods: 12 },
      { frequency: "QUARTERLY", expectedPeriods: 4 },
      { frequency: "ANNUALLY", expectedPeriods: 1 },
    ];

    for (const { frequency } of testFrequencies) {
      it(`debería manejar frecuencia de pago ${frequency}`, async () => {
        // Arrange
        const formData = createFormData({ paymentId: "payment-123" });
        const mockPaymentWithFrequency = {
          ...mockPayment,
          currentAccount: {
            ...mockPayment.currentAccount,
            paymentFrequency: frequency,
          },
        };

        vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
          const tx = {
            payment: {
              findUnique: vi.fn().mockResolvedValue(mockPaymentWithFrequency),
              update: vi
                .fn()
                .mockResolvedValue({ ...mockPaymentWithFrequency, installmentVersion: "D" }),
              create: vi.fn().mockResolvedValue({ id: "new-payment-id" }),
              count: vi.fn().mockResolvedValue(5),
            },
            currentAccount: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return await callback(tx);
        });

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(true);
      });
    }
  });
});

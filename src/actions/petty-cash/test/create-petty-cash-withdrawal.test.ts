import prisma from "@/lib/prisma";
import type { CreatePettyCashWithdrawalState } from "@/types/action-states";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { createPettyCashWithdrawal } from "../create-petty-cash-withdrawal";

// Mock de Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    pettyCashDeposit: {
      findFirst: vi.fn(),
    },
    pettyCashWithdrawal: {
      aggregate: vi.fn(),
      create: vi.fn(),
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
  warn: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe("Create Petty Cash Withdrawal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = "clfx1234567890abcdefghijk"; // Valid CUID format
  const mockDepositId = "clfxdeposit1234567890ab"; // Valid CUID format
  const mockWithdrawalId = "clfxwithdraw1234567890"; // Valid CUID format

  const initialState: CreatePettyCashWithdrawalState = {
    status: "idle",
    message: "",
    errors: {},
  };

  const mockDeposit = {
    id: mockDepositId,
    organizationId: mockOrganizationId,
    amount: 10000.0,
    status: "OPEN",
  };

  const mockCreatedWithdrawal = {
    id: mockWithdrawalId,
    depositId: mockDepositId,
    organizationId: mockOrganizationId,
    userId: "user-123",
    userName: "Test User",
    amountGiven: 2000.0,
    date: new Date(),
    status: "PENDING_JUSTIFICATION",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper function para crear FormData válido básico
  const createValidFormData = (overrides: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.append("depositId", overrides.depositId ?? mockDepositId);
    formData.append("userId", overrides.userId ?? "user-123");
    formData.append("userName", overrides.userName ?? "Test User");
    formData.append("amountGiven", overrides.amountGiven ?? "1000");
    formData.append("date", overrides.date ?? "2024-01-15");

    // Solo agregar campos opcionales si se especifican
    if (overrides.description !== undefined) {
      formData.append("description", overrides.description);
    }
    if (overrides.organizationId !== undefined) {
      formData.append("organizationId", overrides.organizationId);
    }

    return formData;
  };

  describe("✅ Casos Exitosos", () => {
    it("debería crear un retiro de caja chica correctamente", async () => {
      // Arrange
      const formData = createValidFormData({
        description: "Retiro para gastos de oficina",
        amountGiven: "2000.50",
        date: "2024-01-15",
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });
      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 2000.0 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue(mockDeposit),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
      expect(result.status).toBe("success");
      expect(result.message).toBe("Retiro creado exitosamente.");
    });

    it("debería procesar números decimales correctamente", async () => {
      // Arrange
      const formData = createValidFormData({
        description: "Retiro con decimales",
        amountGiven: "1234.56",
        date: "2024-01-20",
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });
      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 1234.56 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue(mockDeposit),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("success");
    });
  });

  describe("❌ Manejo de Errores de Validación", () => {
    it("debería fallar con monto negativo", async () => {
      // Arrange
      const formData = createValidFormData({ amountGiven: "-500" });
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe("Validación fallida. Por favor revisa los campos.");
      expect(result.errors?.amountGiven).toBeDefined();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("debería fallar con monto inválido", async () => {
      // Arrange
      const formData = createValidFormData({ amountGiven: "no-es-numero" });
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe("Validación fallida. Por favor revisa los campos.");
      expect(result.errors?.amountGiven).toBeDefined();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("debería fallar con monto cero", async () => {
      // Arrange
      const formData = createValidFormData({ amountGiven: "0" });
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe("Validación fallida. Por favor revisa los campos.");
      expect(result.errors?.amountGiven).toBeDefined();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("❌ Manejo de Errores de Organización", () => {
    it("debería fallar cuando no hay organizationId en sesión ni FormData", async () => {
      // Arrange
      const formData = createValidFormData(); // Sin organizationId en FormData
      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe(
        "ID de Organización no encontrado (ni en formulario ni en sesión).",
      );
      expect(result.errors?._form).toContain("ID de Organización no encontrado.");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("❌ Manejo de Errores de Depósito", () => {
    it("debería fallar cuando el depósito no existe", async () => {
      // Arrange
      const formData = createValidFormData({ depositId: "clfx1234567890nonexist" });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(null);

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe("No se encontró un depósito activo o válido para este retiro.");
      expect(result.errors?.depositId).toContain("Depósito no encontrado o no válido.");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("debería fallar cuando el depósito está cerrado", async () => {
      // Arrange
      const closedDeposit = { ...mockDeposit, status: "CLOSED" };
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(closedDeposit);

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe("El depósito seleccionado no está abierto.");
      expect(result.errors?.depositId).toContain("El depósito no está abierto.");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("❌ Manejo de Errores de Base de Datos", () => {
    it("debería manejar errores de base de datos conocidos", async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      const dbError = new Error("Database connection failed");
      mockPrisma.$transaction.mockRejectedValue(dbError);

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe("error");
      expect(result.message).toBe("Database connection failed");
      expect(result.errors?._form).toContain("Database connection failed");
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error creating petty cash withdrawal:",
        dbError,
      );
    });
  });

  describe("🔄 Cache Revalidation", () => {
    it("debería revalidar cuando la creación es exitosa", async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });
      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 1000.0 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue(mockDeposit),
          },
        });
      });

      // Act
      await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
    });

    it("no debería revalidar cuando hay errores de validación", async () => {
      // Arrange
      const formData = createValidFormData({ amountGiven: "-500" });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});

import prisma from "@/lib/prisma";
import type { CreatePettyCashSpendState } from "@/types/action-states";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { createPettyCashSpendWithTicket } from "../create-petty-cash-spend";

// Mock de Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    pettyCashWithdrawal: {
      findUnique: vi.fn(),
    },
    pettyCashSpend: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Silenciar console durante los tests
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "log").mockImplementation(() => {});

describe("createPettyCashSpendWithTicket", () => {
  const mockOrganizationId = "clfx1234567890abcdefghijk"; // Valid CUID format
  const mockWithdrawalId = "clfxwithdraw1234567890"; // Valid CUID format
  const mockDepositId = "clfxdeposit1234567890ab"; // Valid CUID format
  const mockSpendId = "clfxspend123456789012"; // Valid CUID format

  const initialState: CreatePettyCashSpendState = {
    status: "idle",
    message: "",
    errors: {},
  };

  const mockWithdrawal = {
    id: mockWithdrawalId,
    depositId: mockDepositId,
    amountGiven: 5000.0,
    amountJustified: 1500.0,
    status: "ACTIVE",
    deposit: {
      id: mockDepositId,
      status: "OPEN",
      amount: 10000.0,
    },
  };

  const mockCreatedSpend = {
    id: mockSpendId,
    withdrawalId: mockWithdrawalId,
    motive: "oficina",
    description: "Gasto de oficina",
    amount: 800.0,
    date: new Date(),
    ticketUrl: "https://s3.bucket.com/receipt.jpg",
    organizationId: mockOrganizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper function para crear FormData válido básico
  const createValidFormData = (overrides: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.append("withdrawalId", overrides.withdrawalId ?? mockWithdrawalId);
    formData.append("motive", overrides.motive ?? "oficina");
    formData.append("description", overrides.description ?? "Gasto de oficina");
    formData.append("amount", overrides.amount ?? "800");
    formData.append("date", overrides.date ?? "2024-01-15");

    // Solo agregar organizationId si se especifica
    if (overrides.organizationId !== undefined) {
      formData.append("organizationId", overrides.organizationId);
    }

    return formData;
  };

  const mockPrismaWithdrawal = prisma.pettyCashWithdrawal as any;
  const mockPrismaSpend = prisma.pettyCashSpend as any;
  const mockPrismaTransaction = prisma.$transaction as any;
  const mockGetOrganization = getOrganizationIdFromSession as any;
  const mockRevalidatePath = revalidatePath as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

    // Configurar mocks por defecto para transacción exitosa
    mockPrismaTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const tx = {
        pettyCashWithdrawal: {
          findUnique: vi.fn().mockResolvedValue(mockWithdrawal),
          update: vi.fn().mockResolvedValue({ ...mockWithdrawal, amountJustified: 2300.0 }),
        },
        pettyCashSpend: {
          create: vi.fn().mockResolvedValue(mockCreatedSpend),
        },
        pettyCashDeposit: {
          update: vi.fn(),
        },
      };
      return await callback(tx);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Casos exitosos", () => {
    it("debería crear un gasto exitosamente con datos válidos", async () => {
      const formData = createValidFormData();
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Gasto creado exitosamente.");
      expect(result.errors).toEqual({});
      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
    });

    it('debería crear un gasto con motivo "otros" y descripción', async () => {
      const formData = createValidFormData({
        motive: "otros",
        description: "Descripción personalizada requerida",
      });
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("success");
    });

    it("debería crear un gasto con diferentes motivos válidos", async () => {
      const motives = ["oficina", "transporte", "comida", "mantenimiento", "viaje"];

      for (const motive of motives) {
        const formData = createValidFormData({ motive });
        const result = await createPettyCashSpendWithTicket(initialState, formData);

        expect(result.status).toBe("success");
      }
    });
  });

  describe("Validación de campos", () => {
    it("debería fallar con retiro ID inválido", async () => {
      const formData = createValidFormData({ withdrawalId: "invalid-id" });
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("Validación fallida. Por favor revisa los campos.");
      expect(result.errors?.withdrawalId).toBeDefined();
    });

    it("debería fallar con cantidad inválida", async () => {
      const formData = createValidFormData({ amount: "abc" });
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("Validación fallida. Por favor revisa los campos.");
      expect(result.errors?.amount).toBeDefined();
    });

    it("debería fallar con cantidad negativa", async () => {
      const formData = createValidFormData({ amount: "-100" });
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("Validación fallida. Por favor revisa los campos.");
      expect(result.errors?.amount).toBeDefined();
    });

    it('debería fallar cuando motive es "otros" sin descripción', async () => {
      const formData = createValidFormData({
        motive: "otros",
        description: "",
      });
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("La descripción es requerida cuando el motivo es 'Otros'.");
      expect(result.errors?.description).toBeDefined();
    });
  });

  describe("Validaciones de negocio", () => {
    it("debería fallar cuando el retiro no existe", async () => {
      mockPrismaTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          pettyCashWithdrawal: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        };
        await callback(tx);
        throw new Error("Retiro no encontrado o no pertenece a la organización.");
      });

      const formData = createValidFormData();
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("Retiro no encontrado o no pertenece a la organización.");
    });

    it("debería fallar cuando el retiro ya está justificado", async () => {
      mockPrismaTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          pettyCashWithdrawal: {
            findUnique: vi.fn().mockResolvedValue({ ...mockWithdrawal, status: "JUSTIFIED" }),
          },
        };
        await callback(tx);
        throw new Error("Este retiro ya ha sido completamente justificado.");
      });

      const formData = createValidFormData();
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("Este retiro ya ha sido completamente justificado.");
    });

    it("debería fallar cuando se excede el monto del retiro", async () => {
      mockPrismaTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          pettyCashWithdrawal: { findUnique: vi.fn().mockResolvedValue(mockWithdrawal) },
          pettyCashSpend: {
            create: vi.fn().mockImplementation(() => {
              throw new Error("El monto justificado excede el monto entregado en el retiro.");
            }),
          },
        };
        return await callback(tx);
      });
      const formData = createValidFormData({ amount: "4000" });
      const result = await createPettyCashSpendWithTicket(initialState, formData);
      expect(result.status).toBe("error");
      expect(result.message).toBe("El monto justificado excede el monto entregado en el retiro.");
    });
  });

  describe("Manejo de errores", () => {
    it("debería manejar errores de la base de datos", async () => {
      mockPrismaTransaction.mockRejectedValue(new Error("Database error"));

      const formData = createValidFormData();
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("Database error");
    });

    it("debería manejar errores de organización no encontrada", async () => {
      mockGetOrganization.mockResolvedValue({ organizationId: null });

      const formData = createValidFormData();
      const result = await createPettyCashSpendWithTicket(initialState, formData);

      expect(result.status).toBe("error");
      expect(result.message).toBe("ID de Organización no encontrado.");
    });
  });

  describe("Cache Revalidation", () => {
    it("debería revalidar cuando la creación es exitosa", async () => {
      const formData = createValidFormData();
      await createPettyCashSpendWithTicket(initialState, formData);

      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
    });

    it("no debería revalidar cuando hay errores de validación", async () => {
      const formData = createValidFormData({ amount: "-500" });
      await createPettyCashSpendWithTicket(initialState, formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});

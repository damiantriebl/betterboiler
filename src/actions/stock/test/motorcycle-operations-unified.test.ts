import prisma from "@/lib/prisma";
import { motorcycleBatchSchema } from "@/zod/MotorcycleBatchSchema";
import { MotorcycleState } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import {
  type CreateBatchResult,
  type OperationResult,
  type ReserveMotorcycleParams,
  type UpdateStatusResult,
  createMotorcycleBatch,
  getAvailableStateTransitions,
  reserveMotorcycle,
  updateMotorcycle,
  updateMotorcycleStatus,
} from "../motorcycle-operations-unified";

// Mock de dependencias
vi.mock("@/lib/prisma", () => ({
  default: {
    motorcycle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    $use: vi.fn(),
  },
}));

vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_noStore: vi.fn(),
}));

vi.mock("@/zod/MotorcycleBatchSchema", () => ({
  motorcycleBatchSchema: {
    safeParse: vi.fn(),
  },
}));

const mockGetOrganizationIdFromSession = getOrganizationIdFromSession as any;
const mockMotorcycleBatchSchema = motorcycleBatchSchema as any;
const mockPrisma = prisma as any;
const mockRevalidatePath = revalidatePath as any;

describe("motorcycle-operations-unified", () => {
  const mockOrganizationId = "org-123";
  const mockMotorcycleData = {
    brandId: 1,
    modelId: 1,
    year: 2023,
    displacement: 150,
    costPrice: 4000,
    retailPrice: 5000,
    wholesalePrice: 4500,
    currency: "USD",
    supplierId: 1,
    imageUrl: "https://example.com/image.jpg",
    units: [
      {
        chassisNumber: "ABC123",
        engineNumber: "ENG456",
        colorId: 1,
        mileage: 0,
        branchId: 1,
        state: MotorcycleState.STOCK,
        licensePlate: null,
        observations: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createMotorcycleBatch", () => {
    it("debería crear un lote de motocicletas exitosamente", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockResolvedValue([{ id: 1, chassisNumber: "ABC123" }]);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(1);
      expect(result.message).toContain("Lote creado exitosamente");
    });

    it("debería fallar cuando no hay autenticación", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado o sin organización.");
    });

    it("debería fallar cuando hay errores de validación", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: {
              brandId: ["Debe seleccionar una marca"],
              year: ["El año es obligatorio"],
            },
          }),
        },
      });

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Datos inválidos");
      expect(result.error).toContain("brandId");
      expect(result.error).toContain("year");
    });

    it("debería detectar números de chasis duplicados en el lote", async () => {
      // Arrange
      const duplicateData = {
        ...mockMotorcycleData,
        units: [
          { ...mockMotorcycleData.units[0], chassisNumber: "ABC123" },
          { ...mockMotorcycleData.units[0], chassisNumber: "ABC123" },
        ],
      };

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: duplicateData,
      });

      // Act
      const result = await createMotorcycleBatch(null, duplicateData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("números de chasis duplicados en el lote");
    });

    it("debería detectar números de chasis existentes en la base de datos", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      mockPrisma.motorcycle.findMany.mockResolvedValue([{ chassisNumber: "ABC123" }]);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Ya existen motos con los siguientes números de chasis");
      expect(result.error).toContain("ABC123");
    });
  });

  describe("updateMotorcycleStatus", () => {
    it("debería actualizar el estado de una motocicleta exitosamente", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockPrisma.motorcycle.findUnique.mockResolvedValue({
        state: MotorcycleState.STOCK,
      });
      mockPrisma.motorcycle.update.mockResolvedValue({
        id: 1,
        state: MotorcycleState.PAUSADO,
      });

      // Act
      const result = await updateMotorcycleStatus(1, MotorcycleState.PAUSADO);

      // Assert
      expect(result.success).toBe(true);
      expect(result.previousState).toBe(MotorcycleState.STOCK);
      expect(result.newState).toBe(MotorcycleState.PAUSADO);
      expect(result.message).toContain("Estado actualizado");
    });

    it("debería fallar cuando la transición de estado no es válida", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockPrisma.motorcycle.findUnique.mockResolvedValue({
        state: MotorcycleState.VENDIDO,
      });

      // Act - VENDIDO → PAUSADO no está permitida (solo VENDIDO → STOCK)
      const result = await updateMotorcycleStatus(1, MotorcycleState.PAUSADO);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Transición de estado no permitida");
      expect(result.error).toContain("VENDIDO → PAUSADO");
    });

    it("debería desconectar cliente cuando se cambia a STOCK desde estados específicos", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockPrisma.motorcycle.findUnique.mockResolvedValue({
        state: MotorcycleState.RESERVADO,
      });
      mockPrisma.motorcycle.update.mockResolvedValue({
        id: 1,
        state: MotorcycleState.STOCK,
      });

      // Act
      await updateMotorcycleStatus(1, MotorcycleState.STOCK);

      // Assert
      expect(mockPrisma.motorcycle.update).toHaveBeenCalledWith({
        where: {
          id: 1,
          organizationId: mockOrganizationId,
        },
        data: {
          state: MotorcycleState.STOCK,
          client: { disconnect: true },
        },
      });
    });

    it("debería fallar cuando la motocicleta no existe", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockPrisma.motorcycle.findUnique.mockResolvedValue(null);

      // Act
      const result = await updateMotorcycleStatus(999, MotorcycleState.PAUSADO);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Motocicleta no encontrada.");
    });
  });

  describe("reserveMotorcycle", () => {
    const reserveParams: ReserveMotorcycleParams = {
      motorcycleId: 1,
      reservationAmount: 500,
      clientId: "client-123",
    };

    it("debería reservar una motocicleta exitosamente", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockPrisma.motorcycle.findUnique.mockResolvedValue({
        state: MotorcycleState.STOCK,
      });
      mockPrisma.motorcycle.update.mockResolvedValue({
        id: 1,
        state: MotorcycleState.RESERVADO,
        clientId: "client-123",
      });

      // Act
      const result = await reserveMotorcycle(reserveParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe("Motocicleta reservada exitosamente");
      expect(result.data?.motorcycle.state).toBe(MotorcycleState.RESERVADO);
    });

    it("debería fallar cuando la motocicleta no se puede reservar", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockPrisma.motorcycle.findUnique.mockResolvedValue({
        state: MotorcycleState.VENDIDO,
      });

      // Act
      const result = await reserveMotorcycle(reserveParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("No se puede reservar una motocicleta en estado VENDIDO");
    });

    it("debería fallar cuando no hay autenticación", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({ organizationId: null });

      // Act
      const result = await reserveMotorcycle(reserveParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
    });
  });

  describe("updateMotorcycle", () => {
    it("debería actualizar una motocicleta exitosamente", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("brandId", "1");
      formData.append("modelId", "1");

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      mockPrisma.motorcycle.update.mockResolvedValue({
        id: 1,
        brandId: 1,
      });

      // Act
      const result = await updateMotorcycle(1, null, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe("Motocicleta actualizada correctamente.");
    });

    it("debería fallar cuando faltan datos de unidad", async () => {
      // Arrange
      const dataWithoutUnits = { ...mockMotorcycleData, units: [] };

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: dataWithoutUnits,
      });

      // Act
      const result = await updateMotorcycle(1, null, new FormData());

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("Faltan datos de identificación de la unidad.");
    });
  });

  describe("getAvailableStateTransitions", () => {
    it("debería retornar transiciones válidas para STOCK", async () => {
      // Act
      const transitions = await getAvailableStateTransitions(MotorcycleState.STOCK);

      // Assert
      expect(transitions).toEqual([
        MotorcycleState.PAUSADO,
        MotorcycleState.PROCESANDO,
        MotorcycleState.RESERVADO,
        MotorcycleState.EN_TRANSITO,
        MotorcycleState.ELIMINADO,
      ]);
    });

    it("debería retornar transición a STOCK para VENDIDO", async () => {
      // Act
      const transitions = await getAvailableStateTransitions(MotorcycleState.VENDIDO);

      // Assert
      expect(transitions).toEqual([MotorcycleState.STOCK]);
    });
  });

  describe("Manejo de errores de Prisma", () => {
    it("debería manejar errores P2002 (duplicidad) en createMotorcycleBatch", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);

      const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["chassisNumber"] },
      });
      mockPrisma.$transaction.mockRejectedValue(prismaError);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error de duplicidad");
      expect(result.error).toContain("número de chasis");
    });

    it("debería manejar errores P2003 (referencia) en createMotorcycleBatch", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      mockMotorcycleBatchSchema.safeParse.mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "5.0.0",
        },
      );
      mockPrisma.$transaction.mockRejectedValue(prismaError);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error de referencia");
    });
  });
});

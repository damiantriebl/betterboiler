import type { CreateReservationInput } from "@/zod/ReservationZod";
import { MotorcycleState } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReservation } from "../create-reservation";

// Mock de dependencias
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/zod/ReservationZod", () => ({
  createReservationSchema: {
    parse: vi.fn(),
  },
}));

vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

describe("createReservation", () => {
  const validReservationData: CreateReservationInput = {
    motorcycleId: 1,
    clientId: "client-123",
    amount: 1000,
    currency: "USD",
    expirationDate: new Date("2024-12-31"),
    notes: "Reserva de prueba",
    paymentMethod: "CASH",
  };

  const mockMotorcycle = {
    id: 1,
    state: MotorcycleState.STOCK,
    brandId: 1,
    modelId: 1,
    organizationId: "org-123",
    year: 2023,
    retailPrice: 5000,
    chassisNumber: "ABC123",
  };

  const mockClient = {
    id: "client-123",
    firstName: "Juan",
    lastName: "Pérez",
    email: "juan@test.com",
    organizationId: "org-123",
  };

  const mockReservation = {
    id: 1,
    ...validReservationData,
    status: "active",
    organizationId: "org-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Casos exitosos", () => {
    it("debería crear una reserva exitosamente", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      // Mock de transacción
      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(mockMotorcycle),
            update: vi
              .fn()
              .mockResolvedValue({ ...mockMotorcycle, state: MotorcycleState.RESERVADO }),
          },
          client: {
            findUnique: vi.fn().mockResolvedValue(mockClient),
          },
          reservation: {
            findFirst: vi.fn().mockResolvedValue(null), // No hay reserva existente
            create: vi.fn().mockResolvedValue(mockReservation),
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReservation);
      expect(createReservationSchema.parse).toHaveBeenCalledWith(validReservationData);
      expect(getOrganizationIdFromSession).toHaveBeenCalled();
    });

    it("debería crear reserva aunque ya exista una activa (múltiples reservas permitidas)", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const existingReservation = { id: 999, motorcycleId: 1, status: "active" };

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(mockMotorcycle),
            update: vi
              .fn()
              .mockResolvedValue({ ...mockMotorcycle, state: MotorcycleState.RESERVADO }),
          },
          client: {
            findUnique: vi.fn().mockResolvedValue(mockClient),
          },
          reservation: {
            findFirst: vi.fn().mockResolvedValue(existingReservation), // Ya existe una reserva
            create: vi.fn().mockResolvedValue(mockReservation),
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Spy en console.log para verificar el mensaje informativo
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReservation);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("La moto 1 ya tiene una reserva activa"),
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("debería manejar motocicleta en estado PAUSADO", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      const pausedMotorcycle = { ...mockMotorcycle, state: MotorcycleState.PAUSADO };

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(pausedMotorcycle),
            update: vi
              .fn()
              .mockResolvedValue({ ...pausedMotorcycle, state: MotorcycleState.RESERVADO }),
          },
          client: {
            findUnique: vi.fn().mockResolvedValue(mockClient),
          },
          reservation: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockReservation),
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReservation);
    });
  });

  describe("Errores de validación", () => {
    it("debería fallar con datos inválidos", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");

      const invalidData = { ...validReservationData, amount: -100 };
      (createReservationSchema.parse as any).mockImplementation(() => {
        throw new Error("Monto debe ser positivo");
      });

      // Act
      const result = await createReservation(invalidData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Monto debe ser positivo");
    });

    it("debería manejar error de validación de Zod", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");

      (createReservationSchema.parse as any).mockImplementation(() => {
        const error = new Error("Required field missing");
        error.name = "ZodError";
        throw error;
      });

      // Act
      const result = await createReservation({} as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Required field missing");
    });
  });

  describe("Errores de autenticación", () => {
    it("debería fallar cuando no se puede obtener organizationId", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: null,
        error: "Usuario no autenticado",
      });

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado");
    });

    it("debería fallar cuando getOrganizationIdFromSession retorna error", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: "Sesión expirada",
      });

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Sesión expirada");
    });
  });

  describe("Errores de negocio", () => {
    it("debería fallar cuando la motocicleta no existe", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(null), // Motocicleta no encontrada
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("No se encontró la motocicleta especificada");
    });

    it("debería fallar cuando la motocicleta está vendida", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      const soldMotorcycle = { ...mockMotorcycle, state: MotorcycleState.VENDIDO };

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(soldMotorcycle),
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("La motocicleta no está disponible para reserva");
      expect(result.error).toContain("VENDIDO");
    });

    it("debería fallar cuando la motocicleta está reservada", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      const reservedMotorcycle = { ...mockMotorcycle, state: MotorcycleState.RESERVADO };

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(reservedMotorcycle),
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("La motocicleta no está disponible para reserva");
      expect(result.error).toContain("RESERVADO");
    });

    it("debería fallar cuando el cliente no existe", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: vi.fn().mockResolvedValue(mockMotorcycle),
          },
          client: {
            findUnique: vi.fn().mockResolvedValue(null), // Cliente no encontrado
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("No se encontró el cliente especificado");
    });
  });

  describe("Errores de base de datos", () => {
    it("debería manejar errores de transacción", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      (prisma.default.$transaction as any).mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(consoleSpy).toHaveBeenCalledWith("Error al crear la reserva:", expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("debería manejar errores desconocidos", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      (prisma.default.$transaction as any).mockRejectedValue("String error");

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error desconocido al crear la reserva");
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe("Flujo completo de transacción", () => {
    it("debería ejecutar todos los pasos de la transacción en orden correcto", async () => {
      // Arrange
      const { createReservationSchema } = await import("@/zod/ReservationZod");
      const { getOrganizationIdFromSession } = await import("../../util");
      const prisma = await import("@/lib/prisma");

      (createReservationSchema.parse as any).mockReturnValue(validReservationData);
      (getOrganizationIdFromSession as any).mockResolvedValue({
        organizationId: "org-123",
        error: null,
      });

      const mockFindMotorcycle = vi.fn().mockResolvedValue(mockMotorcycle);
      const mockFindClient = vi.fn().mockResolvedValue(mockClient);
      const mockFindReservation = vi.fn().mockResolvedValue(null);
      const mockCreateReservation = vi.fn().mockResolvedValue(mockReservation);
      const mockUpdateMotorcycle = vi
        .fn()
        .mockResolvedValue({ ...mockMotorcycle, state: MotorcycleState.RESERVADO });

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          motorcycle: {
            findFirst: mockFindMotorcycle,
            update: mockUpdateMotorcycle,
          },
          client: {
            findUnique: mockFindClient,
          },
          reservation: {
            findFirst: mockFindReservation,
            create: mockCreateReservation,
          },
        };
        return await callback(tx);
      });

      (prisma.default.$transaction as any).mockImplementation(mockTransaction);

      // Act
      const result = await createReservation(validReservationData);

      // Assert
      expect(result.success).toBe(true);

      // Verificar orden de llamadas
      expect(mockFindMotorcycle).toHaveBeenCalledWith({
        where: {
          id: validReservationData.motorcycleId,
          organizationId: "org-123",
        },
      });

      expect(mockFindClient).toHaveBeenCalledWith({
        where: { id: validReservationData.clientId },
      });

      expect(mockFindReservation).toHaveBeenCalledWith({
        where: {
          motorcycleId: validReservationData.motorcycleId,
          status: "active",
        },
      });

      expect(mockCreateReservation).toHaveBeenCalledWith({
        data: {
          amount: validReservationData.amount,
          currency: validReservationData.currency,
          expirationDate: validReservationData.expirationDate,
          notes: validReservationData.notes,
          paymentMethod: validReservationData.paymentMethod,
          status: "active",
          motorcycle: {
            connect: { id: validReservationData.motorcycleId },
          },
          client: {
            connect: { id: validReservationData.clientId },
          },
          organization: {
            connect: { id: "org-123" },
          },
        },
      });

      expect(mockUpdateMotorcycle).toHaveBeenCalledWith({
        where: { id: validReservationData.motorcycleId },
        data: { state: MotorcycleState.RESERVADO },
      });
    });
  });
});

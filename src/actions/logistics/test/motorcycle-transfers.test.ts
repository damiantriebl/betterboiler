import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
const mockPrisma = {
  motorcycle: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  motorcycleTransfer: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock auth
const mockAuth = {
  api: {
    getSession: vi.fn(),
  },
};

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

// Mock headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock getOrganizationIdFromSession
const mockGetOrganizationIdFromSession = vi.fn();
vi.mock("../util", () => ({
  getOrganizationIdFromSession: mockGetOrganizationIdFromSession,
}));

// Mock sendEmail
const mockSendEmail = vi.fn();
vi.mock("../auth/email", () => ({
  sendEmail: mockSendEmail,
}));

// Mock revalidatePath
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

describe("motorcycle-transfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidSession = {
    user: {
      id: "user-1",
      organizationId: "org-1",
      email: "test@example.com",
      role: "ADMIN",
    },
  };

  const mockValidOrganization = {
    organizationId: "org-1",
  };

  const mockMotorcycle = {
    id: 1,
    chassisNumber: "ABC123",
    branchId: 1,
    state: "STOCK",
    organizationId: "org-1",
  };

  const mockTransferData = {
    motorcycleId: 1,
    fromBranchId: 1,
    toBranchId: 2,
    logisticProviderId: 1,
    scheduledPickupDate: new Date("2024-12-01"),
    notes: "Transferencia de prueba",
  };

  const mockTransfer = {
    id: 1,
    ...mockTransferData,
    requestedDate: new Date(),
    requestedBy: "user-1",
    organizationId: "org-1",
    status: "IN_TRANSIT",
    motorcycle: {
      ...mockMotorcycle,
      brand: { name: "Honda" },
      model: { name: "CBR600" },
      color: { name: "Rojo" },
    },
    fromBranch: { name: "Sucursal A" },
    toBranch: { name: "Sucursal B" },
    logisticProvider: { name: "Proveedor Test" },
    requester: { name: "Usuario Test" },
  };

  describe("createMotorcycleTransfer", () => {
    it("debería crear transferencia exitosamente", async () => {
      const { createMotorcycleTransfer } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findFirst.mockResolvedValue(mockMotorcycle);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(null); // Sin transferencias activas
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
          return [mockTransfer, mockMotorcycle];
        }
        return callback();
      });
      mockPrisma.user.findMany.mockResolvedValue([{ email: "admin@test.com", name: "Admin" }]);
      mockSendEmail.mockResolvedValue({ success: true });

      // Act
      const result = await createMotorcycleTransfer(mockTransferData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfer).toEqual(mockTransfer);

      expect(mockPrisma.motorcycle.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTransferData.motorcycleId,
          organizationId: "org-1",
          state: "STOCK",
        },
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith("/logistic");
    });

    it("debería retornar error cuando no hay sesión", async () => {
      const { createMotorcycleTransfer } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await createMotorcycleTransfer(mockTransferData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
    });

    it("debería retornar error cuando la motocicleta no existe", async () => {
      const { createMotorcycleTransfer } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findFirst.mockResolvedValue(null);

      // Act
      const result = await createMotorcycleTransfer(mockTransferData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Motocicleta no encontrada o no disponible para transferencia.");
    });

    it("debería retornar error cuando la motocicleta no está en la sucursal origen", async () => {
      const { createMotorcycleTransfer } = await import("../motorcycle-transfers");

      // Arrange
      const motorcycleInDifferentBranch = {
        ...mockMotorcycle,
        branchId: 3, // Diferente a fromBranchId
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findFirst.mockResolvedValue(motorcycleInDifferentBranch);

      // Act
      const result = await createMotorcycleTransfer(mockTransferData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "La motocicleta no se encuentra en la sucursal de origen especificada.",
      );
    });

    it("debería retornar error cuando hay transferencia activa", async () => {
      const { createMotorcycleTransfer } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findFirst.mockResolvedValue(mockMotorcycle);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue({
        id: 2,
        status: "IN_TRANSIT",
      }); // Ya hay transferencia activa

      // Act
      const result = await createMotorcycleTransfer(mockTransferData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("La motocicleta ya tiene una transferencia activa.");
    });

    it("debería manejar errores en el envío de email sin fallar la transferencia", async () => {
      const { createMotorcycleTransfer } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findFirst.mockResolvedValue(mockMotorcycle);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
          return [mockTransfer, mockMotorcycle];
        }
        return callback();
      });
      mockPrisma.user.findMany.mockResolvedValue([{ email: "admin@test.com", name: "Admin" }]);
      mockSendEmail.mockRejectedValue(new Error("Email failed"));

      // Act
      const result = await createMotorcycleTransfer(mockTransferData);

      // Assert
      expect(result.success).toBe(true); // No debe fallar por error de email
      expect(result.transfer).toEqual(mockTransfer);
    });
  });

  describe("updateTransferStatus", () => {
    it("debería actualizar estado exitosamente", async () => {
      const { updateTransferStatus } = await import("../motorcycle-transfers");

      // Arrange
      const statusUpdateData = {
        status: "DELIVERED" as const,
        actualDeliveryDate: new Date(),
      };

      const existingTransfer = {
        id: 1,
        status: "IN_TRANSIT",
        motorcycleId: 1,
        toBranchId: 2,
        organizationId: "org-1",
        motorcycle: mockMotorcycle,
      };

      const updatedTransfer = {
        ...mockTransfer,
        ...statusUpdateData,
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(existingTransfer);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
          return [updatedTransfer, mockMotorcycle];
        }
        return callback();
      });

      // Act
      const result = await updateTransferStatus(1, statusUpdateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfer).toEqual(updatedTransfer);
    });

    it("debería retornar error para transición de estado inválida", async () => {
      const { updateTransferStatus } = await import("../motorcycle-transfers");

      // Arrange
      const statusUpdateData = {
        status: "REQUESTED" as const, // Transición inválida desde DELIVERED
      };

      const existingTransfer = {
        id: 1,
        status: "DELIVERED", // Estado final
        motorcycleId: 1,
        organizationId: "org-1",
        motorcycle: mockMotorcycle,
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(existingTransfer);

      // Act
      const result = await updateTransferStatus(1, statusUpdateData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Transición de estado inválida");
    });

    it("debería retornar error cuando la transferencia no existe", async () => {
      const { updateTransferStatus } = await import("../motorcycle-transfers");

      // Arrange
      const statusUpdateData = {
        status: "DELIVERED" as const,
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(null);

      // Act
      const result = await updateTransferStatus(999, statusUpdateData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Transferencia no encontrada.");
    });
  });

  describe("getMotorcycleTransfers", () => {
    it("debería obtener transferencias exitosamente", async () => {
      const { getMotorcycleTransfers } = await import("../motorcycle-transfers");

      // Arrange
      const mockTransfers = [mockTransfer];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findMany.mockResolvedValue(mockTransfers);

      // Act
      const result = await getMotorcycleTransfers();

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfers).toEqual(mockTransfers);

      expect(mockPrisma.motorcycleTransfer.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        include: {
          motorcycle: {
            include: {
              brand: true,
              model: true,
              color: true,
            },
          },
          fromBranch: true,
          toBranch: true,
          logisticProvider: true,
          requester: true,
          confirmer: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("debería retornar error cuando no hay sesión", async () => {
      const { getMotorcycleTransfers } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await getMotorcycleTransfers();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.transfers).toEqual([]);
    });

    it("debería manejar errores de base de datos", async () => {
      const { getMotorcycleTransfers } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findMany.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await getMotorcycleTransfers();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al obtener transferencias.");
      expect(result.transfers).toEqual([]);
    });
  });

  describe("getTransfersByStatus", () => {
    it("debería obtener transferencias por estado", async () => {
      const { getTransfersByStatus } = await import("../motorcycle-transfers");

      // Arrange
      const mockTransfers = [mockTransfer];
      const statuses = ["IN_TRANSIT", "REQUESTED"];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findMany.mockResolvedValue(mockTransfers);

      // Act
      const result = await getTransfersByStatus(statuses);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfers).toEqual(mockTransfers);

      expect(mockPrisma.motorcycleTransfer.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          status: { in: statuses },
        },
        include: {
          motorcycle: {
            include: {
              brand: true,
              model: true,
              color: true,
            },
          },
          fromBranch: true,
          toBranch: true,
          logisticProvider: true,
          requester: true,
          confirmer: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("cancelTransfer", () => {
    it("debería cancelar transferencia", async () => {
      const { cancelTransfer } = await import("../motorcycle-transfers");

      // Arrange
      const existingTransfer = {
        id: 1,
        status: "REQUESTED",
        motorcycleId: 1,
        organizationId: "org-1",
        motorcycle: mockMotorcycle,
      };

      const cancelledTransfer = {
        ...mockTransfer,
        status: "CANCELLED",
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(existingTransfer);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
          return [cancelledTransfer];
        }
        return callback();
      });

      // Act
      const result = await cancelTransfer(1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfer?.status).toBe("CANCELLED");
    });
  });

  describe("getTransfersInTransit", () => {
    it("debería obtener transferencias en tránsito", async () => {
      const { getTransfersInTransit } = await import("../motorcycle-transfers");

      // Arrange
      const transitTransfers = [{ ...mockTransfer, status: "IN_TRANSIT" }];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findMany.mockResolvedValue(transitTransfers);

      // Act
      const result = await getTransfersInTransit();

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfers).toEqual(transitTransfers);
    });
  });

  describe("confirmTransferArrival", () => {
    it("debería confirmar llegada exitosamente", async () => {
      const { confirmTransferArrival } = await import("../motorcycle-transfers");

      // Arrange
      const existingTransfer = {
        id: 1,
        status: "IN_TRANSIT",
        motorcycleId: 1,
        toBranchId: 2,
        organizationId: "org-1",
        motorcycle: mockMotorcycle,
      };

      const deliveredTransfer = {
        ...mockTransfer,
        status: "DELIVERED",
        actualDeliveryDate: expect.any(Date),
        confirmedBy: "user-1",
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(existingTransfer);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
          return [deliveredTransfer, mockMotorcycle];
        }
        return callback();
      });

      // Act
      const result = await confirmTransferArrival(1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transfer).toEqual(deliveredTransfer);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/logistic");
    });

    it("debería retornar error cuando la transferencia no está en tránsito", async () => {
      const { confirmTransferArrival } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockResolvedValue(null); // No encontrada en tránsito

      // Act
      const result = await confirmTransferArrival(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Transferencia no encontrada o no está en tránsito.");
    });

    it("debería manejar errores de base de datos", async () => {
      const { confirmTransferArrival } = await import("../motorcycle-transfers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycleTransfer.findFirst.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await confirmTransferArrival(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al confirmar la llegada de la transferencia.");
    });
  });
});

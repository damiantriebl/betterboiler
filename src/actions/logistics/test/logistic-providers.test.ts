import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
const mockPrisma = {
  logisticProvider: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  motorcycleTransfer: {
    findMany: vi.fn(),
  },
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

// Mock revalidatePath
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

describe("logistic-providers", () => {
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

  const mockProviderData = {
    name: "Proveedor Test",
    contactName: "Juan Pérez",
    contactPhone: "123456789",
    contactEmail: "test@example.com",
    address: "Dirección Test 123",
    transportTypes: ["terrestre" as const],
    vehicleTypes: ["camión" as const],
    coverageZones: ["local" as const],
    pricePerKm: 100,
    baseFee: 500,
    currency: "ARS",
    insurance: true,
    maxWeight: 1000,
    maxVolume: 50,
    specialRequirements: "Requisitos especiales",
    rating: 4.5,
    status: "activo" as const,
    notes: "Notas del proveedor",
  };

  const mockProvider = {
    id: 1,
    ...mockProviderData,
    organizationId: "org-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("createLogisticProvider", () => {
    it("debería crear proveedor exitosamente", async () => {
      const { createLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(null); // No existe
      mockPrisma.logisticProvider.create.mockResolvedValue(mockProvider);

      // Act
      const result = await createLogisticProvider(mockProviderData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toEqual(mockProvider);

      expect(mockPrisma.logisticProvider.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          name: mockProviderData.name,
        },
      });

      expect(mockPrisma.logisticProvider.create).toHaveBeenCalledWith({
        data: {
          ...mockProviderData,
          organizationId: "org-1",
        },
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith("/logistic");
    });

    it("debería retornar error cuando no hay sesión", async () => {
      const { createLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await createLogisticProvider(mockProviderData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
    });

    it("debería retornar error cuando ya existe un proveedor con ese nombre", async () => {
      const { createLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(mockProvider); // Ya existe

      // Act
      const result = await createLogisticProvider(mockProviderData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Ya existe un proveedor de logística con ese nombre.");
    });

    it("debería manejar errores de validación", async () => {
      const { createLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);

      // Usar un data simplificado que causará error de validación sin problemas de tipos
      const invalidData = {
        name: "", // Nombre vacío - fallará validación
      } as any;

      // Act
      const result = await createLogisticProvider(invalidData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al crear el proveedor de logística.");
    });
  });

  describe("updateLogisticProvider", () => {
    it("debería actualizar proveedor exitosamente", async () => {
      const { updateLogisticProvider } = await import("../logistic-providers");

      // Arrange
      const updatedData = {
        ...mockProviderData,
        name: "Proveedor Actualizado",
      };

      const updatedProvider = {
        ...mockProvider,
        ...updatedData,
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValueOnce(mockProvider); // Existe
      mockPrisma.logisticProvider.findFirst.mockResolvedValueOnce(null); // No hay duplicados
      mockPrisma.logisticProvider.update.mockResolvedValue(updatedProvider);

      // Act
      const result = await updateLogisticProvider(1, updatedData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toEqual(updatedProvider);

      expect(mockPrisma.logisticProvider.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updatedData,
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith("/logistic");
    });

    it("debería retornar error cuando el proveedor no existe", async () => {
      const { updateLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(null); // No existe

      // Act
      const result = await updateLogisticProvider(999, mockProviderData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Proveedor no encontrado.");
    });

    it("debería retornar error cuando hay nombre duplicado", async () => {
      const { updateLogisticProvider } = await import("../logistic-providers");

      // Arrange
      const updatedData = {
        ...mockProviderData,
        name: "Nombre Duplicado",
      };

      const existingProvider = {
        ...mockProvider,
        name: "Nombre Original",
      };

      const duplicateProvider = {
        id: 2,
        name: "Nombre Duplicado",
        organizationId: "org-1",
      };

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValueOnce(existingProvider); // Existe
      mockPrisma.logisticProvider.findFirst.mockResolvedValueOnce(duplicateProvider); // Hay duplicado

      // Act
      const result = await updateLogisticProvider(1, updatedData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Ya existe un proveedor de logística con ese nombre.");
    });
  });

  describe("getLogisticProviders", () => {
    it("debería obtener proveedores exitosamente", async () => {
      const { getLogisticProviders } = await import("../logistic-providers");

      // Arrange
      const mockProviders = [mockProvider];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findMany.mockResolvedValue(mockProviders);

      // Act
      const result = await getLogisticProviders();

      // Assert
      expect(result.success).toBe(true);
      expect(result.providers).toEqual(mockProviders);

      expect(mockPrisma.logisticProvider.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { name: "asc" },
      });
    });

    it("debería retornar error cuando no hay sesión", async () => {
      const { getLogisticProviders } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await getLogisticProviders();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.providers).toEqual([]);
    });

    it("debería manejar errores de base de datos", async () => {
      const { getLogisticProviders } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findMany.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await getLogisticProviders();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al obtener proveedores de logística.");
      expect(result.providers).toEqual([]);
    });
  });

  describe("getLogisticProviderById", () => {
    it("debería obtener proveedor por ID exitosamente", async () => {
      const { getLogisticProviderById } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(mockProvider);

      // Act
      const result = await getLogisticProviderById(1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider).toEqual(mockProvider);

      expect(mockPrisma.logisticProvider.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          organizationId: "org-1",
        },
      });
    });

    it("debería retornar error cuando no se encuentra el proveedor", async () => {
      const { getLogisticProviderById } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(null);

      // Act
      const result = await getLogisticProviderById(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Proveedor no encontrado.");
    });
  });

  describe("deleteLogisticProvider", () => {
    it("debería eliminar proveedor exitosamente", async () => {
      const { deleteLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(mockProvider);
      mockPrisma.motorcycleTransfer.findMany.mockResolvedValue([]); // Sin transferencias activas
      mockPrisma.logisticProvider.delete.mockResolvedValue(mockProvider);

      // Act
      const result = await deleteLogisticProvider(1);

      // Assert
      expect(result.success).toBe(true);

      expect(mockPrisma.logisticProvider.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith("/logistic");
    });

    it("debería retornar error cuando el proveedor no existe", async () => {
      const { deleteLogisticProvider } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(null);

      // Act
      const result = await deleteLogisticProvider(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Proveedor no encontrado.");
    });

    it("debería retornar error cuando hay transferencias activas", async () => {
      const { deleteLogisticProvider } = await import("../logistic-providers");

      // Arrange
      const activeTransfers = [
        { id: 1, status: "IN_TRANSIT" },
        { id: 2, status: "REQUESTED" },
      ];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findFirst.mockResolvedValue(mockProvider);
      mockPrisma.motorcycleTransfer.findMany.mockResolvedValue(activeTransfers);

      // Act
      const result = await deleteLogisticProvider(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No se puede eliminar el proveedor porque tiene transferencias activas.",
      );
    });
  });

  describe("getActiveLogisticProvidersForSelect", () => {
    it("debería obtener proveedores activos para select", async () => {
      const { getActiveLogisticProvidersForSelect } = await import("../logistic-providers");

      // Arrange
      const activeProviders = [
        { id: 1, name: "Proveedor 1" },
        { id: 2, name: "Proveedor 2" },
      ];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findMany.mockResolvedValue(activeProviders);

      // Act
      const result = await getActiveLogisticProvidersForSelect();

      // Assert
      expect(result).toEqual(activeProviders);

      expect(mockPrisma.logisticProvider.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          status: "activo",
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      });
    });

    it("debería retornar array vacío cuando no hay sesión", async () => {
      const { getActiveLogisticProvidersForSelect } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await getActiveLogisticProvidersForSelect();

      // Assert
      expect(result).toEqual([]);
    });

    it("debería manejar errores de base de datos", async () => {
      const { getActiveLogisticProvidersForSelect } = await import("../logistic-providers");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.logisticProvider.findMany.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await getActiveLogisticProvidersForSelect();

      // Assert
      expect(result).toEqual([]);
    });
  });
});

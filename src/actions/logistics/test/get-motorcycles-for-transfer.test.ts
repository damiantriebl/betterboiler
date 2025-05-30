import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
const mockPrisma = {
  motorcycle: {
    findMany: vi.fn(),
  },
  branch: {
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
vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: mockGetOrganizationIdFromSession,
}));

describe("get-motorcycles-for-transfer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  const mockMotorcycles = [
    {
      id: 1,
      chassisNumber: "ABC123",
      year: 2023,
      retailPrice: 50000,
      currency: "USD",
      state: "STOCK",
      imageUrl: "https://example.com/image.jpg",
      brand: { name: "Honda" },
      model: { name: "CBR600" },
      color: { name: "Rojo" },
      branch: { id: 1, name: "Sucursal A" },
    },
    {
      id: 2,
      chassisNumber: "DEF456",
      year: 2022,
      retailPrice: 45000,
      currency: "USD",
      state: "STOCK",
      imageUrl: "https://example.com/image2.jpg",
      brand: { name: "Yamaha" },
      model: { name: "R6" },
      color: { name: "Azul" },
      branch: { id: 2, name: "Sucursal B" },
    },
  ];

  describe("getMotorcyclesForTransfer", () => {
    it("debería obtener motocicletas exitosamente", async () => {
      const { getMotorcyclesForTransfer } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);

      // Act
      const result = await getMotorcyclesForTransfer();

      // Assert
      expect(result.success).toBe(true);
      expect(result.motorcycles).toEqual(mockMotorcycles);

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          state: "STOCK",
          transfers: {
            none: {
              status: { in: ["REQUESTED", "CONFIRMED", "IN_TRANSIT"] },
            },
          },
        },
        select: {
          id: true,
          chassisNumber: true,
          year: true,
          retailPrice: true,
          currency: true,
          state: true,
          imageUrl: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          color: { select: { name: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: [
          { brand: { name: "asc" } },
          { model: { name: "asc" } },
          { year: "desc" },
          { chassisNumber: "asc" },
        ],
      });
    });

    it("debería filtrar por sucursal", async () => {
      const { getMotorcyclesForTransfer } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycles[0]]);

      // Act
      const result = await getMotorcyclesForTransfer({ branchId: 1 });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 1,
          }),
        }),
      );
    });

    it("debería filtrar por búsqueda", async () => {
      const { getMotorcyclesForTransfer } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycles[0]]);

      // Act
      const result = await getMotorcyclesForTransfer({ search: "Honda" });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { chassisNumber: { contains: "honda", mode: "insensitive" } },
              { brand: { name: { contains: "honda", mode: "insensitive" } } },
              { model: { name: { contains: "honda", mode: "insensitive" } } },
            ],
          }),
        }),
      );
    });

    it("debería retornar error cuando no hay sesión", async () => {
      const { getMotorcyclesForTransfer } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await getMotorcyclesForTransfer();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.motorcycles).toEqual([]);
    });

    it("debería retornar error cuando no hay organización", async () => {
      const { getMotorcyclesForTransfer } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(null);

      // Act
      const result = await getMotorcyclesForTransfer();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.motorcycles).toEqual([]);
    });

    it("debería manejar errores de base de datos", async () => {
      const { getMotorcyclesForTransfer } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findMany.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await getMotorcyclesForTransfer();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al obtener motocicletas para transferencia.");
      expect(result.motorcycles).toEqual([]);
    });
  });

  describe("getMotorcyclesByBranch", () => {
    it("debería llamar a getMotorcyclesForTransfer con branchId", async () => {
      const { getMotorcyclesByBranch } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycles[0]]);

      // Act
      const result = await getMotorcyclesByBranch(1);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 1,
          }),
        }),
      );
    });
  });

  describe("getMotorcycleStatsByBranch", () => {
    it("debería obtener estadísticas por sucursal exitosamente", async () => {
      const { getMotorcycleStatsByBranch } = await import("../get-motorcycles-for-transfer");

      // Arrange
      const mockStats = [
        {
          id: 1,
          name: "Sucursal A",
          _count: {
            motorcycles: 5,
          },
        },
        {
          id: 2,
          name: "Sucursal B",
          _count: {
            motorcycles: 3,
          },
        },
      ];

      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.branch.findMany.mockResolvedValue(mockStats);

      // Act
      const result = await getMotorcycleStatsByBranch();

      // Assert
      expect(result.success).toBe(true);
      expect(result.stats).toEqual([
        {
          branchId: 1,
          branchName: "Sucursal A",
          motorcycleCount: 5,
        },
        {
          branchId: 2,
          branchName: "Sucursal B",
          motorcycleCount: 3,
        },
      ]);

      expect(mockPrisma.branch.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        include: {
          _count: {
            select: {
              motorcycles: {
                where: {
                  state: "STOCK",
                  transfers: {
                    none: {
                      status: { in: ["REQUESTED", "CONFIRMED", "IN_TRANSIT"] },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });
    });

    it("debería retornar error cuando no hay sesión", async () => {
      const { getMotorcycleStatsByBranch } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await getMotorcycleStatsByBranch();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.stats).toEqual([]);
    });

    it("debería manejar errores de base de datos", async () => {
      const { getMotorcycleStatsByBranch } = await import("../get-motorcycles-for-transfer");

      // Arrange
      mockAuth.api.getSession.mockResolvedValue(mockValidSession);
      mockGetOrganizationIdFromSession.mockResolvedValue(mockValidOrganization);
      mockPrisma.branch.findMany.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await getMotorcycleStatsByBranch();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al obtener estadísticas de motocicletas.");
      expect(result.stats).toEqual([]);
    });
  });
});

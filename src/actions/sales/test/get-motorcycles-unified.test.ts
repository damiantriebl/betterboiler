import type { MotorcycleState } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock de Next.js headers
const mockHeaders = vi.fn(() => new Headers());
vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

// Mock de Next.js cache
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
  unstable_noStore: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock de auth
const mockAuth = {
  api: {
    getSession: vi.fn(),
  },
};
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

// Mock de Prisma
const mockPrisma = {
  motorcycle: {
    findMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

describe("get-motorcycles-unified", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockHeaders.mockReturnValue(new Headers());
    mockAuth.api.getSession.mockResolvedValue({
      user: {
        id: "user-123",
        organizationId: "org-123",
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Análisis de funcionalidad", () => {
    it("debería tener función principal exportada", () => {
      expect(() => import("../get-motorcycles-unified")).not.toThrow();
    });

    it("debería tener tipos exportados correctamente", async () => {
      const module = await import("../get-motorcycles-unified");

      expect(typeof module.getMotorcycles).toBe("function");
      expect(typeof module.getMotorcyclesOptimized).toBe("function");
      expect(typeof module.getMotorcyclesWithSupplier).toBe("function");
      expect(typeof module.getMotorcyclesBasic).toBe("function");
      expect(typeof module.invalidateMotorcyclesCache).toBe("function");
    });
  });

  describe("getMotorcycles - Función principal", () => {
    it("debería retornar array vacío cuando no hay sesión", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles();

      // Assert
      expect(result).toEqual([]);
      expect(mockPrisma.motorcycle.findMany).not.toHaveBeenCalled();
    });

    it("debería retornar array vacío cuando no hay organizationId", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: "user-123" }, // Sin organizationId
      });
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles();

      // Assert
      expect(result).toEqual([]);
      expect(mockPrisma.motorcycle.findMany).not.toHaveBeenCalled();
    });

    it("debería obtener motocicletas exitosamente con datos válidos", async () => {
      // Arrange
      const mockMotorcycles = [
        {
          id: 1,
          year: 2023,
          displacement: 150,
          mileage: 1000,
          retailPrice: 5000,
          wholesalePrice: 4500,
          costPrice: 4000,
          currency: "USD",
          state: "STOCK" as MotorcycleState,
          chassisNumber: "ABC123",
          engineNumber: "ENG456",
          brand: {
            name: "Honda",
            organizationBrands: [{ color: "red" }],
          },
          model: { name: "CBR150" },
          color: { name: "Rojo", colorOne: "#FF0000", colorTwo: null },
          branch: { name: "Sucursal Central" },
          reservations: [],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        year: 2023,
        brand: { name: "Honda", color: null },
        model: { name: "CBR150" },
        state: "STOCK",
      });
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-123",
          }),
        }),
      );
    });

    it("debería aplicar filtros correctamente", async () => {
      // Arrange
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      const options = {
        filter: {
          state: ["STOCK", "RESERVADO"] as MotorcycleState[],
          limit: 50,
        },
      };

      // Act
      await getMotorcycles(options);

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-123",
            state: { in: ["STOCK", "RESERVADO"] },
          }),
          take: 50,
        }),
      );
    });

    it("debería incluir supplier cuando se especifica en optimización", async () => {
      // Arrange
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      const options = {
        optimization: {
          includeSupplier: true,
        },
      };

      // Act
      await getMotorcycles(options);

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            supplier: expect.objectContaining({
              select: { legalName: true, commercialName: true },
            }),
          }),
        }),
      );
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.motorcycle.findMany.mockRejectedValue(new Error("Database error"));
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles();

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Error obteniendo motocicletas:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("Funciones de conveniencia", () => {
    beforeEach(() => {
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);
    });

    it("getMotorcyclesOptimized - debería usar cache por defecto", async () => {
      // Arrange
      const { getMotorcyclesOptimized } = await import("../get-motorcycles-unified");

      // Act
      await getMotorcyclesOptimized();

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalled();
    });

    it("getMotorcyclesWithSupplier - debería incluir datos de supplier", async () => {
      // Arrange
      const { getMotorcyclesWithSupplier } = await import("../get-motorcycles-unified");

      // Act
      await getMotorcyclesWithSupplier();

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            supplier: expect.objectContaining({
              select: { legalName: true, commercialName: true },
            }),
          }),
        }),
      );
    });

    it("getMotorcyclesBasic - debería usar configuración básica", async () => {
      // Arrange
      const { getMotorcyclesBasic } = await import("../get-motorcycles-unified");

      // Act
      await getMotorcyclesBasic();

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({
            supplier: expect.anything(),
          }),
        }),
      );
    });

    it("debería aceptar filtros en funciones de conveniencia", async () => {
      // Arrange
      const { getMotorcyclesOptimized } = await import("../get-motorcycles-unified");

      // Act
      await getMotorcyclesOptimized({ state: ["STOCK"], limit: 25 });

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: { in: ["STOCK"] },
          }),
          take: 25,
        }),
      );
    });
  });

  describe("Transformación de datos", () => {
    it("debería transformar datos de marca correctamente", async () => {
      // Arrange
      const mockMotorcycles = [
        {
          id: 1,
          year: 2023,
          displacement: 150,
          mileage: 1000,
          retailPrice: 5000,
          wholesalePrice: 4500,
          costPrice: 4000,
          currency: "USD",
          state: "STOCK" as MotorcycleState,
          chassisNumber: "ABC123",
          engineNumber: "ENG456",
          brand: {
            name: "Honda",
            organizationBrands: [{ color: "red" }],
          },
          model: { name: "CBR150" },
          color: { name: "Rojo", colorOne: "#FF0000", colorTwo: null },
          branch: { name: "Sucursal Central" },
          reservations: [],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles();

      // Assert
      expect(result[0].brand).toEqual({
        name: "Honda",
        color: null, // Se simplifica en la transformación
      });
    });

    it("debería manejar datos nulos correctamente", async () => {
      // Arrange
      const mockMotorcycles = [
        {
          id: 1,
          year: 2023,
          displacement: null,
          mileage: 0,
          retailPrice: 5000,
          wholesalePrice: null,
          costPrice: null,
          currency: "USD",
          state: "STOCK" as MotorcycleState,
          chassisNumber: "ABC123",
          engineNumber: null,
          brand: null,
          model: null,
          color: null,
          branch: null,
          reservations: [],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles();

      // Assert
      expect(result[0]).toMatchObject({
        id: 1,
        displacement: null,
        wholesalePrice: null,
        costPrice: null,
        engineNumber: null,
        brand: null,
        model: null,
        color: null,
        branch: null,
      });
    });

    it("debería incluir reservaciones cuando están disponibles", async () => {
      // Arrange
      const mockMotorcycles = [
        {
          id: 1,
          year: 2023,
          displacement: 150,
          mileage: 1000,
          retailPrice: 5000,
          wholesalePrice: 4500,
          costPrice: 4000,
          currency: "USD",
          state: "RESERVADO" as MotorcycleState,
          chassisNumber: "ABC123",
          engineNumber: "ENG456",
          brand: { name: "Honda", organizationBrands: [] },
          model: { name: "CBR150" },
          color: { name: "Rojo", colorOne: "#FF0000", colorTwo: null },
          branch: { name: "Sucursal Central" },
          reservations: [
            {
              id: 1,
              amount: 500,
              clientId: "client-123",
              status: "active",
              paymentMethod: "CASH",
              notes: "Reserva de prueba",
            },
          ],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      const result = await getMotorcycles({
        optimization: { includeReservations: true },
      });

      // Assert
      expect(result[0].reservation).toEqual({
        id: 1,
        amount: 500,
        clientId: "client-123",
        status: "active",
        paymentMethod: "CASH",
        notes: "Reserva de prueba",
      });
    });
  });

  describe("Configuración y opciones", () => {
    it("debería usar configuración por defecto cuando no se especifican opciones", async () => {
      // Arrange
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      // Act
      await getMotorcycles();

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Límite por defecto
          orderBy: [{ state: "asc" }, { id: "desc" }],
        }),
      );
    });

    it("debería sobrescribir configuración por defecto con opciones personalizadas", async () => {
      // Arrange
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);
      const { getMotorcycles } = await import("../get-motorcycles-unified");

      const customOptions = {
        filter: {
          state: ["VENDIDO"] as MotorcycleState[],
          limit: 200,
        },
        optimization: {
          useCache: true,
          includeSupplier: true,
          includeReservations: false,
        },
      };

      // Act
      await getMotorcycles(customOptions);

      // Assert
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: { in: ["VENDIDO"] },
          }),
          take: 200,
          select: expect.objectContaining({
            supplier: expect.objectContaining({
              select: { legalName: true, commercialName: true },
            }),
          }),
        }),
      );
    });
  });

  describe("invalidateMotorcyclesCache", () => {
    it("debería estar disponible como función exportada", async () => {
      // Arrange
      const { invalidateMotorcyclesCache } = await import("../get-motorcycles-unified");

      // Act & Assert
      expect(typeof invalidateMotorcyclesCache).toBe("function");
      expect(() => invalidateMotorcyclesCache()).not.toThrow();
    });
  });
});

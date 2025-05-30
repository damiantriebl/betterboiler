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

// Mock de getOrganizationIdFromSession
const mockGetOrganizationIdFromSession = vi.fn();
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: mockGetOrganizationIdFromSession,
}));

// Mock de Prisma
const mockPrisma = {
  motorcycle: {
    groupBy: vi.fn(),
  },
  brand: {
    findMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

describe("get-inventory-report-unified", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockHeaders.mockReturnValue(new Headers());
    mockGetOrganizationIdFromSession.mockResolvedValue({
      organizationId: "org-123",
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getInventoryStatusReport - Función principal", () => {
    it("debería retornar reporte vacío cuando no hay organización", async () => {
      // Arrange
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: null,
        error: "Sesión no válida",
      });
      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      const result = await getInventoryStatusReport();

      // Assert
      expect(result).toEqual({
        summary: {
          total: 0,
          inStock: 0,
          reserved: 0,
          sold: 0,
        },
        byState: [],
        byBrand: [],
        valueByState: [],
      });
      expect(mockPrisma.motorcycle.groupBy).not.toHaveBeenCalled();
    });

    it("debería obtener reporte de inventario exitosamente", async () => {
      // Arrange
      const mockStateGroups = [
        { state: "STOCK", _count: { _all: 5 } },
        { state: "RESERVADO", _count: { _all: 2 } },
        { state: "VENDIDO", _count: { _all: 3 } },
      ];

      const mockBrandGroups = [
        { brandId: 1, _count: { _all: 4 } },
        { brandId: 2, _count: { _all: 6 } },
      ];

      const mockValueGroups = [
        {
          state: "STOCK",
          currency: "USD",
          _sum: { retailPrice: 25000, costPrice: 20000 },
        },
        {
          state: "VENDIDO",
          currency: "USD",
          _sum: { retailPrice: 15000, costPrice: 12000 },
        },
      ];

      const mockBrands = [
        { id: 1, name: "Honda" },
        { id: 2, name: "Yamaha" },
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce(mockStateGroups) // Para getStateGroups
        .mockResolvedValueOnce(mockBrandGroups) // Para getBrandGroups
        .mockResolvedValueOnce(mockValueGroups); // Para getValueByState

      mockPrisma.brand.findMany.mockResolvedValue(mockBrands);

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      const result = await getInventoryStatusReport();

      // Assert
      expect(result.summary).toEqual({
        total: 10,
        inStock: 5,
        reserved: 2,
        sold: 3,
      });

      expect(result.byState).toEqual([
        { state: "STOCK", _count: 5 },
        { state: "RESERVADO", _count: 2 },
        { state: "VENDIDO", _count: 3 },
      ]);

      expect(result.byBrand).toEqual([
        { brandId: 1, brandName: "Honda", _count: 4 },
        { brandId: 2, brandName: "Yamaha", _count: 6 },
      ]);

      expect(result.valueByState).toEqual([
        {
          state: "STOCK",
          currency: "USD",
          _sum: { retailPrice: 25000, costPrice: 20000 },
        },
        {
          state: "VENDIDO",
          currency: "USD",
          _sum: { retailPrice: 15000, costPrice: 12000 },
        },
      ]);
    });

    it("debería aplicar filtros de fecha correctamente", async () => {
      // Arrange
      mockPrisma.motorcycle.groupBy.mockResolvedValue([]);
      mockPrisma.brand.findMany.mockResolvedValue([]);

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      const dateRange = {
        from: new Date("2024-01-01"),
        to: new Date("2024-12-31"),
      };

      // Act
      await getInventoryStatusReport(dateRange);

      // Assert
      expect(mockPrisma.motorcycle.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-123",
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          }),
        }),
      );
    });

    it("debería manejar marcas desconocidas", async () => {
      // Arrange
      const mockBrandGroups = [
        { brandId: 999, _count: { _all: 2 } }, // Marca que no existe
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce([]) // Estados
        .mockResolvedValueOnce(mockBrandGroups) // Marcas
        .mockResolvedValueOnce([]); // Valores

      mockPrisma.brand.findMany.mockResolvedValue([]); // No encuentra la marca

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      const result = await getInventoryStatusReport();

      // Assert
      expect(result.byBrand).toEqual([{ brandId: 999, brandName: "Desconocida", _count: 2 }]);
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.motorcycle.groupBy.mockRejectedValue(new Error("Database error"));

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      const result = await getInventoryStatusReport();

      // Assert
      expect(result).toEqual({
        summary: {
          total: 0,
          inStock: 0,
          reserved: 0,
          sold: 0,
        },
        byState: [],
        byBrand: [],
        valueByState: [],
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error obteniendo reporte de inventario:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Funciones de conveniencia", () => {
    beforeEach(() => {
      mockPrisma.motorcycle.groupBy.mockResolvedValue([]);
      mockPrisma.brand.findMany.mockResolvedValue([]);
    });

    it("getInventoryStatusReportBasic - debería funcionar sin análisis de valores", async () => {
      // Arrange
      const { getInventoryStatusReportBasic } = await import("../get-inventory-report-unified");

      // Act
      await getInventoryStatusReportBasic();

      // Assert
      // Debería llamar solo 2 veces groupBy (estados y marcas, no valores)
      expect(mockPrisma.motorcycle.groupBy).toHaveBeenCalledTimes(2);
    });

    it("getInventoryStatusReportDetailed - debería incluir análisis de valores", async () => {
      // Arrange
      const { getInventoryStatusReportDetailed } = await import("../get-inventory-report-unified");

      // Act
      await getInventoryStatusReportDetailed();

      // Assert
      // Debería llamar 3 veces groupBy (estados, marcas y valores)
      expect(mockPrisma.motorcycle.groupBy).toHaveBeenCalledTimes(3);
    });

    it("getInventoryStatusReportCached - debería usar cache", async () => {
      // Arrange
      const { getInventoryStatusReportCached } = await import("../get-inventory-report-unified");

      // Act
      await getInventoryStatusReportCached();

      // Assert
      expect(mockPrisma.motorcycle.groupBy).toHaveBeenCalled();
    });

    it("invalidateInventoryReportCache - debería estar disponible", async () => {
      // Arrange
      const { invalidateInventoryReportCache } = await import("../get-inventory-report-unified");

      // Act & Assert
      expect(typeof invalidateInventoryReportCache).toBe("function");
      expect(() => invalidateInventoryReportCache()).not.toThrow();
    });
  });

  describe("Casos edge y optimización", () => {
    it("debería manejar datos vacíos correctamente", async () => {
      // Arrange
      mockPrisma.motorcycle.groupBy.mockResolvedValue([]);
      mockPrisma.brand.findMany.mockResolvedValue([]);

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      const result = await getInventoryStatusReport();

      // Assert
      expect(result.summary.total).toBe(0);
      expect(result.byState).toEqual([]);
      expect(result.byBrand).toEqual([]);
      expect(result.valueByState).toEqual([]);
    });

    it("debería optimizar consultas ejecutándolas en paralelo", async () => {
      // Arrange
      const callOrder: string[] = [];

      mockPrisma.motorcycle.groupBy.mockImplementation(async (params) => {
        if (params.by.includes("state") && !params.by.includes("currency")) {
          callOrder.push("states");
          return [];
        }
        if (params.by.includes("brandId")) {
          callOrder.push("brands");
          return [];
        }
        if (params.by.includes("currency")) {
          callOrder.push("values");
          return [];
        }
        return [];
      });

      mockPrisma.brand.findMany.mockImplementation(async () => {
        callOrder.push("brand-names");
        return [];
      });

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      await getInventoryStatusReport();

      // Assert
      // Las consultas de estados, marcas y valores deberían ejecutarse en paralelo
      expect(callOrder).toEqual(["states", "brands", "values", "brand-names"]);
    });

    it("debería manejar múltiples monedas en valueByState", async () => {
      // Arrange
      const mockValueGroups = [
        {
          state: "STOCK",
          currency: "USD",
          _sum: { retailPrice: 10000, costPrice: 8000 },
        },
        {
          state: "STOCK",
          currency: "EUR",
          _sum: { retailPrice: 9000, costPrice: 7200 },
        },
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce([]) // Estados
        .mockResolvedValueOnce([]) // Marcas
        .mockResolvedValueOnce(mockValueGroups); // Valores

      mockPrisma.brand.findMany.mockResolvedValue([]);

      const { getInventoryStatusReport } = await import("../get-inventory-report-unified");

      // Act
      const result = await getInventoryStatusReport();

      // Assert
      expect(result.valueByState).toHaveLength(2);
      expect(result.valueByState[0].currency).toBe("USD");
      expect(result.valueByState[1].currency).toBe("EUR");
    });
  });
});

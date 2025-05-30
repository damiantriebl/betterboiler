import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { getInventoryStatusReport } from "../get-inventory-report-unified";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    motorcycle: {
      groupBy: vi.fn(),
    },
    brand: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Silenciar console durante los tests
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("getInventoryStatusReport", () => {
  const mockOrganizationId = "clfx1234567890abcdefghijk";

  const mockByStateData = [
    { state: MotorcycleState.STOCK, _count: 5 },
    { state: MotorcycleState.RESERVADO, _count: 3 },
    { state: MotorcycleState.VENDIDO, _count: 2 },
  ];

  const mockValueByStateData = [
    {
      state: MotorcycleState.STOCK,
      currency: "USD",
      _sum: { retailPrice: 250000, costPrice: 200000 },
    },
    {
      state: MotorcycleState.RESERVADO,
      currency: "USD",
      _sum: { retailPrice: 150000, costPrice: 120000 },
    },
    {
      state: MotorcycleState.VENDIDO,
      currency: "USD",
      _sum: { retailPrice: 100000, costPrice: 80000 },
    },
  ];

  const mockByBrandData = [
    { brandId: 1, _count: 8 },
    { brandId: 2, _count: 3 },
  ];

  const mockBrandsData = [
    { id: 1, name: "Honda" },
    { id: 2, name: "Yamaha" },
  ];

  const mockPrisma = prisma as any;
  const mockGetOrganization = getOrganizationIdFromSession as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();

    // Mock organización exitosa por defecto
    mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

    // Mock brands por defecto
    mockPrisma.brand.findMany.mockResolvedValue(mockBrandsData);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Casos exitosos", () => {
    it("debería generar reporte de inventario exitosamente", async () => {
      // Setup mocks para este test específico - ajustado para el formato correcto
      const mockByStateDataFormatted = [
        { state: MotorcycleState.STOCK, _count: { _all: 5 } },
        { state: MotorcycleState.RESERVADO, _count: { _all: 3 } },
        { state: MotorcycleState.VENDIDO, _count: { _all: 2 } },
      ];

      const mockValueByStateDataFormatted = [
        {
          state: MotorcycleState.STOCK,
          currency: "USD",
          _sum: { retailPrice: 250000, costPrice: 200000 },
        },
        {
          state: MotorcycleState.RESERVADO,
          currency: "USD",
          _sum: { retailPrice: 150000, costPrice: 120000 },
        },
        {
          state: MotorcycleState.VENDIDO,
          currency: "USD",
          _sum: { retailPrice: 100000, costPrice: 80000 },
        },
      ];

      const mockByBrandDataFormatted = [
        { brandId: 1, _count: { _all: 8 } },
        { brandId: 2, _count: { _all: 3 } },
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce(mockByStateDataFormatted) // Primera llamada - byState
        .mockResolvedValueOnce(mockByBrandDataFormatted) // Segunda llamada - byBrand
        .mockResolvedValueOnce(mockValueByStateDataFormatted); // Tercera llamada - valueByState

      const result = await getInventoryStatusReport();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(10); // 5 + 3 + 2
      expect(result.summary.inStock).toBe(5);
      expect(result.summary.reserved).toBe(3);
      expect(result.summary.sold).toBe(2);
    });

    it("debería generar reporte con rango de fechas", async () => {
      // Setup mocks para este test específico
      mockPrisma.motorcycle.groupBy.mockResolvedValue([]);

      const dateRange = {
        from: new Date("2024-01-01"),
        to: new Date("2024-01-31"),
      };

      await getInventoryStatusReport(dateRange);

      expect(mockPrisma.motorcycle.groupBy).toHaveBeenNthCalledWith(1, {
        by: ["state"],
        where: {
          organizationId: mockOrganizationId,
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        _count: {
          _all: true,
        },
      });
    });

    it("debería formatear correctamente los datos por estado", async () => {
      // Setup mocks para este test específico
      const mockByStateDataFormatted = [
        { state: MotorcycleState.STOCK, _count: { _all: 5 } },
        { state: MotorcycleState.RESERVADO, _count: { _all: 3 } },
        { state: MotorcycleState.VENDIDO, _count: { _all: 2 } },
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce(mockByStateDataFormatted) // byState
        .mockResolvedValueOnce([]) // byBrand
        .mockResolvedValueOnce([]); // valueByState

      const result = await getInventoryStatusReport();

      expect(result.byState).toEqual([
        { state: MotorcycleState.STOCK, _count: 5 },
        { state: MotorcycleState.RESERVADO, _count: 3 },
        { state: MotorcycleState.VENDIDO, _count: 2 },
      ]);
    });

    it("debería formatear correctamente los datos por marca", async () => {
      // Setup mocks para este test específico
      const mockByBrandDataFormatted = [
        { brandId: 1, _count: { _all: 8 } },
        { brandId: 2, _count: { _all: 3 } },
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce([]) // byState
        .mockResolvedValueOnce(mockByBrandDataFormatted) // byBrand
        .mockResolvedValueOnce([]); // valueByState

      const result = await getInventoryStatusReport();

      expect(result.byBrand).toEqual([
        { brandId: 1, brandName: "Honda", _count: 8 },
        { brandId: 2, brandName: "Yamaha", _count: 3 },
      ]);
    });

    it("debería manejar marcas no encontradas", async () => {
      const mockByBrandDataWithUnknown = [
        { brandId: 1, _count: { _all: 8 } },
        { brandId: 999, _count: { _all: 2 } },
      ];

      // Mock solo Honda encontrada
      mockPrisma.brand.findMany.mockResolvedValueOnce([{ id: 1, name: "Honda" }]);

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce([]) // byState
        .mockResolvedValueOnce(mockByBrandDataWithUnknown) // byBrand
        .mockResolvedValueOnce([]); // valueByState

      const result = await getInventoryStatusReport();

      expect(result.byBrand).toEqual([
        { brandId: 1, brandName: "Honda", _count: 8 },
        { brandId: 999, brandName: "Desconocida", _count: 2 },
      ]);
    });

    it("debería manejar valores nulos en _sum", async () => {
      const mockValueWithNulls = [
        {
          state: MotorcycleState.STOCK,
          currency: "USD",
          _sum: { retailPrice: null, costPrice: null },
        },
      ];

      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce([]) // byState
        .mockResolvedValueOnce([]) // byBrand
        .mockResolvedValueOnce(mockValueWithNulls); // valueByState con nulls

      const result = await getInventoryStatusReport();

      expect(result.valueByState[0]._sum).toEqual({
        retailPrice: 0,
        costPrice: 0,
      });
    });
  });

  describe("Casos de error", () => {
    it("debería devolver reporte vacío cuando no se puede obtener la organización", async () => {
      const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetOrganization.mockResolvedValue({
        organizationId: null,
        error: "Sesión no válida",
      });

      const result = await getInventoryStatusReport();

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

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error en getInventoryStatusReport: No se pudo obtener el ID de la organización. Mensaje de sesión:",
        "Sesión no válida",
      );

      mockConsoleError.mockRestore();
    });

    it("debería manejar error de base de datos", async () => {
      // Primer groupBy falla
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.motorcycle.groupBy.mockRejectedValueOnce(new Error("Database error"));

      const result = await getInventoryStatusReport();

      // El archivo unificado maneja errores y retorna reporte vacío
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

  describe("Casos edge", () => {
    it("debería manejar datos vacíos", async () => {
      // Mock datos vacíos
      mockPrisma.motorcycle.groupBy
        .mockResolvedValueOnce([]) // byState vacío
        .mockResolvedValueOnce([]) // byBrand vacío
        .mockResolvedValueOnce([]); // valueByState vacío

      mockPrisma.brand.findMany.mockResolvedValueOnce([]);

      const result = await getInventoryStatusReport();

      expect(result.summary).toEqual({
        total: 0,
        inStock: 0,
        reserved: 0,
        sold: 0,
      });
      expect(result.byState).toEqual([]);
      expect(result.valueByState).toEqual([]);
      expect(result.byBrand).toEqual([]);
    });

    it("debería verificar que se llame a Prisma con parámetros correctos", async () => {
      // Setup mocks para este test específico
      mockPrisma.motorcycle.groupBy.mockResolvedValue([]);

      await getInventoryStatusReport();

      expect(mockPrisma.motorcycle.groupBy).toHaveBeenNthCalledWith(1, {
        by: ["state"],
        where: {
          organizationId: mockOrganizationId,
        },
        _count: {
          _all: true,
        },
      });

      expect(mockPrisma.motorcycle.groupBy).toHaveBeenNthCalledWith(2, {
        by: ["brandId"],
        where: {
          organizationId: mockOrganizationId,
        },
        _count: {
          _all: true,
        },
      });

      expect(mockPrisma.motorcycle.groupBy).toHaveBeenNthCalledWith(3, {
        by: ["state", "currency"],
        where: {
          organizationId: mockOrganizationId,
        },
        _sum: {
          retailPrice: true,
          costPrice: true,
        },
      });
    });
  });
});

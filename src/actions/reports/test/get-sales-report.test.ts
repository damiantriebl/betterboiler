import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { getSalesReport } from "../get-sales-report";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    motorcycle: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Silenciar console durante los tests
vi.spyOn(console, "error").mockImplementation(() => {});

describe("getSalesReport", () => {
  const mockOrganizationId = "clfx1234567890abcdefghijk";

  const mockSale = {
    id: "clfxmoto1234567890abcd",
    retailPrice: 50000,
    costPrice: 40000,
    currency: "USD",
    soldAt: new Date("2024-01-15"),
    branchId: "clfxbranch123456789ab",
    sellerId: "clfxseller12345678901",
    branch: {
      id: "clfxbranch123456789ab",
      name: "Sucursal Centro",
    },
    seller: {
      id: "clfxseller12345678901",
      name: "Carlos Vendedor",
      email: "carlos@company.com",
    },
    brand: {
      name: "Honda",
    },
    model: {
      name: "CBR 600",
    },
  };

  const mockPrisma = prisma as any;
  const mockGetOrganization = getOrganizationIdFromSession as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
    mockPrisma.motorcycle.findMany.mockResolvedValue([mockSale]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Casos exitosos", () => {
    it("debería generar reporte de ventas exitosamente", async () => {
      const result = await getSalesReport();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalSales).toBe(1);
      expect(result.summary.totalRevenue).toEqual({ USD: 50000 });
      expect(result.summary.totalProfit).toEqual({ USD: 10000 });
      expect(result.summary.averagePrice).toEqual({ USD: 50000 });
    });

    it("debería generar reporte con rango de fechas", async () => {
      const dateRange = {
        from: new Date("2024-01-01"),
        to: new Date("2024-01-31"),
      };

      await getSalesReport(dateRange);

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: MotorcycleState.VENDIDO,
          soldAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        select: expect.any(Object),
      });
    });

    it("debería generar reporte solo con fecha desde", async () => {
      const dateRange = {
        from: new Date("2024-01-01"),
      };

      await getSalesReport(dateRange);

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: MotorcycleState.VENDIDO,
          soldAt: {
            gte: dateRange.from,
          },
        },
        select: expect.any(Object),
      });
    });

    it("debería agrupar ventas por vendedor correctamente", async () => {
      const mockSales = [
        {
          ...mockSale,
          retailPrice: 30000,
          costPrice: 25000,
        },
        {
          ...mockSale,
          id: "clfxmoto2234567890abcd",
          sellerId: "clfxseller22345678901",
          seller: {
            id: "clfxseller22345678901",
            name: "Ana Vendedora",
            email: "ana@company.com",
          },
          retailPrice: 20000,
          costPrice: 15000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.salesBySeller.clfxseller12345678901).toEqual({
        name: "Carlos Vendedor",
        count: 1,
        revenue: { USD: 30000 },
        profit: { USD: 5000 },
      });
      expect(result.salesBySeller.clfxseller22345678901).toEqual({
        name: "Ana Vendedora",
        count: 1,
        revenue: { USD: 20000 },
        profit: { USD: 5000 },
      });
    });

    it("debería agrupar ventas por sucursal correctamente", async () => {
      const mockSales = [
        {
          ...mockSale,
          retailPrice: 30000,
        },
        {
          ...mockSale,
          id: "clfxmoto2234567890abcd",
          branchId: "clfxbranch223456789ab",
          branch: {
            id: "clfxbranch223456789ab",
            name: "Sucursal Norte",
          },
          retailPrice: 25000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.salesByBranch.clfxbranch123456789ab).toEqual({
        name: "Sucursal Centro",
        count: 1,
        revenue: { USD: 30000 },
      });
      expect(result.salesByBranch.clfxbranch223456789ab).toEqual({
        name: "Sucursal Norte",
        count: 1,
        revenue: { USD: 25000 },
      });
    });

    it("debería agrupar ventas por mes correctamente", async () => {
      const mockSales = [
        {
          ...mockSale,
          soldAt: new Date("2024-01-15"),
          retailPrice: 30000,
        },
        {
          ...mockSale,
          id: "clfxmoto2234567890abcd",
          soldAt: new Date("2024-02-15"),
          retailPrice: 25000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.salesByMonth["2024-01"]).toEqual({
        count: 1,
        revenue: { USD: 30000 },
      });
      expect(result.salesByMonth["2024-02"]).toEqual({
        count: 1,
        revenue: { USD: 25000 },
      });
    });

    it("debería manejar múltiples monedas correctamente", async () => {
      const mockSales = [
        {
          ...mockSale,
          currency: "USD",
          retailPrice: 30000,
          costPrice: 25000,
        },
        {
          ...mockSale,
          id: "clfxmoto2234567890abcd",
          currency: "COP",
          retailPrice: 2500000,
          costPrice: 2000000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.summary.totalRevenue).toEqual({
        USD: 30000,
        COP: 2500000,
      });
      expect(result.summary.totalProfit).toEqual({
        USD: 5000,
        COP: 500000,
      });
      expect(result.summary.averagePrice).toEqual({
        USD: 30000,
        COP: 2500000,
      });
    });

    it("debería calcular precios promedio correctamente", async () => {
      const mockSales = [
        {
          ...mockSale,
          retailPrice: 30000,
        },
        {
          ...mockSale,
          id: "moto2",
          retailPrice: 20000,
        },
        {
          ...mockSale,
          id: "moto3",
          retailPrice: 40000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.summary.totalSales).toBe(3);
      expect(result.summary.totalRevenue.USD).toBe(90000);
      expect(result.summary.averagePrice.USD).toBe(30000); // 90000/3
    });

    it("debería manejar vendedor sin ID", async () => {
      const mockSaleWithoutSeller = {
        ...mockSale,
        sellerId: null,
        seller: null,
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockSaleWithoutSeller]);

      const result = await getSalesReport();

      expect(result.salesBySeller.unknown).toEqual({
        name: "Desconocido",
        count: 1,
        revenue: { USD: 50000 },
        profit: { USD: 10000 },
      });
    });

    it("debería manejar sucursal sin nombre", async () => {
      const mockSaleWithoutBranchName = {
        ...mockSale,
        branch: {
          id: "clfxbranch123456789ab",
          name: null,
        },
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockSaleWithoutBranchName]);

      const result = await getSalesReport();

      expect(result.salesByBranch.clfxbranch123456789ab.name).toBe("Desconocida");
    });
  });

  describe("Casos de error", () => {
    it("debería devolver reporte vacío cuando no se puede obtener la organización", async () => {
      mockGetOrganization.mockResolvedValue({
        organizationId: null,
        error: "Sesión no válida",
      });

      const result = await getSalesReport();

      expect(result).toEqual({
        summary: {
          totalSales: 0,
          totalRevenue: {},
          totalProfit: {},
          averagePrice: {},
        },
        salesBySeller: {},
        salesByBranch: {},
        salesByMonth: {},
      });
    });

    it("debería manejar error de base de datos", async () => {
      mockPrisma.motorcycle.findMany.mockRejectedValue(new Error("Database connection failed"));

      await expect(getSalesReport()).rejects.toThrow("Database connection failed");
    });

    it("debería manejar ventas sin precio de costo", async () => {
      const mockSaleWithoutCostPrice = {
        ...mockSale,
        costPrice: null,
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockSaleWithoutCostPrice]);

      const result = await getSalesReport();

      expect(result.summary.totalRevenue).toEqual({ USD: 50000 });
      expect(result.summary.totalProfit).toEqual({});
    });

    it("debería manejar ventas sin fecha de venta", async () => {
      const mockSaleWithoutSoldAt = {
        ...mockSale,
        soldAt: null,
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockSaleWithoutSoldAt]);

      const result = await getSalesReport();

      expect(result.salesByMonth).toEqual({});
    });
  });

  describe("Casos edge", () => {
    it("debería manejar lista vacía de ventas", async () => {
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);

      const result = await getSalesReport();

      expect(result.summary.totalSales).toBe(0);
      expect(result.summary.totalRevenue).toEqual({});
      expect(result.summary.totalProfit).toEqual({});
      expect(result.summary.averagePrice).toEqual({});
      expect(result.salesBySeller).toEqual({});
      expect(result.salesByBranch).toEqual({});
      expect(result.salesByMonth).toEqual({});
    });

    it("debería verificar que se llame a Prisma con parámetros correctos", async () => {
      await getSalesReport();

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: MotorcycleState.VENDIDO,
        },
        select: {
          id: true,
          retailPrice: true,
          costPrice: true,
          currency: true,
          soldAt: true,
          branchId: true,
          sellerId: true,
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          brand: {
            select: {
              name: true,
            },
          },
          model: {
            select: {
              name: true,
            },
          },
        },
      });
    });

    it("debería manejar ventas con diferentes vendedores en la misma sucursal", async () => {
      const mockSales = [
        {
          ...mockSale,
          sellerId: "seller1",
          seller: { id: "seller1", name: "Vendedor 1", email: "v1@company.com" },
          retailPrice: 30000,
          costPrice: 25000,
        },
        {
          ...mockSale,
          id: "moto2",
          sellerId: "seller2",
          seller: { id: "seller2", name: "Vendedor 2", email: "v2@company.com" },
          retailPrice: 20000,
          costPrice: 15000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.salesBySeller.seller1.count).toBe(1);
      expect(result.salesBySeller.seller2.count).toBe(1);
      expect(result.salesByBranch.clfxbranch123456789ab.count).toBe(2);
      expect(result.salesByBranch.clfxbranch123456789ab.revenue.USD).toBe(50000);
    });

    it("debería manejar múltiples ventas del mismo vendedor", async () => {
      const mockSales = [
        {
          ...mockSale,
          retailPrice: 30000,
          costPrice: 25000,
        },
        {
          ...mockSale,
          id: "moto2",
          retailPrice: 20000,
          costPrice: 15000,
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSalesReport();

      expect(result.salesBySeller.clfxseller12345678901.count).toBe(2);
      expect(result.salesBySeller.clfxseller12345678901.revenue.USD).toBe(50000);
      expect(result.salesBySeller.clfxseller12345678901.profit.USD).toBe(10000);
    });
  });
});

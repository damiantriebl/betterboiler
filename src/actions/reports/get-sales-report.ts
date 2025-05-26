"use server";

import prisma from "@/lib/prisma";
import type { SalesReport } from "@/types/reports";
import { MotorcycleState } from "@prisma/client";
import { getOrganizationIdFromSession } from "../util";

export async function getSalesReport(dateRange?: { from?: Date; to?: Date }): Promise<SalesReport> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) {
    console.error(
      "Error en getSalesReport: No se pudo obtener el ID de la organización. Mensaje de sesión:",
      org.error,
    );
    // Devolver una estructura SalesReport vacía/por defecto que coincida con el tipo
    return {
      summary: {
        totalSales: 0,
        totalRevenue: {},
        totalProfit: {},
        averagePrice: {},
      },
      salesBySeller: {},
      salesByBranch: {},
      salesByMonth: {},
    };
  }
  const organizationId = org.organizationId;
  // Obtener todas las motos vendidas
  const sales = await prisma.motorcycle.findMany({
    where: {
      organizationId,
      state: MotorcycleState.VENDIDO,
      ...(dateRange?.from && {
        soldAt: {
          gte: dateRange.from,
          ...(dateRange.to && { lte: dateRange.to }),
        },
      }),
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

  // Agrupar ventas por vendedor
  const salesBySeller = sales.reduce(
    (acc, sale) => {
      const sellerId = sale.sellerId || "unknown";
      const sellerName = sale.seller?.name || "Desconocido";

      if (!acc[sellerId]) {
        acc[sellerId] = {
          name: sellerName,
          count: 0,
          revenue: {},
          profit: {},
        };
      }

      acc[sellerId].count++;
      const currency = sale.currency;
      acc[sellerId].revenue[currency] = (acc[sellerId].revenue[currency] || 0) + sale.retailPrice;

      if (sale.costPrice) {
        acc[sellerId].profit[currency] =
          (acc[sellerId].profit[currency] || 0) + (sale.retailPrice - sale.costPrice);
      }

      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        count: number;
        revenue: Record<string, number>;
        profit: Record<string, number>;
      }
    >,
  );

  // Agrupar ventas por sucursal
  const salesByBranch = sales.reduce(
    (acc, sale) => {
      const branchId = sale.branchId.toString();
      const branchName = sale.branch?.name || "Desconocida";

      if (!acc[branchId]) {
        acc[branchId] = {
          name: branchName,
          count: 0,
          revenue: {},
        };
      }

      acc[branchId].count++;
      const currency = sale.currency;
      acc[branchId].revenue[currency] = (acc[branchId].revenue[currency] || 0) + sale.retailPrice;

      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        count: number;
        revenue: Record<string, number>;
      }
    >,
  );

  // Agrupar ventas por mes
  const salesByMonth = sales.reduce(
    (acc, sale) => {
      if (!sale.soldAt) return acc;

      const monthKey = sale.soldAt.toISOString().slice(0, 7); // Format: "YYYY-MM"

      if (!acc[monthKey]) {
        acc[monthKey] = {
          count: 0,
          revenue: {},
        };
      }

      acc[monthKey].count++;
      const currency = sale.currency;
      acc[monthKey].revenue[currency] = (acc[monthKey].revenue[currency] || 0) + sale.retailPrice;

      return acc;
    },
    {} as Record<
      string,
      {
        count: number;
        revenue: Record<string, number>;
      }
    >,
  );

  // Calcular resumen total
  const summary = sales.reduce(
    (acc, sale) => {
      acc.totalSales++;

      const currency = sale.currency;
      acc.totalRevenue[currency] = (acc.totalRevenue[currency] || 0) + sale.retailPrice;

      if (sale.costPrice) {
        acc.totalProfit[currency] =
          (acc.totalProfit[currency] || 0) + (sale.retailPrice - sale.costPrice);
      }

      // Calcular precio promedio
      if (!acc.salesCount[currency]) {
        acc.salesCount[currency] = 0;
      }
      acc.salesCount[currency]++;

      return acc;
    },
    {
      totalSales: 0,
      totalRevenue: {} as Record<string, number>,
      totalProfit: {} as Record<string, number>,
      salesCount: {} as Record<string, number>,
    },
  );

  // Calcular precios promedio
  const averagePrice = Object.entries(summary.totalRevenue).reduce(
    (acc, [currency, total]) => {
      acc[currency] = total / summary.salesCount[currency];
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    summary: {
      totalSales: summary.totalSales,
      totalRevenue: summary.totalRevenue,
      totalProfit: summary.totalProfit,
      averagePrice,
    },
    salesBySeller,
    salesByBranch,
    salesByMonth,
  };
}

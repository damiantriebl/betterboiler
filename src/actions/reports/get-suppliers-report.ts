"use server";

import prisma from "@/lib/prisma";

interface SuppliersReportFilters {
  organizationId: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  supplierId?: string;
}

interface SupplierSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  totalPurchases: {
    [key: string]: number; // Por moneda
  };
}

export async function getSuppliersReport(filters: SuppliersReportFilters) {
  const { organizationId, dateRange, supplierId } = filters;

  // Base query conditions for suppliers
  const whereConditions = {
    organizationId,
    ...(supplierId && { id: Number.parseInt(supplierId) }),
  };

  // Get suppliers data
  const suppliersData = await prisma.supplier.findMany({
    where: whereConditions,
    select: {
      id: true,
      legalName: true,
      commercialName: true,
      status: true,
      motorcycles: {
        where: dateRange
          ? {
              createdAt: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            }
          : undefined,
        select: {
          id: true,
          costPrice: true,
          currency: true,
          state: true,
        },
      },
    },
  });

  // Calcular resumen
  const summary: SupplierSummary = {
    totalSuppliers: suppliersData.length,
    activeSuppliers: suppliersData.filter((s) => s.status === "activo").length,
    inactiveSuppliers: suppliersData.filter((s) => s.status === "inactivo").length,
    totalPurchases: {},
  };

  // Calcular compras totales por proveedor y moneda
  const purchasesBySupplier = suppliersData.reduce(
    (acc, supplier) => {
      const supplierName = supplier.commercialName || supplier.legalName;
      if (!acc[supplierName]) {
        acc[supplierName] = {
          motorcyclesCount: 0,
          purchases: {},
        };
      }

      supplier.motorcycles.forEach((motorcycle) => {
        acc[supplierName].motorcyclesCount += 1;
        const currency = motorcycle.currency;
        if (!acc[supplierName].purchases[currency]) {
          acc[supplierName].purchases[currency] = 0;
        }
        if (motorcycle.costPrice) {
          acc[supplierName].purchases[currency] += motorcycle.costPrice;
          // Actualizar totales generales
          if (!summary.totalPurchases[currency]) {
            summary.totalPurchases[currency] = 0;
          }
          summary.totalPurchases[currency] += motorcycle.costPrice;
        }
      });

      return acc;
    },
    {} as { [key: string]: { motorcyclesCount: number; purchases: { [key: string]: number } } },
  );

  // Agrupar compras por mes
  const purchasesByMonth = suppliersData.reduce(
    (acc, supplier) => {
      supplier.motorcycles.forEach((motorcycle) => {
        const monthYear = motorcycle.createdAt?.toISOString().slice(0, 7); // YYYY-MM
        if (monthYear && motorcycle.costPrice) {
          if (!acc[monthYear]) {
            acc[monthYear] = {
              count: 0,
              amount: {},
            };
          }
          acc[monthYear].count += 1;
          const currency = motorcycle.currency;
          if (!acc[monthYear].amount[currency]) {
            acc[monthYear].amount[currency] = 0;
          }
          acc[monthYear].amount[currency] += motorcycle.costPrice;
        }
      });
      return acc;
    },
    {} as { [key: string]: { count: number; amount: { [key: string]: number } } },
  );

  return {
    summary,
    purchasesBySupplier,
    purchasesByMonth,
    supplierDetails: suppliersData.map((supplier) => ({
      id: supplier.id,
      name: supplier.commercialName || supplier.legalName,
      status: supplier.status,
      motorcyclesCount: supplier.motorcycles.length,
      totalPurchases: supplier.motorcycles.reduce(
        (acc, m) => {
          const currency = m.currency;
          if (!acc[currency]) acc[currency] = 0;
          if (m.costPrice) acc[currency] += m.costPrice;
          return acc;
        },
        {} as { [key: string]: number },
      ),
    })),
  };
}

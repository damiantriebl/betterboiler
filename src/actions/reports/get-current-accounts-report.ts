"use server";

import { getOrganizationIdFromSession } from "@/actions/util";
import prisma from "@/lib/prisma";
import type { DateRange } from "@/types/DateRange";
import type { Prisma } from "@prisma/client";

// Tipo para el reporte de cuentas corrientes
export type CurrentAccountsReportData = Prisma.CurrentAccountGetPayload<{
  include: {
    client: true;
    motorcycle: {
      include: {
        model: true;
        brand: true;
        color: true;
        branch: true;
        seller: true;
      };
    };
    payments: {
      orderBy: {
        paymentDate: "asc";
      };
    };
  };
}>;

export interface CurrentAccountsReportSummary {
  totalAccounts: number;
  totalFinancedAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  accountsByStatus: {
    status: string;
    count: number;
    totalAmount: number;
  }[];
  accountsByBranch: {
    branchName: string;
    count: number;
    totalAmount: number;
  }[];
  paymentsByMonth: {
    month: string;
    totalPayments: number;
    totalAmount: number;
  }[];
}

export interface CurrentAccountsReport {
  summary: CurrentAccountsReportSummary;
  accounts: CurrentAccountsReportData[];
}

export async function getCurrentAccountsReport(
  dateRange?: DateRange,
  branchId?: string,
  status?: string,
): Promise<CurrentAccountsReport> {
  try {
    const org = await getOrganizationIdFromSession();
    if (org.error || !org.organizationId) {
      throw new Error(org.error || "No se pudo obtener la organización");
    }

    // Configurar filtros
    const whereClause: Prisma.CurrentAccountWhereInput = {
      organizationId: org.organizationId,
    };

    // Filtro por estado
    if (status && status !== "all") {
      whereClause.status = status as any;
    }

    // Filtro por fecha (fecha de creación de la cuenta)
    if (dateRange?.from || dateRange?.to) {
      const now = new Date();
      const startDate = dateRange?.from || new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = dateRange?.to || new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const endDateForQuery = new Date(endDate);
      endDateForQuery.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startDate,
        lte: endDateForQuery,
      };
    }

    // Obtener las cuentas corrientes
    let accounts = await prisma.currentAccount.findMany({
      where: whereClause,
      include: {
        client: true,
        motorcycle: {
          include: {
            model: true,
            brand: true,
            color: true,
            branch: true,
            seller: true,
          },
        },
        payments: {
          orderBy: {
            paymentDate: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filtrar por sucursal después de obtener los datos
    if (branchId && branchId !== "all") {
      if (branchId === "__general__") {
        accounts = accounts.filter((account) => !account.motorcycle?.branch);
      } else {
        const branchIdNumber = Number.parseInt(branchId, 10);
        if (!Number.isNaN(branchIdNumber)) {
          accounts = accounts.filter(
            (account) => account.motorcycle?.branch?.id === branchIdNumber,
          );
        }
      }
    }

    // Calcular resumen
    const summary = calculateSummary(accounts);

    return {
      summary,
      accounts: accounts as CurrentAccountsReportData[],
    };
  } catch (error) {
    console.error("Error obteniendo reporte de cuentas corrientes:", error);
    throw new Error("Error al obtener los datos del reporte de cuentas corrientes");
  }
}

function calculateSummary(accounts: any[]): CurrentAccountsReportSummary {
  const totalAccounts = accounts.length;
  let totalFinancedAmount = 0;
  let totalPaidAmount = 0;

  // Contadores por estado
  const statusCounts: Record<string, { count: number; totalAmount: number }> = {};

  // Contadores por sucursal
  const branchCounts: Record<string, { count: number; totalAmount: number }> = {};

  // Pagos por mes
  const monthlyPayments: Record<string, { totalPayments: number; totalAmount: number }> = {};

  for (const account of accounts) {
    const financedAmount = account.totalAmount || 0;
    totalFinancedAmount += financedAmount;

    // Calcular total pagado
    const paidAmount = account.payments.reduce(
      (sum: number, payment: any) => sum + payment.amountPaid,
      0,
    );
    totalPaidAmount += paidAmount;

    // Contar por estado
    const status = account.status || "UNKNOWN";
    if (!statusCounts[status]) {
      statusCounts[status] = { count: 0, totalAmount: 0 };
    }
    statusCounts[status].count++;
    statusCounts[status].totalAmount += financedAmount;

    // Contar por sucursal
    const branchName = account.motorcycle?.branch?.name || "Sin Sucursal";
    if (!branchCounts[branchName]) {
      branchCounts[branchName] = { count: 0, totalAmount: 0 };
    }
    branchCounts[branchName].count++;
    branchCounts[branchName].totalAmount += financedAmount;

    // Agrupar pagos por mes
    for (const payment of account.payments) {
      const paymentDate = new Date(payment.paymentDate);
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyPayments[monthKey]) {
        monthlyPayments[monthKey] = { totalPayments: 0, totalAmount: 0 };
      }
      monthlyPayments[monthKey].totalPayments++;
      monthlyPayments[monthKey].totalAmount += payment.amountPaid;
    }
  }

  const totalPendingAmount = totalFinancedAmount - totalPaidAmount;

  return {
    totalAccounts,
    totalFinancedAmount,
    totalPaidAmount,
    totalPendingAmount,
    accountsByStatus: Object.entries(statusCounts).map(([status, data]) => ({
      status,
      count: data.count,
      totalAmount: data.totalAmount,
    })),
    accountsByBranch: Object.entries(branchCounts).map(([branchName, data]) => ({
      branchName,
      count: data.count,
      totalAmount: data.totalAmount,
    })),
    paymentsByMonth: Object.entries(monthlyPayments)
      .map(([month, data]) => ({
        month,
        totalPayments: data.totalPayments,
        totalAmount: data.totalAmount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

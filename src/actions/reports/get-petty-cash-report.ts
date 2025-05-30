"use server";

import { getOrganizationIdFromSession } from "@/actions/util";
import prisma from "@/lib/prisma";
import type { DateRange } from "@/types/DateRange";
import type { ReportDataForPdf } from "@/types/PettyCashActivity";

export async function getPettyCashReport(
  dateRange?: DateRange,
  branchId?: string,
): Promise<ReportDataForPdf[]> {
  try {
    const org = await getOrganizationIdFromSession();
    if (org.error || !org.organizationId) {
      throw new Error(org.error || "No se pudo obtener la organización");
    }

    // Configurar fechas por defecto si no se proporcionan
    const now = new Date();
    const startDate = dateRange?.from || new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = dateRange?.to || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Ajustar la fecha final para incluir todo el día
    const endDateForQuery = new Date(endDate);
    endDateForQuery.setHours(23, 59, 59, 999);

    // Configurar filtro de sucursal
    let branchCondition = {};
    if (branchId && branchId !== "all") {
      if (branchId === "__general__") {
        branchCondition = { branchId: null };
      } else {
        const branchIdNumber = Number.parseInt(branchId, 10);
        if (!Number.isNaN(branchIdNumber)) {
          branchCondition = { branchId: branchIdNumber };
        }
      }
    }

    const pettyCashDeposits = await prisma.pettyCashDeposit.findMany({
      where: {
        organizationId: org.organizationId,
        date: {
          gte: startDate,
          lte: endDateForQuery,
        },
        ...branchCondition,
      },
      include: {
        branch: true,
        withdrawals: {
          include: {
            spends: {
              orderBy: { date: "asc" },
            },
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { date: "asc" },
    });

    return pettyCashDeposits as ReportDataForPdf[];
  } catch (error) {
    console.error("Error obteniendo reporte de caja chica:", error);
    throw new Error("Error al obtener los datos del reporte de caja chica");
  }
}

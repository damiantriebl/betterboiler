"use server";

import prisma from "@/lib/prisma";
import type { ReportFilters } from "@/types/reports";
import { MotorcycleState } from "@prisma/client";

export async function getReservationsReport(filters: ReportFilters) {
  const organizationId = filters.organizationId;
  const dateRange = filters.dateRange;

  // Obtener todas las motos reservadas con sus detalles
  const motorcycles = await prisma.motorcycle.findMany({
    where: {
      organizationId,
      state: MotorcycleState.RESERVADO,
      ...(dateRange?.from && {
        updatedAt: {
          gte: dateRange.from,
          ...(dateRange.to && { lte: dateRange.to }),
        },
      }),
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
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
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      reservations: {
        select: {
          amount: true,
          currency: true,
          createdAt: true,
          status: true,
        },
      },
    },
  });

  // Calcular totales por moneda y estado
  const totalAmount: Record<string, number> = {};
  const reservationsByStatus: Record<string, { count: number; amount: Record<string, number> }> = {
    active: { count: 0, amount: {} },
    completed: { count: 0, amount: {} },
    cancelled: { count: 0, amount: {} },
    expired: { count: 0, amount: {} },
  };

  const reservationsByBranch: Record<
    string,
    {
      total: number;
      active: number;
      completed: number;
      cancelled: number;
      expired: number;
      amount: Record<string, number>;
    }
  > = {};

  // Procesar los datos para el reporte
  for (const motorcycle of motorcycles) {
    for (const reservation of motorcycle.reservations) {
      // Actualizar totales por moneda
      const currency = reservation.currency;
      if (!totalAmount[currency]) {
        totalAmount[currency] = 0;
      }
      totalAmount[currency] += reservation.amount;

      // Actualizar totales por estado
      const status = reservation.status;
      if (!reservationsByStatus[status]) {
        reservationsByStatus[status] = { count: 0, amount: {} };
      }
      reservationsByStatus[status].count++;
      reservationsByStatus[status].amount[currency] =
        (reservationsByStatus[status].amount[currency] || 0) + reservation.amount;

      // Actualizar totales por sucursal
      if (motorcycle.branch) {
        const branchId = motorcycle.branch.id;
        if (!reservationsByBranch[branchId]) {
          reservationsByBranch[branchId] = {
            total: 0,
            active: 0,
            completed: 0,
            cancelled: 0,
            expired: 0,
            amount: {},
          };
        }
        reservationsByBranch[branchId].total++;
        if (status === "active") reservationsByBranch[branchId].active++;
        else if (status === "completed") reservationsByBranch[branchId].completed++;
        else if (status === "cancelled") reservationsByBranch[branchId].cancelled++;
        else if (status === "expired") reservationsByBranch[branchId].expired++;

        reservationsByBranch[branchId].amount[currency] =
          (reservationsByBranch[branchId].amount[currency] || 0) + reservation.amount;
      }
    }
  }

  // Calcular totales para el resumen
  const totalReservations = motorcycles.length;
  const activeReservations = reservationsByStatus.active?.count || 0;
  const completedReservations = reservationsByStatus.completed?.count || 0;
  const cancelledReservations = reservationsByStatus.cancelled?.count || 0;
  const expiredReservations = reservationsByStatus.expired?.count || 0;

  // Calcular tasa de conversión (completadas / total)
  const conversionRate =
    totalReservations > 0 ? (completedReservations / totalReservations) * 100 : 0;

  return {
    summary: {
      totalReservations,
      activeReservations,
      completedReservations,
      cancelledReservations,
      expiredReservations,
      totalAmount,
      conversionRate,
    },
    reservationsByStatus,
    reservationsByBranch,
    reservationsByMonth: {}, // TODO: Implementar agrupación por mes si es necesario
  };
}

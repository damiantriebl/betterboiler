"use server";

import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";

interface ReservationsReportFilters {
  organizationId: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  branchId?: string;
  brandId?: string;
  modelId?: string;
}

interface ReservationSummary {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  expiredReservations: number;
  totalAmount: {
    [key: string]: number; // Por moneda
  };
  conversionRate: number;
}

export async function getReservationsReport(filters: ReservationsReportFilters) {
  const { organizationId, dateRange, branchId, brandId } = filters;

  // Base query conditions for reservations
  const whereConditions = {
    organizationId,
    ...(dateRange?.from && dateRange?.to && {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    }),
  };

  // Get reservations data
  const reservationsData = await prisma.reservation.findMany({
    where: whereConditions,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      motorcycle: {
        select: {
          id: true,
          brand: {
            select: {
              name: true,
            },
          },
          branch: {
            select: {
              name: true,
            },
          },
          state: true,
        },
      },
    },
  });

  // Agrupar reservas por estado
  const reservationsByStatus = reservationsData.reduce((acc, reservation) => {
    const status = reservation.status;
    if (!acc[status]) {
      acc[status] = {
        count: 0,
        amount: {},
      };
    }
    acc[status].count += 1;
    const currency = reservation.currency;
    if (!acc[status].amount[currency]) {
      acc[status].amount[currency] = 0;
    }
    acc[status].amount[currency] += reservation.amount;
    return acc;
  }, {} as { [key: string]: { count: number; amount: { [key: string]: number } } });

  // Calcular tasa de conversión
  const totalReservations = reservationsData.length;
  const completedReservations = reservationsData.filter(
    r => r.motorcycle.state === MotorcycleState.VENDIDO
  ).length;

  // Calcular resumen
  const summary: ReservationSummary = {
    totalReservations,
    activeReservations: reservationsByStatus["active"]?.count || 0,
    completedReservations: reservationsByStatus["completed"]?.count || 0,
    cancelledReservations: reservationsByStatus["cancelled"]?.count || 0,
    expiredReservations: reservationsByStatus["expired"]?.count || 0,
    totalAmount: Object.entries(reservationsByStatus).reduce((acc, [_, data]) => {
      Object.entries(data.amount).forEach(([currency, amount]) => {
        if (!acc[currency]) acc[currency] = 0;
        acc[currency] += amount;
      });
      return acc;
    }, {} as { [key: string]: number }),
    conversionRate: totalReservations ? (completedReservations / totalReservations) * 100 : 0,
  };

  // Agrupar reservas por sucursal
  const reservationsByBranch = reservationsData.reduce((acc, reservation) => {
    const branchName = reservation.motorcycle.branch?.name || "Unknown";
    if (!acc[branchName]) {
      acc[branchName] = {
        total: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
        amount: {},
      };
    }
    acc[branchName].total += 1;
    acc[branchName][reservation.status] += 1;
    const currency = reservation.currency;
    if (!acc[branchName].amount[currency]) {
      acc[branchName].amount[currency] = 0;
    }
    acc[branchName].amount[currency] += reservation.amount;
    return acc;
  }, {} as { [key: string]: { total: number; active: number; completed: number; cancelled: number; expired: number; amount: { [key: string]: number } } });

  return {
    summary,
    reservationsByStatus,
    reservationsByBranch,
    reservationsByMonth: reservationsData.reduce((acc, reservation) => {
      const monthYear = reservation.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[monthYear]) {
        acc[monthYear] = {
          total: 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          expired: 0,
          amount: {},
        };
      }
      acc[monthYear].total += 1;
      acc[monthYear][reservation.status] += 1;
      const currency = reservation.currency;
      if (!acc[monthYear].amount[currency]) {
        acc[monthYear].amount[currency] = 0;
      }
      acc[monthYear].amount[currency] += reservation.amount;
      return acc;
    }, {} as { [key: string]: { total: number; active: number; completed: number; cancelled: number; expired: number; amount: { [key: string]: number } } }),
  };
} 
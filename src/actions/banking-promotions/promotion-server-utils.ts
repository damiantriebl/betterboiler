"use server";

import prisma from "@/lib/prisma";
import { isPromotionActiveOnDay } from "@/utils/promotion-utils";
import type { Day } from "@/zod/banking-promotion-schemas";

// Tipo inferido de Prisma para las promociones bancarias
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaBankingPromotionWithRelations = any;

// Days of the week in Spanish (matches the schema definition)
const DAYS_OF_WEEK: Day[] = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

// Server-side version of getCurrentDayOfWeek
export async function getCurrentDayOfWeekServer(): Promise<Day> {
  const dayIndex = new Date().getDay();
  // JavaScript getDay() returns 0 for Sunday, so we need to adjust
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAYS_OF_WEEK[adjustedIndex];
}

// Filter promotions by active day - server version
export async function filterPromotionsByDayServer(
  promotions: PrismaBankingPromotionWithRelations[],
  day: Day,
): Promise<PrismaBankingPromotionWithRelations[]> {
  return promotions.filter((promotion) => {
    // If activeDays is empty or not defined, the promotion is active every day
    if (!promotion.activeDays || promotion.activeDays.length === 0) {
      return true;
    }

    // Check if the day is in the activeDays array
    return promotion.activeDays.includes(day);
  });
}

// Get promotions active for a specific day from the database
export async function getPromotionsForDay(
  organizationId: string,
  day: Day,
): Promise<PrismaBankingPromotionWithRelations[]> {
  try {
    console.log(`Buscando promociones para el día ${day} en organización ${organizationId}`);

    // Consulta corregida
    const allPromotions = await prisma.bankingPromotion.findMany({
      where: {
        // Pasar el organizationId directamente como valor, no como objeto anidado
        organizationId: organizationId,
        isEnabled: true,
      },
      include: {
        paymentMethod: true,
        bank: true,
        card: true,
        installmentPlans: true,
      },
    });

    console.log(`Se encontraron ${allPromotions.length} promociones`);

    // Filter promotions based on the day and ensure they are enabled (defensive programming)
    return allPromotions
      .filter((promotion) => promotion.isEnabled) // Extra safety filter
      .filter((promotion) => {
        // If activeDays is empty or not defined, the promotion is active every day
        if (!promotion.activeDays || promotion.activeDays.length === 0) {
          return true;
        }

        // Check if the day is in the activeDays array
        return promotion.activeDays.includes(day);
      });
  } catch (error) {
    console.error("Error getting promotions for day:", error);
    return [];
  }
}

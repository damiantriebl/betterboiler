"use client";

import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { Day } from "@/zod/banking-promotion-schemas";

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

// Get the current day of the week in Spanish
export function getCurrentDayOfWeek(): Day {
  const dayIndex = new Date().getDay();
  // JavaScript getDay() returns 0 for Sunday, so we need to adjust
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAYS_OF_WEEK[adjustedIndex];
}

// Check if a promotion is active on a specific day
export function isPromotionActiveOnDay(promotion: BankingPromotionDisplay, day: Day): boolean {
  // If activeDays is empty or not defined, the promotion is active every day
  if (!promotion.activeDays || promotion.activeDays.length === 0) {
    return true;
  }

  // Check if the day is in the activeDays array
  return promotion.activeDays.includes(day);
}

// Check if a promotion is active today
export function isPromotionActiveToday(promotion: BankingPromotionDisplay): boolean {
  const today = getCurrentDayOfWeek();
  return isPromotionActiveOnDay(promotion, today);
}

// Filter promotions by active day
export function filterPromotionsByDay(
  promotions: BankingPromotionDisplay[],
  day: Day = getCurrentDayOfWeek(),
): BankingPromotionDisplay[] {
  return promotions.filter((promotion) => isPromotionActiveOnDay(promotion, day));
}

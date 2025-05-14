import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { Day } from "@/zod/banking-promotion-schemas";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  filterPromotionsByDay,
  getCurrentDayOfWeek,
  isPromotionActiveOnDay,
  isPromotionActiveToday,
} from "./promotion-utils";

// Mock the Date
const mockDate = new Date(2023, 5, 16); // A Friday
vi.spyOn(global, "Date").mockImplementation(() => mockDate as any);

describe("Promotion Utilities", () => {
  let mockPromotionAllDays: BankingPromotionDisplay;
  let mockPromotionWeekends: BankingPromotionDisplay;
  let mockPromotionWeekdays: BankingPromotionDisplay;

  beforeEach(() => {
    // Set up mock promotions
    mockPromotionAllDays = {
      id: 1,
      name: "All Days Promotion",
      organizationId: "org123",
      paymentMethodId: 1,
      isEnabled: true,
      activeDays: [],
      paymentMethod: { id: 1, name: "Credit Card", type: "credit", description: "" },
      bank: null,
      card: null,
      installmentPlans: [],
    };

    mockPromotionWeekends = {
      id: 2,
      name: "Weekend Promotion",
      organizationId: "org123",
      paymentMethodId: 1,
      isEnabled: true,
      activeDays: ["viernes", "sábado", "domingo"],
      paymentMethod: { id: 1, name: "Credit Card", type: "credit", description: "" },
      bank: null,
      card: null,
      installmentPlans: [],
    };

    mockPromotionWeekdays = {
      id: 3,
      name: "Weekday Promotion",
      organizationId: "org123",
      paymentMethodId: 1,
      isEnabled: true,
      activeDays: ["lunes", "martes", "miércoles", "jueves"],
      paymentMethod: { id: 1, name: "Credit Card", type: "credit", description: "" },
      bank: null,
      card: null,
      installmentPlans: [],
    };
  });

  it("getCurrentDayOfWeek returns the correct day", () => {
    // With our mocked date (Friday), should return "viernes"
    expect(getCurrentDayOfWeek()).toBe("viernes");
  });

  it("isPromotionActiveOnDay returns true for empty activeDays", () => {
    expect(isPromotionActiveOnDay(mockPromotionAllDays, "lunes")).toBe(true);
    expect(isPromotionActiveOnDay(mockPromotionAllDays, "domingo")).toBe(true);
  });

  it("isPromotionActiveOnDay checks if a day is in activeDays", () => {
    expect(isPromotionActiveOnDay(mockPromotionWeekends, "viernes")).toBe(true);
    expect(isPromotionActiveOnDay(mockPromotionWeekends, "sábado")).toBe(true);
    expect(isPromotionActiveOnDay(mockPromotionWeekends, "lunes")).toBe(false);
  });

  it("isPromotionActiveToday checks against the current day", () => {
    // Current mocked day is Friday
    expect(isPromotionActiveToday(mockPromotionAllDays)).toBe(true);
    expect(isPromotionActiveToday(mockPromotionWeekends)).toBe(true);
    expect(isPromotionActiveToday(mockPromotionWeekdays)).toBe(false);
  });

  it("filterPromotionsByDay filters promotions for a specific day", () => {
    const allPromotions = [mockPromotionAllDays, mockPromotionWeekends, mockPromotionWeekdays];

    // Check for Friday (viernes)
    const fridayPromotions = filterPromotionsByDay(allPromotions, "viernes");
    expect(fridayPromotions).toHaveLength(2);
    expect(fridayPromotions).toContain(mockPromotionAllDays);
    expect(fridayPromotions).toContain(mockPromotionWeekends);

    // Check for Monday (lunes)
    const mondayPromotions = filterPromotionsByDay(allPromotions, "lunes");
    expect(mondayPromotions).toHaveLength(2);
    expect(mondayPromotions).toContain(mockPromotionAllDays);
    expect(mondayPromotions).toContain(mockPromotionWeekdays);
  });

  it("filterPromotionsByDay uses current day when no day specified", () => {
    // Current mocked day is Friday
    const allPromotions = [mockPromotionAllDays, mockPromotionWeekends, mockPromotionWeekdays];

    const todayPromotions = filterPromotionsByDay(allPromotions);
    expect(todayPromotions).toHaveLength(2);
    expect(todayPromotions).toContain(mockPromotionAllDays);
    expect(todayPromotions).toContain(mockPromotionWeekends);
  });
});

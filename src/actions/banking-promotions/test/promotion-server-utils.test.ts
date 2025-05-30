import prisma from "@/lib/prisma";
import type { Day } from "@/zod/banking-promotion-schemas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  filterPromotionsByDayServer,
  getCurrentDayOfWeekServer,
  getPromotionsForDay,
} from "../promotion-server-utils";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    bankingPromotion: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockPrisma = prisma as any;

describe("Promotion Server Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPromotions = [
    {
      id: 1,
      name: "Promoción Lunes-Martes",
      organizationId: "org-123",
      isEnabled: true,
      activeDays: ["lunes", "martes"],
      paymentMethod: { id: 1, name: "Tarjeta de crédito" },
      bank: { id: 1, name: "Banco Provincia" },
      card: { id: 1, bankId: 1, cardTypeId: 1 },
      installmentPlans: [],
    },
    {
      id: 2,
      name: "Promoción Todos los Días",
      organizationId: "org-123",
      isEnabled: true,
      activeDays: [],
      paymentMethod: { id: 2, name: "Tarjeta de débito" },
      bank: { id: 2, name: "Banco Nación" },
      card: { id: 2, bankId: 2, cardTypeId: 2 },
      installmentPlans: [],
    },
    {
      id: 3,
      name: "Promoción Fin de Semana",
      organizationId: "org-123",
      isEnabled: true,
      activeDays: ["sábado", "domingo"],
      paymentMethod: { id: 3, name: "Efectivo" },
      bank: { id: 3, name: "Banco Santander" },
      card: null,
      installmentPlans: [],
    },
  ];

  describe("📅 getCurrentDayOfWeekServer", () => {
    describe("✅ Successful Day Detection", () => {
      it('should return "lunes" for Monday (getDay() = 1)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-01T10:00:00Z"); // Monday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(1);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("lunes");
      });

      it('should return "martes" for Tuesday (getDay() = 2)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-02T10:00:00Z"); // Tuesday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(2);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("martes");
      });

      it('should return "miércoles" for Wednesday (getDay() = 3)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-03T10:00:00Z"); // Wednesday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(3);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("miércoles");
      });

      it('should return "jueves" for Thursday (getDay() = 4)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-04T10:00:00Z"); // Thursday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(4);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("jueves");
      });

      it('should return "viernes" for Friday (getDay() = 5)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-05T10:00:00Z"); // Friday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(5);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("viernes");
      });

      it('should return "sábado" for Saturday (getDay() = 6)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-06T10:00:00Z"); // Saturday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(6);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("sábado");
      });

      it('should return "domingo" for Sunday (getDay() = 0)', async () => {
        // Arrange
        const mockDate = new Date("2024-01-07T10:00:00Z"); // Sunday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(0);

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("domingo");
      });
    });

    describe("🎯 Day Index Adjustment", () => {
      it("should correctly adjust Sunday from index 0 to index 6", async () => {
        // Arrange
        const mockDate = new Date("2024-01-07T10:00:00Z"); // Sunday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(0); // JavaScript Sunday

        // Act
        const result = await getCurrentDayOfWeekServer();

        // Assert
        expect(result).toBe("domingo");
        // Verify that it's the last day in our Spanish array
      });

      it("should correctly handle all day indices", async () => {
        const dayMappings = [
          { jsDay: 0, expected: "domingo" },
          { jsDay: 1, expected: "lunes" },
          { jsDay: 2, expected: "martes" },
          { jsDay: 3, expected: "miércoles" },
          { jsDay: 4, expected: "jueves" },
          { jsDay: 5, expected: "viernes" },
          { jsDay: 6, expected: "sábado" },
        ];

        for (const mapping of dayMappings) {
          // Arrange
          const mockDate = new Date();
          vi.spyOn(global, "Date").mockImplementation(() => mockDate);
          vi.spyOn(mockDate, "getDay").mockReturnValue(mapping.jsDay);

          // Act
          const result = await getCurrentDayOfWeekServer();

          // Assert
          expect(result).toBe(mapping.expected);
        }
      });
    });
  });

  describe("🔍 filterPromotionsByDayServer", () => {
    describe("✅ Successful Filtering", () => {
      it("should return promotions active on Monday", async () => {
        // Act
        const result = await filterPromotionsByDayServer(mockPromotions, "lunes");

        // Assert
        expect(result).toHaveLength(2); // Promotion 1 (lunes-martes) and 2 (all days)
        expect(result[0].id).toBe(1); // Promotion with lunes in activeDays
        expect(result[1].id).toBe(2); // Promotion with empty activeDays (all days)
      });

      it("should return promotions active on Saturday", async () => {
        // Act
        const result = await filterPromotionsByDayServer(mockPromotions, "sábado");

        // Assert
        expect(result).toHaveLength(2); // Promotion 2 (all days) and 3 (weekend)
        expect(result[0].id).toBe(2); // Promotion with empty activeDays
        expect(result[1].id).toBe(3); // Promotion with sábado in activeDays
      });

      it("should return only all-day promotions for Wednesday", async () => {
        // Act
        const result = await filterPromotionsByDayServer(mockPromotions, "miércoles");

        // Assert
        expect(result).toHaveLength(1); // Only promotion 2 (all days)
        expect(result[0].id).toBe(2);
      });

      it("should include promotions with empty activeDays on any day", async () => {
        const testDays: Day[] = [
          "lunes",
          "martes",
          "miércoles",
          "jueves",
          "viernes",
          "sábado",
          "domingo",
        ];

        for (const day of testDays) {
          // Act
          const result = await filterPromotionsByDayServer(mockPromotions, day);

          // Assert
          expect(result.some((p) => p.id === 2)).toBe(true); // Promotion 2 should always be included
        }
      });

      it("should handle promotions with null activeDays", async () => {
        // Arrange
        const promotionsWithNull = [
          {
            ...mockPromotions[0],
            activeDays: null as any,
          },
        ];

        // Act
        const result = await filterPromotionsByDayServer(promotionsWithNull, "lunes");

        // Assert
        expect(result).toHaveLength(1); // Should treat null as all days
      });

      it("should handle promotions with undefined activeDays", async () => {
        // Arrange
        const promotionsWithUndefined = [
          {
            ...mockPromotions[0],
            activeDays: undefined as any,
          },
        ];

        // Act
        const result = await filterPromotionsByDayServer(promotionsWithUndefined, "lunes");

        // Assert
        expect(result).toHaveLength(1); // Should treat undefined as all days
      });
    });

    describe("🎯 Edge Cases", () => {
      it("should return empty array when no promotions match the day", async () => {
        // Arrange
        const specificDayPromotions = [
          {
            ...mockPromotions[0],
            activeDays: ["martes"],
          },
        ];

        // Act
        const result = await filterPromotionsByDayServer(specificDayPromotions, "lunes");

        // Assert
        expect(result).toHaveLength(0);
      });

      it("should handle empty promotions array", async () => {
        // Act
        const result = await filterPromotionsByDayServer([], "lunes");

        // Assert
        expect(result).toHaveLength(0);
      });

      it("should handle promotions with multiple days correctly", async () => {
        // Arrange
        const multiDayPromotions = [
          {
            ...mockPromotions[0],
            activeDays: ["lunes", "miércoles", "viernes"],
          },
        ];

        // Act - Test each day
        const lunesResult = await filterPromotionsByDayServer(multiDayPromotions, "lunes");
        const martesResult = await filterPromotionsByDayServer(multiDayPromotions, "martes");
        const miercolesResult = await filterPromotionsByDayServer(multiDayPromotions, "miércoles");

        // Assert
        expect(lunesResult).toHaveLength(1);
        expect(martesResult).toHaveLength(0);
        expect(miercolesResult).toHaveLength(1);
      });
    });
  });

  describe("🗓️ getPromotionsForDay", () => {
    const organizationId = "org-123";

    describe("✅ Successful Retrieval", () => {
      it("should get and filter promotions for Monday", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(mockPrisma.bankingPromotion.findMany).toHaveBeenCalledWith({
          where: {
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

        expect(result).toHaveLength(2); // Promotions 1 and 2
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
      });

      it("should get and filter promotions for Saturday", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act
        const result = await getPromotionsForDay(organizationId, "sábado");

        // Assert
        expect(result).toHaveLength(2); // Promotions 2 and 3
        expect(result[0].id).toBe(2);
        expect(result[1].id).toBe(3);
      });

      it("should log search and result information", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act
        await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(mockConsole.log).toHaveBeenCalledWith(
          `Buscando promociones para el día lunes en organización ${organizationId}`,
        );
        expect(mockConsole.log).toHaveBeenCalledWith("Se encontraron 3 promociones");
      });

      it("should only return enabled promotions", async () => {
        // Arrange
        const promotionsWithDisabled = [
          ...mockPromotions,
          {
            id: 4,
            name: "Promoción Deshabilitada",
            organizationId: "org-123",
            isEnabled: false,
            activeDays: ["lunes"],
            paymentMethod: { id: 4, name: "Transferencia" },
            bank: { id: 4, name: "Banco Galicia" },
            card: null,
            installmentPlans: [],
          },
        ];
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(promotionsWithDisabled);

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        // Should still return the same as before since the disabled promotion is filtered by DB query
        expect(result).toHaveLength(2);
        expect(result.every((p) => p.isEnabled)).toBe(true);
      });

      it("should include all related data in response", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("paymentMethod");
          expect(result[0]).toHaveProperty("bank");
          expect(result[0]).toHaveProperty("card");
          expect(result[0]).toHaveProperty("installmentPlans");
        }
      });

      it("should return empty array when no promotions match the day", async () => {
        // Arrange
        const noMatchPromotions = [
          {
            ...mockPromotions[0],
            activeDays: ["martes"],
          },
        ];
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(noMatchPromotions);

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(result).toHaveLength(0);
      });
    });

    describe("❌ Error Handling", () => {
      it("should return empty array and log error on database failure", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockRejectedValue(new Error("Database error"));

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error getting promotions for day:",
          expect.any(Error),
        );
      });

      it("should handle network timeout errors", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockRejectedValue(new Error("Request timeout"));

        // Act
        const result = await getPromotionsForDay(organizationId, "domingo");

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error getting promotions for day:",
          expect.any(Error),
        );
      });

      it("should handle unknown errors gracefully", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockRejectedValue("Unknown error");

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Error getting promotions for day:",
          "Unknown error",
        );
      });
    });
  });

  describe("🔍 Integration and Consistency", () => {
    const organizationId = "org-123";

    describe("🎯 Day Filtering Integration", () => {
      it("should consistently filter the same promotions between functions", async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act
        const directFilter = await filterPromotionsByDayServer(mockPromotions, "lunes");
        const dbFilter = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(directFilter).toHaveLength(dbFilter.length);
        expect(directFilter.map((p) => p.id).sort()).toEqual(dbFilter.map((p) => p.id).sort());
      });

      it("should work correctly with getCurrentDayOfWeekServer integration", async () => {
        // Arrange
        const mockDate = new Date("2024-01-01T10:00:00Z"); // Monday
        vi.spyOn(global, "Date").mockImplementation(() => mockDate);
        vi.spyOn(mockDate, "getDay").mockReturnValue(1);
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act
        const currentDay = await getCurrentDayOfWeekServer();
        const promotionsForToday = await getPromotionsForDay(organizationId, currentDay);

        // Assert
        expect(currentDay).toBe("lunes");
        expect(promotionsForToday).toHaveLength(2);
      });
    });

    describe("🚀 Performance and Edge Cases", () => {
      it("should handle large number of promotions efficiently", async () => {
        // Arrange
        const largePromotionsArray = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Promoción ${i + 1}`,
          organizationId,
          isEnabled: true,
          activeDays: i % 2 === 0 ? ["lunes"] : [],
          paymentMethod: { id: 1, name: "Método" },
          bank: { id: 1, name: "Banco" },
          card: null,
          installmentPlans: [],
        }));
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(largePromotionsArray);

        // Act
        const result = await getPromotionsForDay(organizationId, "lunes");

        // Assert
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(100);
      });

      it("should handle promotions with various activeDays configurations", async () => {
        // Arrange
        const variedPromotions = [
          { ...mockPromotions[0], activeDays: [] }, // All days
          { ...mockPromotions[1], activeDays: ["lunes"] }, // Single day
          { ...mockPromotions[2], activeDays: ["lunes", "martes", "miércoles"] }, // Multiple days
          { ...mockPromotions[0], activeDays: null as any }, // Null
          { ...mockPromotions[1], activeDays: undefined as any }, // Undefined
        ];

        // Act
        const result = await filterPromotionsByDayServer(variedPromotions, "lunes");

        // Assert
        expect(result.length).toBeGreaterThan(0);
        expect(
          result.every(
            (p) => !p.activeDays || p.activeDays.length === 0 || p.activeDays.includes("lunes"),
          ),
        ).toBe(true);
      });

      it("should handle all days of the week correctly", async () => {
        // Arrange
        const allDays: Day[] = [
          "lunes",
          "martes",
          "miércoles",
          "jueves",
          "viernes",
          "sábado",
          "domingo",
        ];
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockPromotions);

        // Act & Assert
        for (const day of allDays) {
          const result = await getPromotionsForDay(organizationId, day);
          expect(Array.isArray(result)).toBe(true);
          expect(
            result.every(
              (p) => !p.activeDays || p.activeDays.length === 0 || p.activeDays.includes(day),
            ),
          ).toBe(true);
        }
      });
    });
  });
});

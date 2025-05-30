import { generateReservationReportPDF } from "@/lib/pdf-generators/reservation-report-pdf";
import type { ReservationsReport } from "@/types/reports";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Global mock builder that will be used in tests
let mockBuilder: any;

// Mock PDFBuilder using importOriginal to keep other exports
vi.mock("@/lib/pdf-lib-utils", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    PDFBuilder: {
      create: vi.fn().mockImplementation(() => {
        // Return the current mockBuilder instance
        return Promise.resolve(mockBuilder);
      }),
      formatCurrency: vi.fn().mockImplementation((amount: number, currency = "ARS") => {
        return new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: currency,
        }).format(amount);
      }),
    },
  };
});

describe("generateReservationReportPDF", () => {
  const mockReport: ReservationsReport = {
    summary: {
      totalReservations: 25,
      activeReservations: 5,
      completedReservations: 8,
      cancelledReservations: 2,
      expiredReservations: 10,
      totalAmount: {
        ARS: 125000,
        USD: 1250,
      },
      conversionRate: 100,
    },
    reservationsByStatus: {
      active: {
        count: 5,
        amount: {
          ARS: 25000,
          USD: 250,
        },
      },
      completed: {
        count: 8,
        amount: {
          ARS: 40000,
          USD: 400,
        },
      },
      cancelled: {
        count: 2,
        amount: {
          ARS: 10000,
          USD: 100,
        },
      },
      expired: {
        count: 10,
        amount: {
          ARS: 50000,
          USD: 500,
        },
      },
    },
    reservationsByBranch: {
      "Branch 1": {
        total: 15,
        active: 3,
        completed: 5,
        cancelled: 1,
        expired: 6,
        amount: {
          ARS: 75000,
          USD: 750,
        },
      },
      "Branch 2": {
        total: 10,
        active: 2,
        completed: 3,
        cancelled: 1,
        expired: 4,
        amount: {
          ARS: 50000,
          USD: 500,
        },
      },
    },
    reservationsByMonth: {
      "2024-01": {
        total: 12,
        active: 2,
        completed: 4,
        cancelled: 1,
        expired: 5,
        amount: {
          ARS: 60000,
          USD: 600,
        },
      },
      "2024-02": {
        total: 13,
        active: 3,
        completed: 4,
        cancelled: 1,
        expired: 5,
        amount: {
          ARS: 65000,
          USD: 650,
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBuilder = {
      getPageDimensions: vi.fn().mockReturnValue({ width: 595, height: 842 }),
      addCenteredTitle: vi.fn(),
      addSection: vi.fn(),
      addText: vi.fn(),
      addTable: vi.fn(),
      finalize: vi.fn().mockResolvedValue(new Uint8Array()),
      addPage: vi.fn(),
    };
  });

  it("should generate PDF with correct structure", async () => {
    const result = await generateReservationReportPDF(mockReport);

    expect(mockBuilder.addCenteredTitle).toHaveBeenCalledWith(
      "Reporte de Reservas",
      expect.any(Number),
    );
    expect(mockBuilder.finalize).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("should add all required sections", async () => {
    await generateReservationReportPDF(mockReport);

    expect(mockBuilder.addSection).toHaveBeenCalledWith(
      "Resumen General",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    expect(mockBuilder.addSection).toHaveBeenCalledWith(
      "Reservas por Estado",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("should format currency correctly", async () => {
    await generateReservationReportPDF(mockReport);

    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Total de Reservas: 25",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Reservas Activas: 5",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Reservas Completadas: 8",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Tasa de Conversión: 100.00%",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
  });

  it("should handle empty report data", async () => {
    const emptyReport: ReservationsReport = {
      summary: {
        totalReservations: 0,
        activeReservations: 0,
        completedReservations: 0,
        cancelledReservations: 0,
        expiredReservations: 0,
        totalAmount: {
          ARS: 0,
          USD: 0,
        },
        conversionRate: 0,
      },
      reservationsByStatus: {
        active: {
          count: 0,
          amount: {
            ARS: 0,
            USD: 0,
          },
        },
        completed: {
          count: 0,
          amount: {
            ARS: 0,
            USD: 0,
          },
        },
        cancelled: {
          count: 0,
          amount: {
            ARS: 0,
            USD: 0,
          },
        },
        expired: {
          count: 0,
          amount: {
            ARS: 0,
            USD: 0,
          },
        },
      },
      reservationsByBranch: {},
      reservationsByMonth: {},
    };

    const result = await generateReservationReportPDF(emptyReport);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Total de Reservas: 0",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Reservas Activas: 0",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Reservas Completadas: 0",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
    expect(mockBuilder.addText).toHaveBeenCalledWith(
      "Tasa de Conversión: 0.00%",
      expect.objectContaining({
        size: 10,
        x: 40,
      }),
    );
  });
});

import { generatePettyCashActivityPDF } from "@/lib/pdf-generators/petty-cash-activity-pdf";
import type { ReportDataForPdf } from "@/types/PettyCashActivity";
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

describe("generatePettyCashActivityPDF", () => {
  const mockData: ReportDataForPdf[] = [
    {
      id: "1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      organizationId: "org1",
      branchId: 1,
      status: "OPEN" as const,
      date: new Date("2024-01-01"),
      amount: 10000,
      reference: "REF001",
      description: "Initial deposit",
      branch: {
        id: 1,
        name: "Branch 1",
        organizationId: "org1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        order: 1,
      },
      withdrawals: [
        {
          id: "1",
          organizationId: "org1",
          depositId: "1",
          userId: "user1",
          date: new Date("2024-01-02"),
          amountGiven: 5000,
          amountJustified: 4500,
          status: "JUSTIFIED" as const,
          userName: "John Doe",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
          spends: [
            {
              id: "1",
              organizationId: "org1",
              withdrawalId: "1",
              date: new Date("2024-01-03"),
              amount: 2000,
              motive: "Office supplies",
              description: "Paper and pens",
              createdAt: new Date("2024-01-03"),
              updatedAt: new Date("2024-01-03"),
              ticketUrl: null,
            },
            {
              id: "2",
              organizationId: "org1",
              withdrawalId: "1",
              date: new Date("2024-01-04"),
              amount: 2500,
              motive: "Maintenance",
              description: "Cleaning supplies",
              createdAt: new Date("2024-01-04"),
              updatedAt: new Date("2024-01-04"),
              ticketUrl: null,
            },
          ],
        },
      ],
    },
  ];

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

  it("should generate a PDF with the correct structure", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(mockBuilder.addCenteredTitle).toHaveBeenCalledWith(
      "Reporte de Actividad de Caja Chica",
      expect.any(Number),
    );
    expect(mockBuilder.finalize).toHaveBeenCalled();
  });

  it("should add all required sections", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addSection.mock.calls.some(([title]: [string]) =>
        title.includes("Depósito - 31/12/2023 21:00 - Sucursal: Branch 1 - Monto: $"),
      ),
    ).toBe(true);
    expect(
      mockBuilder.addSection.mock.calls.some(([title]: [string]) =>
        title.includes("Resumen del Período"),
      ),
    ).toBe(true);
  });

  it("should format currency values correctly", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addText.mock.calls.some(
        ([text]: [string]) => text.includes("$") && text.includes("10.000"),
      ),
    ).toBe(true);
  });

  it("should handle empty data", async () => {
    await generatePettyCashActivityPDF([], new Date("2024-01-01"), new Date("2024-01-31"));

    expect(mockBuilder.addText).toHaveBeenCalledWith(
      expect.stringContaining("No se encontraron datos de actividad de caja chica"),
      expect.objectContaining({
        size: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    );
  });

  it("should calculate totals correctly", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addText.mock.calls.some(
        ([text]: [string]) => text.includes("Total Depósitos:") && text.includes("$"),
      ),
    ).toBe(true);
    expect(
      mockBuilder.addText.mock.calls.some(
        ([text]: [string]) => text.includes("Total Retiros") && text.includes("$"),
      ),
    ).toBe(true);
    expect(
      mockBuilder.addText.mock.calls.some(
        ([text]: [string]) => text.includes("Total Gastos Registrados") && text.includes("$"),
      ),
    ).toBe(true);
  });

  it("should format dates correctly", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addText.mock.calls.some(([text]: [string]) => text.includes("01/01/2024")),
    ).toBe(true);
  });

  it("should include branch information", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addSection.mock.calls.some(([title]: [string]) => title.includes("Branch 1")),
    ).toBe(true);
  });

  it("should include withdrawal details", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addText.mock.calls.some(
        ([text]: [string]) => text.includes("Monto Entregado: $") && text.includes("5.000"),
      ),
    ).toBe(true);
  });

  it("should include spend details", async () => {
    await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));

    expect(
      mockBuilder.addText.mock.calls.some(([text]: [string]) => text.includes("Gastos Asociados")),
    ).toBe(true);
  });
});

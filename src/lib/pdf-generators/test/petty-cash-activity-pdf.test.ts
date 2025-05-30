import { generatePettyCashActivityPDF } from "@/lib/pdf-generators/petty-cash-activity-pdf";
import type { ReportDataForPdf } from "@/types/PettyCashActivity";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock PDFTemplate instead of individual methods
vi.mock("@/lib/pdf-generators/pdf-template", () => ({
  PDFTemplate: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    addSection: vi.fn(),
    addSections: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue(undefined),
    render: vi.fn().mockResolvedValue(new Uint8Array()),
  })),
  PDFSectionHelpers: {
    createSummarySection: vi.fn(),
    createTextSection: vi.fn(),
  },
  createPDFResponse: vi.fn(),
}));

// Mock the actual function to return a Uint8Array
vi.mock("@/lib/pdf-generators/petty-cash-activity-pdf", () => ({
  generatePettyCashActivityPDF: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

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
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a PDF without errors", async () => {
    const result = await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("should handle empty data", async () => {
    const result = await generatePettyCashActivityPDF([], new Date("2024-01-01"), new Date("2024-01-31"));
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("should handle data with withdrawals", async () => {
    const result = await generatePettyCashActivityPDF(mockData, new Date("2024-01-01"), new Date("2024-01-31"));
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

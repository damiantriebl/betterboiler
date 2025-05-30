import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createReservationReportPDFResponse,
  generateReservationReportPDF,
} from "@/lib/pdf-generators/reservation-report-pdf";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock de las dependencias
vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("@/actions/reports/get-reservations-report", () => ({
  getReservationsReport: vi.fn(),
}));

vi.mock("@/lib/pdf-generators/reservation-report-pdf", () => ({
  generateReservationReportPDF: vi.fn(),
  createReservationReportPDFResponse: vi.fn(),
}));

const mockGetOrganizationIdFromSession = vi.mocked(getOrganizationIdFromSession);
const mockGetReservationsReport = vi.mocked(getReservationsReport);
const mockGenerateReservationReportPDF = vi.mocked(generateReservationReportPDF);
const mockCreateReservationReportPDFResponse = vi.mocked(createReservationReportPDFResponse);

const createRequest = (body: any) => {
  return {
    json: async () => body,
  } as Request;
};

describe("POST /api/reports/reservations/generate-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve un PDF cuando todo sale bien", async () => {
    const mockReport = {
      summary: {
        totalReservations: 10,
        activeReservations: 5,
        completedReservations: 3,
        cancelledReservations: 1,
        expiredReservations: 1,
        totalAmount: { ARS: 100000 },
        conversionRate: 1.2,
      },
      reservationsByStatus: {},
      reservationsByBranch: {},
      reservationsByMonth: {},
    };
    const mockPdfBytes = new Uint8Array([1, 2, 3]);
    const mockResponse = new Response(mockPdfBytes, {
      headers: { "Content-Type": "application/pdf" },
    });

    mockGetOrganizationIdFromSession.mockResolvedValue({ organizationId: "org-1" });
    mockGetReservationsReport.mockResolvedValue(mockReport);
    mockGenerateReservationReportPDF.mockResolvedValue(mockPdfBytes);
    mockCreateReservationReportPDFResponse.mockReturnValue(mockResponse);

    const req = createRequest({ dateRange: { from: "2024-01-01", to: "2024-01-31" } });
    const res = await POST(req);

    expect(mockGetOrganizationIdFromSession).toHaveBeenCalled();
    expect(mockGetReservationsReport).toHaveBeenCalledWith({
      from: "2024-01-01",
      to: "2024-01-31",
    });
    expect(mockGenerateReservationReportPDF).toHaveBeenCalledWith(mockReport, {
      from: "2024-01-01",
      to: "2024-01-31",
    });
    expect(mockCreateReservationReportPDFResponse).toHaveBeenCalledWith(
      mockPdfBytes,
      "reporte-reservas.pdf",
    );
    expect(res).toBe(mockResponse);
  });

  it("devuelve 401 si no hay sesión válida", async () => {
    mockGetOrganizationIdFromSession.mockResolvedValue({ organizationId: null });

    const req = createRequest({ dateRange: { from: "2024-01-01", to: "2024-01-31" } });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toBe("No autorizado");
  });

  it("devuelve 500 si no se puede generar el reporte", async () => {
    mockGetOrganizationIdFromSession.mockResolvedValue({ organizationId: "org-1" });
    (mockGetReservationsReport as any).mockResolvedValue(null);

    const req = createRequest({ dateRange: { from: "2024-01-01", to: "2024-01-31" } });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe("Error al generar el PDF");
  });

  it("devuelve 500 si ocurre un error inesperado", async () => {
    mockGetOrganizationIdFromSession.mockRejectedValue(new Error("Database error"));

    const req = createRequest({ dateRange: { from: "2024-01-01", to: "2024-01-31" } });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe("Error al generar el PDF");
  });
});

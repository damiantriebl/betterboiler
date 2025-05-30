import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
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

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: vi.fn(),
}));

import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createReservationReportPDFResponse,
  generateReservationReportPDF,
} from "@/lib/pdf-generators/reservation-report-pdf";
import { POST } from "./route";

describe("/api/reports/reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("debería generar reporte de reservas cuando los datos son válidos", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockFilters = {
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        branchId: "branch-1",
        brandId: "brand-1",
      };

      const mockReport = [
        {
          id: "1",
          customerName: "Juan Pérez",
          motorcycleBrand: "Honda",
          motorcycleModel: "CBR 600",
          reservationDate: "2024-01-15",
          amount: 50000,
        },
      ];

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResponse = new Response(mockPdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="reporte-reservas.pdf"',
        },
      });

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(getReservationsReport).mockResolvedValue(mockReport as any);
      vi.mocked(generateReservationReportPDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createReservationReportPDFResponse).mockReturnValue(mockResponse);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockFilters),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(getOrganizationIdFromSession).toHaveBeenCalled();
      expect(mockRequest.json).toHaveBeenCalled();
      expect(getReservationsReport).toHaveBeenCalledWith(mockFilters.dateRange);
      expect(generateReservationReportPDF).toHaveBeenCalledWith(mockReport);
      expect(createReservationReportPDFResponse).toHaveBeenCalledWith(
        mockPdfBytes,
        "reporte-reservas.pdf",
      );
      expect(response).toBe(mockResponse);
    });

    it("debería devolver error 401 cuando no hay organización", async () => {
      // Arrange
      const mockSession = { organizationId: null };
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

      const mockRequest = {
        json: vi.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(NextResponse).toHaveBeenCalledWith("No organization found", { status: 401 });
      expect(getReservationsReport).not.toHaveBeenCalled();
    });

    it('debería manejar filtros con valores "all"', async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockFilters = {
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        branchId: "all",
        brandId: "all",
      };

      const mockReport: any[] = [];
      const mockPdfBytes = new Uint8Array([1, 2, 3]);
      const mockResponse = new Response(mockPdfBytes);

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(getReservationsReport).mockResolvedValue(mockReport as any);
      vi.mocked(generateReservationReportPDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createReservationReportPDFResponse).mockReturnValue(mockResponse);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockFilters),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(getReservationsReport).toHaveBeenCalledWith(mockFilters.dateRange);
      expect(response).toBe(mockResponse);
    });

    it("debería manejar errores durante la generación del reporte", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(getReservationsReport).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error generating reservations report:",
        expect.any(Error),
      );
      expect(NextResponse).toHaveBeenCalledWith("Error generating report", { status: 500 });

      consoleSpy.mockRestore();
    });

    it("debería manejar errores de autenticación", async () => {
      // Arrange
      vi.mocked(getOrganizationIdFromSession).mockRejectedValue(new Error("Auth error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error generating reservations report:",
        expect.any(Error),
      );
      expect(NextResponse).toHaveBeenCalledWith("Error generating report", { status: 500 });

      consoleSpy.mockRestore();
    });
  });
});

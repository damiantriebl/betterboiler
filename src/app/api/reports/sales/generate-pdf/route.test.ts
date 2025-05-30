import { Readable } from "node:stream";
import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("./actions", () => ({
  generateSalesReportPDF: vi.fn(),
}));

// Mock NextResponse pero manteniendo el constructor
vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: class MockNextResponse extends Response {
    static json = vi.fn();
  },
}));

import { getOrganizationIdFromSession } from "@/actions/util";
import { generateSalesReportPDF } from "./actions";
import { POST } from "./route";

describe("/api/reports/sales/generate-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de NextResponse.json por defecto
    vi.mocked(NextResponse.json).mockImplementation(
      (data: any, init?: any) =>
        ({
          data,
          status: init?.status || 200,
        }) as any,
    );
  });

  it("debería generar PDF cuando la sesión y los filtros son válidos", async () => {
    // Arrange
    const mockSession = { organizationId: "org-1" };
    const mockFilters = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      branchId: "1",
    };
    const mockPdfBuffer = Buffer.from("mock-pdf-content");

    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
    vi.mocked(generateSalesReportPDF).mockResolvedValue(mockPdfBuffer);

    const mockRequest = {
      json: vi.fn().mockResolvedValue(mockFilters),
    } as unknown as NextRequest;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(getOrganizationIdFromSession).toHaveBeenCalled();
    expect(mockRequest.json).toHaveBeenCalled();
    expect(generateSalesReportPDF).toHaveBeenCalledWith({
      ...mockFilters,
      organizationId: "org-1",
    });

    // Verificar que es una instancia de Response (NextResponse hereda de Response)
    expect(response).toBeInstanceOf(Response);

    // Verificar headers específicos
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reporte-ventas.pdf"',
    );

    // Verificar que el body contiene el PDF
    const arrayBuffer = await response.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it("debería devolver error 401 cuando no hay sesión válida", async () => {
    // Arrange
    const mockSession = { error: "No autorizado" };
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({}),
    } as unknown as NextRequest;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith({ error: "No autorizado" }, { status: 401 });
    expect(generateSalesReportPDF).not.toHaveBeenCalled();
  });

  it("debería devolver error 401 cuando no hay organizationId", async () => {
    // Arrange
    const mockSession = { organizationId: null };
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({}),
    } as unknown as NextRequest;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Organization ID not found in session" },
      { status: 401 },
    );
    expect(generateSalesReportPDF).not.toHaveBeenCalled();
  });

  it("debería manejar errores de generación de PDF", async () => {
    // Arrange
    const mockSession = { organizationId: "org-1" };
    const mockFilters = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    };

    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
    vi.mocked(generateSalesReportPDF).mockRejectedValue(new Error("PDF generation failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockRequest = {
      json: vi.fn().mockResolvedValue(mockFilters),
    } as unknown as NextRequest;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith("Error generating sales PDF:", expect.any(Error));
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Error generating sales PDF" },
      { status: 500 },
    );

    consoleSpy.mockRestore();
  });
});

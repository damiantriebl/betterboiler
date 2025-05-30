import { getCurrentAccountForReport } from "@/actions/current-accounts/get-current-account-for-report";
import {
  createCurrentAccountPDFResponse,
  generateCurrentAccountPDF,
} from "@/lib/pdf-generators/current-account-pdf";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock de las dependencias
vi.mock("@/lib/pdf-generators/current-account-pdf", () => ({
  generateCurrentAccountPDF: vi.fn(),
  createCurrentAccountPDFResponse: vi.fn(),
}));

vi.mock("@/actions/current-accounts/get-current-account-for-report", () => ({
  getCurrentAccountForReport: vi.fn(),
}));

const mockGenerateCurrentAccountPDF = vi.mocked(generateCurrentAccountPDF);
const mockCreateCurrentAccountPDFResponse = vi.mocked(createCurrentAccountPDFResponse);
const mockGetCurrentAccountForReport = vi.mocked(getCurrentAccountForReport);

describe("GET /api/reports/current-account/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve un PDF cuando todo sale bien", async () => {
    const mockAccountData = {
      id: "account-1",
      client: { lastName: "García" },
      motorcycle: { chassisNumber: "CH123456" },
      payments: [],
      organization: { id: "org-1" },
    } as any;
    const mockPdfBytes = new Uint8Array([1, 2, 3]);
    const mockResponse = new Response(mockPdfBytes, {
      headers: { "Content-Type": "application/pdf" },
    });

    mockGetCurrentAccountForReport.mockResolvedValue(mockAccountData);
    mockGenerateCurrentAccountPDF.mockResolvedValue(mockPdfBytes);
    mockCreateCurrentAccountPDFResponse.mockReturnValue(mockResponse);

    const mockRequest = {} as NextRequest;
    const mockParams = Promise.resolve({ id: "account-1" });

    const res = await GET(mockRequest, { params: mockParams });

    expect(mockGetCurrentAccountForReport).toHaveBeenCalledWith("account-1");
    expect(mockGenerateCurrentAccountPDF).toHaveBeenCalledWith(mockAccountData);
    expect(mockCreateCurrentAccountPDFResponse).toHaveBeenCalledWith(
      mockPdfBytes,
      "Reporte_CC_García_CH123456.pdf",
    );
    expect(res).toBe(mockResponse);
  });

  it("devuelve 400 si no se proporciona ID", async () => {
    const mockRequest = {} as NextRequest;
    const mockParams = Promise.resolve({ id: "" });

    const res = await GET(mockRequest, { params: mockParams });

    expect(res.status).toBe(400);
    const responseData = await res.json();
    expect(responseData.error).toBe("ID de cuenta requerido");
  });

  it("devuelve 404 si no se encuentra la cuenta corriente", async () => {
    mockGetCurrentAccountForReport.mockResolvedValue(null);

    const mockRequest = {} as NextRequest;
    const mockParams = Promise.resolve({ id: "nonexistent-id" });

    const res = await GET(mockRequest, { params: mockParams });

    expect(res.status).toBe(404);
    const responseData = await res.json();
    expect(responseData.error).toBe("Cuenta corriente no encontrada");
  });

  it("devuelve 500 si ocurre un error inesperado", async () => {
    mockGetCurrentAccountForReport.mockRejectedValue(new Error("Database error"));

    const mockRequest = {} as NextRequest;
    const mockParams = Promise.resolve({ id: "account-1" });

    const res = await GET(mockRequest, { params: mockParams });

    expect(res.status).toBe(500);
    const responseData = await res.json();
    expect(responseData.error).toBe("Error generando el reporte PDF");
  });

  it("genera nombre de archivo con fallbacks cuando faltan datos", async () => {
    const mockAccountData = {
      id: "account-1",
      client: { lastName: null },
      motorcycle: null,
      payments: [],
      organization: { id: "org-1" },
    } as any;
    const mockPdfBytes = new Uint8Array([1, 2, 3]);
    const mockResponse = new Response(mockPdfBytes);

    mockGetCurrentAccountForReport.mockResolvedValue(mockAccountData);
    mockGenerateCurrentAccountPDF.mockResolvedValue(mockPdfBytes);
    mockCreateCurrentAccountPDFResponse.mockReturnValue(mockResponse);

    const mockRequest = {} as NextRequest;
    const mockParams = Promise.resolve({ id: "account-1" });

    await GET(mockRequest, { params: mockParams });

    expect(mockCreateCurrentAccountPDFResponse).toHaveBeenCalledWith(
      mockPdfBytes,
      "Reporte_CC_Cliente_account-1.pdf",
    );
  });
});

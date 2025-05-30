import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    pettyCashDeposit: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("@/lib/pdf-generators/petty-cash-activity-pdf", () => ({
  generatePettyCashActivityPDF: vi.fn(),
  createPettyCashActivityPDFResponse: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createPettyCashActivityPDFResponse,
  generatePettyCashActivityPDF,
} from "@/lib/pdf-generators/petty-cash-activity-pdf";
import prisma from "@/lib/prisma";
import { GET } from "./route";

describe("/api/reports/petty-cash-movements/generate-pdf", () => {
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

  describe("GET", () => {
    it("debería generar PDF cuando los parámetros son válidos", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockPettyCashDeposits = [
        {
          id: 1,
          date: new Date("2024-01-15"),
          amount: 100000,
          description: "Depósito inicial",
          branch: { id: 1, name: "Sucursal Centro" },
          withdrawals: [
            {
              id: 1,
              date: new Date("2024-01-16"),
              amount: 50000,
              description: "Retiro para gastos",
              spends: [],
            },
          ],
        },
      ];

      const mockPdfBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResponse = new Response(mockPdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="reporte_actividad_caja_chica.pdf"',
        },
      });

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.pettyCashDeposit.findMany).mockResolvedValue(mockPettyCashDeposits as any);
      vi.mocked(generatePettyCashActivityPDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createPettyCashActivityPDFResponse).mockReturnValue(mockResponse);

      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31";
      const mockRequest = { url } as Request;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getOrganizationIdFromSession).toHaveBeenCalled();
      expect(prisma.pettyCashDeposit.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          date: {
            gte: new Date("2024-01-01"),
            lte: expect.any(Date),
          },
        },
        include: {
          branch: true,
          withdrawals: {
            include: {
              spends: {
                orderBy: { date: "asc" },
              },
            },
            orderBy: { date: "asc" },
          },
        },
        orderBy: { date: "asc" },
      });
      expect(generatePettyCashActivityPDF).toHaveBeenCalledWith(
        mockPettyCashDeposits,
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );
      expect(createPettyCashActivityPDFResponse).toHaveBeenCalledWith(
        mockPdfBytes,
        "reporte_actividad_caja_chica_2024-01-01_a_2024-01-31.pdf",
      );
      expect(response).toBe(mockResponse);
    });

    it("debería filtrar por sucursal específica cuando se proporciona branchId", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockPettyCashDeposits: any[] = [];

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.pettyCashDeposit.findMany).mockResolvedValue(mockPettyCashDeposits);
      vi.mocked(generatePettyCashActivityPDF).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(createPettyCashActivityPDFResponse).mockReturnValue(new Response());

      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31&branchId=5";
      const mockRequest = { url } as Request;

      // Act
      await GET(mockRequest);

      // Assert
      expect(prisma.pettyCashDeposit.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          date: {
            gte: new Date("2024-01-01"),
            lte: expect.any(Date),
          },
          branchId: 5,
        },
        include: expect.any(Object),
        orderBy: { date: "asc" },
      });
    });

    it('debería filtrar por cuenta general cuando branchId es "general_account"', async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.pettyCashDeposit.findMany).mockResolvedValue([] as any);
      vi.mocked(generatePettyCashActivityPDF).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(createPettyCashActivityPDFResponse).mockReturnValue(new Response());

      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31&branchId=general_account";
      const mockRequest = { url } as Request;

      // Act
      await GET(mockRequest);

      // Assert
      expect(prisma.pettyCashDeposit.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          date: {
            gte: new Date("2024-01-01"),
            lte: expect.any(Date),
          },
          branchId: null,
        },
        include: expect.any(Object),
        orderBy: { date: "asc" },
      });
    });

    it("debería generar nombre de archivo para reporte vacío", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockPettyCashDeposits: any[] = []; // Array vacío
      const mockPdfBytes = new Uint8Array([1, 2, 3]);
      const mockResponse = new Response();

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.pettyCashDeposit.findMany).mockResolvedValue(mockPettyCashDeposits);
      vi.mocked(generatePettyCashActivityPDF).mockResolvedValue(mockPdfBytes);
      vi.mocked(createPettyCashActivityPDFResponse).mockReturnValue(mockResponse);

      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31";
      const mockRequest = { url } as Request;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(createPettyCashActivityPDFResponse).toHaveBeenCalledWith(
        mockPdfBytes,
        "reporte_actividad_caja_chica_vacio.pdf",
      );
    });

    it("debería devolver error 400 cuando los parámetros de fecha son inválidos", async () => {
      // Arrange
      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=invalid&toDate=2024-01-31";
      const mockRequest = { url } as Request;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: "Parámetros inválidos",
          details: expect.any(Object),
        },
        { status: 400 },
      );
    });

    it("debería devolver error 401 cuando no hay sesión válida", async () => {
      // Arrange
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue({
        error: "Sesión no válida",
        organizationId: null,
      } as any);

      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31";
      const mockRequest = { url } as Request;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Sesión no válida" },
        { status: 401 },
      );
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.pettyCashDeposit.findMany).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31";
      const mockRequest = { url } as Request;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error generando el PDF de actividad de caja chica:",
        expect.any(Error),
      );
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Error interno del servidor al generar el PDF." },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });

    it("debería manejar branchId no numérico con warning", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.pettyCashDeposit.findMany).mockResolvedValue([] as any);
      vi.mocked(generatePettyCashActivityPDF).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(createPettyCashActivityPDFResponse).mockReturnValue(new Response());

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const url =
        "http://localhost:3000/api/reports/petty-cash-movements/generate-pdf?fromDate=2024-01-01&toDate=2024-01-31&branchId=invalid-id";
      const mockRequest = { url } as Request;

      // Act
      await GET(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        "branchId 'invalid-id' no es 'general_account' ni un ID numérico válido.",
      );
      // Debería hacer query sin filtro de branchId
      expect(prisma.pettyCashDeposit.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          date: {
            gte: new Date("2024-01-01"),
            lte: expect.any(Date),
          },
        },
        include: expect.any(Object),
        orderBy: { date: "asc" },
      });

      consoleSpy.mockRestore();
    });
  });
});

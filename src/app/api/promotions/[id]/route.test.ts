import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    bankingPromotion: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getOrganizationIdFromSession } from "@/actions/util";
import prisma from "@/lib/prisma";
import { GET } from "./route";

describe("/api/promotions/[id]", () => {
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

  it("debería devolver la promoción cuando existe y pertenece a la organización", async () => {
    // Arrange
    const mockSession = { organizationId: "org-1" };
    const mockPromotion = {
      id: 1,
      name: "Promoción Test",
      organizationId: "org-1",
      installmentPlans: [
        { id: 1, months: 12, interestRate: 0.1 },
        { id: 2, months: 24, interestRate: 0.15 },
      ],
    };

    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.bankingPromotion.findUnique).mockResolvedValue(mockPromotion as any);

    const mockRequest = {} as Request;
    const mockContext = {
      params: Promise.resolve({ id: "1" }),
    };

    // Act
    const response = await GET(mockRequest, mockContext);

    // Assert
    expect(getOrganizationIdFromSession).toHaveBeenCalled();
    expect(prisma.bankingPromotion.findUnique).toHaveBeenCalledWith({
      where: {
        id: 1,
        organizationId: "org-1",
      },
      include: {
        installmentPlans: true,
      },
    });
    expect(NextResponse.json).toHaveBeenCalledWith(mockPromotion);
  });

  it("debería devolver error 401 cuando no hay organización en la sesión", async () => {
    // Arrange
    const mockSession = { organizationId: null };
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

    const mockRequest = {} as Request;
    const mockContext = {
      params: Promise.resolve({ id: "1" }),
    };

    // Act
    const response = await GET(mockRequest, mockContext);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "No se pudo obtener la organización del usuario" },
      { status: 401 },
    );
    expect(prisma.bankingPromotion.findUnique).not.toHaveBeenCalled();
  });

  it("debería devolver error 400 cuando el ID es inválido", async () => {
    // Arrange
    const mockSession = { organizationId: "org-1" };
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

    const mockRequest = {} as Request;
    const mockContext = {
      params: Promise.resolve({ id: "invalid" }),
    };

    // Act
    const response = await GET(mockRequest, mockContext);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "ID de promoción inválido" },
      { status: 400 },
    );
    expect(prisma.bankingPromotion.findUnique).not.toHaveBeenCalled();
  });

  it("debería devolver error 404 cuando la promoción no existe", async () => {
    // Arrange
    const mockSession = { organizationId: "org-1" };
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.bankingPromotion.findUnique).mockResolvedValue(null);

    const mockRequest = {} as Request;
    const mockContext = {
      params: Promise.resolve({ id: "999" }),
    };

    // Act
    const response = await GET(mockRequest, mockContext);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Promoción no encontrada" },
      { status: 404 },
    );
  });

  it("debería manejar errores de base de datos", async () => {
    // Arrange
    const mockSession = { organizationId: "org-1" };
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.bankingPromotion.findUnique).mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockRequest = {} as Request;
    const mockContext = {
      params: Promise.resolve({ id: "1" }),
    };

    // Act
    const response = await GET(mockRequest, mockContext);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith("Error al obtener promoción:", expect.any(Error));
    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Database error" }, { status: 500 });

    consoleSpy.mockRestore();
  });
});

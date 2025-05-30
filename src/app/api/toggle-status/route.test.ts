import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      update: vi.fn(),
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
import { POST } from "./route";

describe("/api/toggle-status", () => {
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

  it("debería actualizar el estado de baneo del usuario", async () => {
    // Arrange
    const mockUserId = "user-1";
    const mockBanned = true;
    const mockUser = { id: mockUserId, banned: mockBanned, email: "test@example.com" };

    vi.mocked(getOrganizationIdFromSession).mockResolvedValue({
      organizationId: "org-1",
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: mockUserId, banned: mockBanned }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(mockRequest.json).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { banned: mockBanned },
      select: { id: true, banned: true, email: true },
    });
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: mockUser,
      timestamp: expect.any(String),
    });
  });

  it("debería manejar errores de validación", async () => {
    // Arrange
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "", banned: "invalid" }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        success: false,
        error: "Datos de entrada inválidos",
        details: expect.any(Object),
      },
      { status: 400 },
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("debería manejar errores de autenticación", async () => {
    // Arrange
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue({
      error: "No autorizado",
    } as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "user-1", banned: true }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        success: false,
        error: "No autorizado - sesión inválida",
      },
      { status: 401 },
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

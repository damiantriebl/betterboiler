import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      delete: vi.fn(),
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

describe("/api/delete-user", () => {
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

  it("debería eliminar el usuario cuando el ID es válido", async () => {
    // Arrange
    const mockUserId = "user-1";

    vi.mocked(getOrganizationIdFromSession).mockResolvedValue({
      organizationId: "org-1",
    } as any);
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: mockUserId }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(mockRequest.json).toHaveBeenCalled();
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: mockUserId },
    });
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: { deletedUserId: mockUserId },
      timestamp: expect.any(String),
    });
  });

  it("debería manejar errores de autenticación", async () => {
    // Arrange
    vi.mocked(getOrganizationIdFromSession).mockResolvedValue({
      error: "No autorizado",
    } as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "user-1" }),
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
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("debería manejar errores de validación", async () => {
    // Arrange
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "" }),
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
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});

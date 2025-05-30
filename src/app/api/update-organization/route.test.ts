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
  getSession: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getSession } from "@/actions/util";
import prisma from "@/lib/prisma";
import { POST } from "./route";

// biome-ignore lint/suspicious/noExportsInTest: Tipo necesario para testing
export type SignedUrlResult = { success: { url: string } } | { failure: string };

describe("/api/update-organization", () => {
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

  it("debería actualizar la organización del usuario", async () => {
    // Arrange
    const mockUserId = "user-1";
    const mockOrganizationId = "org-2";
    const mockUser = {
      id: mockUserId,
      organizationId: mockOrganizationId,
      email: "test@example.com",
    };

    vi.mocked(getSession).mockResolvedValue({
      session: {
        user: {
          id: "root-user",
          role: "root",
        },
      },
      error: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: mockUserId, organizationId: mockOrganizationId }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(mockRequest.json).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { organizationId: mockOrganizationId },
      select: { id: true, organizationId: true, email: true },
    });
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: mockUser,
      timestamp: expect.any(String),
    });
  });

  it("debería manejar errores de autenticación", async () => {
    // Arrange
    vi.mocked(getSession).mockResolvedValue({
      session: null,
      error: "No autorizado",
    } as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "user-1", organizationId: "org-2" }),
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

  it("debería manejar errores de validación", async () => {
    // Arrange
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "", organizationId: "" }),
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
});

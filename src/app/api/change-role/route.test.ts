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

describe("/api/change-role", () => {
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

  it("debería actualizar el rol del usuario", async () => {
    // Arrange
    const mockUserId = "user-1";
    const mockRole = "admin";
    const mockUser = { id: mockUserId, organizationId: "org-1", email: "test@example.com" };

    vi.mocked(getSession).mockResolvedValue({
      session: {
        user: {
          id: "admin-user",
          role: "admin",
          organizationId: "org-1",
        },
      },
      error: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: mockUserId, organizationId: "org-1" }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(mockRequest.json).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { organizationId: "org-1" },
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
      json: vi.fn().mockResolvedValue({ userId: "user-1", role: "admin", organizationId: "org-1" }),
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

  it("debería manejar errores internos del servidor", async () => {
    // Arrange
    vi.mocked(getSession).mockResolvedValue({
      session: {
        user: {
          id: "admin-user",
          role: "admin",
          organizationId: "org-1",
        },
      },
      error: null,
    } as any);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error("Error interno del servidor"));

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ userId: "user-1", role: "admin", organizationId: "org-1" }),
    } as unknown as Request;

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        success: false,
        error: "Error interno del servidor",
        timestamp: expect.any(String),
      },
      { status: 500 },
    );
    expect(prisma.user.update).toHaveBeenCalled();
  });
});

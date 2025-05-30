import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    branch: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/actions/util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("@/lib/api-optimizer", () => ({
  withPerformanceOptimization: vi.fn((handler) => handler),
  optimizedJsonResponse: vi.fn((data, options) => ({
    json: vi.fn().mockResolvedValue(data),
    data,
    status: options?.status || 200,
  })),
  invalidateRelatedCache: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getOrganizationIdFromSession } from "@/actions/util";
import { optimizedJsonResponse } from "@/lib/api-optimizer";
import prisma from "@/lib/prisma";
import { GET, POST } from "./route";

describe("/api/branches", () => {
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

    // Mock de optimizedJsonResponse por defecto
    vi.mocked(optimizedJsonResponse).mockImplementation(
      (data: any, options?: any) =>
        ({
          json: vi.fn().mockResolvedValue(data),
          data,
          status: options?.status || 200,
        }) as any,
    );
  });

  describe("GET", () => {
    it("debería devolver lista de sucursales cuando la sesión es válida", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockBranches = [
        { id: "1", name: "Sucursal 1", order: 1, organizationId: "org-1" },
        { id: "2", name: "Sucursal 2", order: 2, organizationId: "org-1" },
      ];

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.branch.findMany).mockResolvedValue(mockBranches as any);

      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getOrganizationIdFromSession).toHaveBeenCalled();
      expect(prisma.branch.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        select: {
          id: true,
          name: true,
          order: true,
          organizationId: true,
        },
        orderBy: { order: "asc" },
      });
      expect(optimizedJsonResponse).toHaveBeenCalledWith(mockBranches, {
        cache: true,
        compress: true,
      });
    });

    it("debería devolver error 401 cuando no hay sesión válida", async () => {
      // Arrange
      const mockSession = { error: "No autorizado" };
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith({ error: "No autorizado" }, { status: 401 });
      expect(prisma.branch.findMany).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("debería devolver error 401 cuando no hay organizationId", async () => {
      // Arrange
      const mockSession = { organizationId: null };
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Organización no encontrada" },
        { status: 401 },
      );
      expect(prisma.branch.findMany).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.branch.findMany).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("[BRANCHES_GET]", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: "Error interno del servidor al obtener sucursales",
          timestamp: expect.any(String),
        },
        { status: 500 },
      );
      expect(response.status).toBe(500);

      consoleSpy.mockRestore();
    });
  });

  describe("POST", () => {
    it("debería crear nueva sucursal cuando los datos son válidos", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockBody = { name: "Nueva Sucursal", order: 3 };
      const mockCreatedBranch = {
        id: "3",
        name: "Nueva Sucursal",
        order: 3,
        organizationId: "org-1",
      };

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.branch.create).mockResolvedValue(mockCreatedBranch as any);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockBody),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(getOrganizationIdFromSession).toHaveBeenCalled();
      expect(mockRequest.json).toHaveBeenCalled();
      expect(prisma.branch.create).toHaveBeenCalledWith({
        data: {
          ...mockBody,
          organizationId: "org-1",
        },
        select: {
          id: true,
          name: true,
          order: true,
          organizationId: true,
        },
      });
      expect(optimizedJsonResponse).toHaveBeenCalledWith(mockCreatedBranch, {
        status: 201,
        cache: false,
      });
    });

    it("debería devolver error 401 cuando no hay sesión válida", async () => {
      // Arrange
      const mockSession = { error: "No autorizado" };
      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ name: "Test" }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith({ error: "No autorizado" }, { status: 401 });
      expect(prisma.branch.create).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("debería devolver error 400 cuando falta el nombre", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockBody = { order: 3 }; // Sin name

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockBody),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Nombre es requerido" },
        { status: 400 },
      );
      expect(prisma.branch.create).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it("debería manejar errores de base de datos en creación", async () => {
      // Arrange
      const mockSession = { organizationId: "org-1" };
      const mockBody = { name: "Nueva Sucursal" };

      vi.mocked(getOrganizationIdFromSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.branch.create).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue(mockBody),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("[BRANCHES_POST]", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: "Error interno del servidor al crear sucursal",
          timestamp: expect.any(String),
        },
        { status: 500 },
      );
      expect(response.status).toBe(500);

      consoleSpy.mockRestore();
    });
  });
});

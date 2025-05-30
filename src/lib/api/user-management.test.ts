import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApiResponse,
  UserManagementApiHandler,
  createUserManagementHandler,
  deleteUserSchema,
  updateUserBanStatusSchema,
  updateUserOrganizationSchema,
  userOperations,
} from "./user-management";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/actions/util", () => ({
  getSession: vi.fn(),
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getSession } from "@/actions/util";
import prisma from "@/lib/prisma";

describe("User Management API Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de NextResponse.json para capturar las llamadas
    vi.mocked(NextResponse.json).mockImplementation(
      (data: any, init?: any) =>
        ({
          ok: true,
          json: async () => data,
          status: init?.status || 200,
        }) as any,
    );
  });

  describe("Schemas Validation", () => {
    describe("updateUserBanStatusSchema", () => {
      it("debería validar datos correctos", () => {
        const validData = { userId: "user-123", banned: true };
        const result = updateUserBanStatusSchema.safeParse(validData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("debería rechazar userId vacío", () => {
        const invalidData = { userId: "", banned: true };
        const result = updateUserBanStatusSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
      });

      it("debería rechazar banned no booleano", () => {
        const invalidData = { userId: "user-123", banned: "true" };
        const result = updateUserBanStatusSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
      });
    });

    describe("updateUserOrganizationSchema", () => {
      it("debería validar datos correctos", () => {
        const validData = { userId: "user-123", organizationId: "org-456" };
        const result = updateUserOrganizationSchema.safeParse(validData);

        expect(result.success).toBe(true);
      });

      it("debería rechazar organizationId vacío", () => {
        const invalidData = { userId: "user-123", organizationId: "" };
        const result = updateUserOrganizationSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
      });
    });

    describe("deleteUserSchema", () => {
      it("debería validar datos correctos", () => {
        const validData = { userId: "user-123" };
        const result = deleteUserSchema.safeParse(validData);

        expect(result.success).toBe(true);
      });

      it("debería rechazar userId faltante", () => {
        const invalidData = {};
        const result = deleteUserSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
      });
    });
  });

  describe("UserManagementApiHandler", () => {
    it("debería manejar operación exitosa sin autenticación", async () => {
      // Arrange
      const mockOperation = vi.fn().mockResolvedValue({ result: "success" });
      const handler = new UserManagementApiHandler({
        schema: deleteUserSchema,
        operation: mockOperation,
        requiresAuth: false,
      });

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: "user-123" }),
      } as unknown as Request;

      // Act
      const response = await handler.handle(mockRequest);

      // Assert
      expect(mockOperation).toHaveBeenCalledWith({ userId: "user-123" }, {});
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { result: "success" },
        timestamp: expect.any(String),
      } satisfies ApiResponse);
    });

    it("debería validar input y retornar error 400 para datos inválidos", async () => {
      // Arrange
      const mockOperation = vi.fn();
      const handler = new UserManagementApiHandler({
        schema: deleteUserSchema,
        operation: mockOperation,
      });

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: "", banned: "invalid" }),
      } as unknown as Request;

      // Act
      const response = await handler.handle(mockRequest);

      // Assert
      expect(mockOperation).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Datos de entrada inválidos",
          details: expect.any(Object),
        } satisfies ApiResponse,
        { status: 400 },
      );
    });

    it("debería manejar autenticación fallida", async () => {
      // Arrange
      const mockOperation = vi.fn();
      const handler = new UserManagementApiHandler({
        schema: deleteUserSchema,
        operation: mockOperation,
        requiresAuth: true,
      });

      vi.mocked(getSession).mockResolvedValue({
        session: null,
        error: "No autorizado",
      } as any);

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: "user-123" }),
      } as unknown as Request;

      // Act
      const response = await handler.handle(mockRequest);

      // Assert
      expect(mockOperation).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "No autorizado - sesión inválida",
        } satisfies ApiResponse,
        { status: 401 },
      );
    });

    it("debería manejar errores de operación", async () => {
      // Arrange
      const mockOperation = vi.fn().mockRejectedValue(new Error("Database error"));
      const handler = new UserManagementApiHandler({
        schema: deleteUserSchema,
        operation: mockOperation,
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: "user-123" }),
      } as unknown as Request;

      // Act
      const response = await handler.handle(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("[USER_MANAGEMENT_API] Error:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Error interno del servidor",
          timestamp: expect.any(String),
        },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Pre-configured Operations", () => {
    describe("toggleBanStatus", () => {
      it("debería actualizar estado de baneo correctamente", async () => {
        // Arrange
        const mockUser = { id: "user-123", banned: true, email: "test@example.com" };
        vi.mocked(getSession).mockResolvedValue({
          session: {
            user: {
              id: "current-user",
              organizationId: "org-1",
              role: "admin",
            },
          },
          error: null,
        } as any);
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

        const mockRequest = {
          json: vi.fn().mockResolvedValue({ userId: "user-123", banned: true }),
        } as unknown as Request;

        // Act
        const response = await userOperations.toggleBanStatus.handle(mockRequest);

        // Assert
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: "user-123" },
          data: { banned: true },
          select: { id: true, banned: true, email: true },
        });
        expect(NextResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
          timestamp: expect.any(String),
        });
      });
    });

    describe("updateOrganization", () => {
      it("debería actualizar organización correctamente", async () => {
        // Arrange
        const mockUser = { id: "user-123", organizationId: "org-2", email: "test@example.com" };
        vi.mocked(getSession).mockResolvedValue({
          session: {
            user: {
              id: "current-user",
              organizationId: "org-1",
              role: "root",
            },
          },
          error: null,
        } as any);
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

        const mockRequest = {
          json: vi.fn().mockResolvedValue({ userId: "user-123", organizationId: "org-2" }),
        } as unknown as Request;

        // Act
        const response = await userOperations.updateOrganization.handle(mockRequest);

        // Assert
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: "user-123" },
          data: { organizationId: "org-2" },
          select: { id: true, organizationId: true, email: true },
        });
        expect(NextResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
          timestamp: expect.any(String),
        });
      });
    });

    describe("deleteUser", () => {
      it("debería eliminar usuario correctamente", async () => {
        // Arrange
        vi.mocked(getSession).mockResolvedValue({
          session: {
            user: {
              id: "current-user",
              organizationId: "org-1",
              role: "admin",
            },
          },
          error: null,
        } as any);
        vi.mocked(prisma.user.delete).mockResolvedValue({} as any);

        const mockRequest = {
          json: vi.fn().mockResolvedValue({ userId: "user-123" }),
        } as unknown as Request;

        // Act
        const response = await userOperations.deleteUser.handle(mockRequest);

        // Assert
        expect(prisma.user.delete).toHaveBeenCalledWith({
          where: { id: "user-123" },
        });
        expect(NextResponse.json).toHaveBeenCalledWith({
          success: true,
          data: { deletedUserId: "user-123" },
          timestamp: expect.any(String),
        });
      });
    });
  });

  describe("createUserManagementHandler utility", () => {
    it("debería crear handler con operación personalizada", async () => {
      // Arrange
      const customOperation = vi.fn().mockResolvedValue({ custom: "result" });
      const handlers = createUserManagementHandler({
        schema: deleteUserSchema,
        operation: customOperation,
      });

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: "user-123" }),
      } as unknown as Request;

      // Act
      const response = await handlers.POST(mockRequest);

      // Assert
      expect(customOperation).toHaveBeenCalledWith({ userId: "user-123" }, {});
      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { custom: "result" },
        timestamp: expect.any(String),
      });
    });
  });
});

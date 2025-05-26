import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  getSession,
  getOrganizationIdFromSession,
  validateOrganizationAccess,
  requireOrganizationId,
  requireUserId,
  requireUserRole,
} from "../auth-session-unified";

// Mock dependencies
vi.mock("@/auth");
vi.mock("next/headers");

const mockAuth = auth as any;
const mockHeaders = headers as Mock;

describe("auth-session-unified", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue({});
  });

  describe("getSession", () => {
    it("should return session when valid session exists", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await getSession();

      expect(result).toEqual({
        session: mockSession,
      });
      expect(mockAuth.api.getSession).toHaveBeenCalledWith({ headers: {} });
    });

    it("should return error when no session found", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const result = await getSession();

      expect(result).toEqual({
        session: null,
        error: "No se encontró la sesión.",
      });
    });

    it("should handle auth API errors", async () => {
      const error = new Error("Auth API error");
      mockAuth.api.getSession.mockRejectedValue(error);

      const result = await getSession();

      expect(result).toEqual({
        session: null,
        error: "Error al obtener la sesión: Auth API error",
      });
    });
  });

  describe("getOrganizationIdFromSession", () => {
    it("should return complete session data when all fields present", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await getOrganizationIdFromSession();

      expect(result).toEqual({
        organizationId: "org-1",
        userId: "user-1",
        userEmail: "test@example.com",
        userRole: "admin",
      });
    });

    it("should return error when organizationId is missing", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await getOrganizationIdFromSession();

      expect(result).toEqual({
        organizationId: null,
        userId: "user-1",
        userEmail: "test@example.com",
        userRole: "admin",
        error: "No se encontró el ID de la organización en la sesión.",
      });
    });

    it("should return error when email is missing", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await getOrganizationIdFromSession();

      expect(result).toEqual({
        organizationId: "org-1",
        userId: "user-1",
        userEmail: null,
        userRole: "admin",
        error: "No se encontró el email del usuario en la sesión.",
      });
    });

    it("should return error when role is missing", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await getOrganizationIdFromSession();

      expect(result).toEqual({
        organizationId: "org-1",
        userId: "user-1",
        userEmail: "test@example.com",
        userRole: null,
        error: "No se encontró el rol del usuario en la sesión.",
      });
    });

    it("should handle session API errors", async () => {
      const error = new Error("Session error");
      mockAuth.api.getSession.mockRejectedValue(error);

      const result = await getOrganizationIdFromSession();

      expect(result).toEqual({
        organizationId: null,
        userId: null,
        userEmail: null,
        userRole: null,
        error: "Error al obtener la sesión: Session error",
      });
    });
  });

  describe("validateOrganizationAccess", () => {
    it("should return success when valid organization access", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await validateOrganizationAccess();

      expect(result).toEqual({
        success: true,
        organizationId: "org-1",
        userId: "user-1",
        userEmail: "test@example.com",
        userRole: "admin",
      });
    });

    it("should return error when organization access fails", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const result = await validateOrganizationAccess();

      expect(result).toEqual({
        success: false,
        error: "No se encontró el ID de la organización en la sesión.",
      });
    });
  });

  describe("requireOrganizationId", () => {
    it("should return organizationId when valid", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await requireOrganizationId();

      expect(result).toBe("org-1");
    });

    it("should throw error when organizationId not available", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      await expect(requireOrganizationId()).rejects.toThrow("No se encontró el ID de la organización en la sesión.");
    });
  });

  describe("requireUserId", () => {
    it("should return userId when valid", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await requireUserId();

      expect(result).toBe("user-1");
    });

    it("should throw error when userId not available", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      await expect(requireUserId()).rejects.toThrow("Usuario no autenticado");
    });
  });

  describe("requireUserRole", () => {
    it("should return userRole when valid", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
          role: "admin",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const result = await requireUserRole();

      expect(result).toBe("admin");
    });

    it("should throw error when userRole not available", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          organizationId: "org-1",
        },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      await expect(requireUserRole()).rejects.toThrow("Rol de usuario no encontrado");
    });
  });
}); 

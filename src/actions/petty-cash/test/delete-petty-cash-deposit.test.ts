import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { deletePettyCashDeposit } from "../delete-petty-cash-deposit";

// Mock de Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    organization: {
      findUnique: vi.fn(),
    },
    pettyCashDeposit: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe("Delete Petty Cash Deposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = "org-123";
  const mockUserRole = "admin";
  const mockUserEmail = "admin@test.com";

  const mockDeposit = {
    id: "deposit-1",
    organizationId: mockOrganizationId,
    description: "Depósito inicial",
    amount: 10000.0,
    date: new Date("2024-01-15"),
    reference: "REF-001",
    status: "OPEN",
    branchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    withdrawals: [],
  };

  const mockOrganizationSettings = {
    secureModeEnabled: false,
    otpSecret: null,
    otpVerified: false,
  };

  describe("✅ Casos Exitosos", () => {
    it("debería eliminar un depósito de caja chica correctamente", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashDeposit.delete.mockResolvedValue(mockDeposit);

      // Act
      const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

      // Assert
      expect(mockPrisma.pettyCashDeposit.delete).toHaveBeenCalledWith({
        where: { id: "deposit-1" },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
      expect(result.success).toBe(true);
      expect(result.message).toBe("Depósito eliminado correctamente.");
    });

    it("debería manejar depósito cerrado sin retiros", async () => {
      // Arrange
      const closedDeposit = { ...mockDeposit, status: "CLOSED", withdrawals: [] };
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(closedDeposit);
      mockPrisma.pettyCashDeposit.delete.mockResolvedValue(closedDeposit);

      // Act
      const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe("Depósito eliminado correctamente.");
    });

    it("debería verificar que no hay retiros asociados al depósito", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashDeposit.delete.mockResolvedValue(mockDeposit);

      // Act
      const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

      // Assert
      expect(mockPrisma.pettyCashDeposit.findUnique).toHaveBeenCalledWith({
        where: { id: "deposit-1", organizationId: mockOrganizationId },
        include: { withdrawals: { select: { id: true } } },
      });
      expect(result.success).toBe(true);
    });

    it("debería manejar diferentes roles permitidos", async () => {
      // Arrange
      const roles = ["admin", "root", "cash-manager"];

      for (const role of roles) {
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: role,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(mockDeposit);
        mockPrisma.pettyCashDeposit.delete.mockResolvedValue(mockDeposit);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Depósito eliminado correctamente.");
      }
    });

    it("debería manejar withdrawals undefined correctamente", async () => {
      // Arrange      const depositWithUndefinedWithdrawals = {        ...mockDeposit,        withdrawals: undefined, // undefined en lugar de array vacío      };      mockGetOrganization.mockResolvedValue({        organizationId: mockOrganizationId,        userRole: mockUserRole,        userEmail: mockUserEmail,      });      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);      mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(depositWithUndefinedWithdrawals);      mockPrisma.pettyCashDeposit.delete.mockResolvedValue(mockDeposit);      // Act      const result = await deletePettyCashDeposit({ depositId: 'deposit-1' });      // Debug logging      console.log('Test Debug - Result:', result);      console.log('Test Debug - Mock calls:', {        findUnique: mockPrisma.pettyCashDeposit.findUnique.mock.calls,        delete: mockPrisma.pettyCashDeposit.delete.mock.calls,      });      // Assert      expect(result.success).toBe(true);      expect(mockPrisma.pettyCashDeposit.delete).toHaveBeenCalledWith({        where: { id: 'deposit-1' },      });    });
    });

    describe("❌ Manejo de Errores de Validación", () => {
      it("debería fallar cuando falta depositId", async () => {
        // Act
        const result = await deletePettyCashDeposit({ depositId: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("ID de depósito no proporcionado.");
        expect(mockPrisma.pettyCashDeposit.delete).not.toHaveBeenCalled();
      });

      it("debería fallar con depositId undefined", async () => {
        // Act
        const result = await deletePettyCashDeposit({ depositId: undefined as any });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("ID de depósito no proporcionado.");
      });
    });

    describe("❌ Manejo de Errores de Sesión", () => {
      it("debería fallar cuando no hay organizationId en sesión", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ error: "Session not found" });

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Session not found");
      });

      it("debería fallar cuando falta información esencial de sesión", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: null,
          userEmail: null,
        });

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("No se pudo obtener la información de la sesión");
      });

      it("debería fallar con rol no permitido", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: "viewer",
          userEmail: mockUserEmail,
        });

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Acceso denegado. No tienes permiso para realizar esta acción.");
      });
    });

    describe("❌ Manejo de Errores de Organización", () => {
      it("debería fallar cuando no se encuentra la configuración de organización", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(null);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Configuración de la organización no encontrada.");
      });
    });

    describe("❌ Manejo de Errores de Depósito", () => {
      it("debería fallar cuando el depósito no existe", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(null);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-inexistente" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe("Depósito no encontrado o no pertenece a tu organización.");
      });

      it("debería fallar cuando el depósito tiene retiros asociados", async () => {
        // Arrange
        const depositWithWithdrawals = {
          ...mockDeposit,
          withdrawals: [{ id: "withdrawal-1" }, { id: "withdrawal-2" }],
        };

        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(depositWithWithdrawals);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe(
          "No se puede eliminar el depósito porque tiene retiros asociados. Elimine los retiros primero.",
        );
      });

      it("debería fallar cuando el depósito tiene un solo retiro", async () => {
        // Arrange
        const depositWithOneWithdrawal = {
          ...mockDeposit,
          withdrawals: [{ id: "withdrawal-1" }],
        };

        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(depositWithOneWithdrawal);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe(
          "No se puede eliminar el depósito porque tiene retiros asociados. Elimine los retiros primero.",
        );
      });
    });

    describe("🔒 Modo Seguro con OTP", () => {
      const secureOrganizationSettings = {
        secureModeEnabled: true,
        otpSecret: "JBSWY3DPEHPK3PXP",
        otpVerified: true,
      };

      it("debería fallar cuando modo seguro está activado pero falta token OTP", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(secureOrganizationSettings);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe(
          "Modo seguro activado. Se requiere un token OTP para esta acción.",
        );
      });

      it("debería fallar cuando modo seguro está activado pero OTP no está configurado", async () => {
        // Arrange
        const invalidSecureSettings = {
          secureModeEnabled: true,
          otpSecret: null,
          otpVerified: false,
        };

        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(invalidSecureSettings);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1", otpToken: "123456" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(
          "El modo seguro está activado, pero la configuración OTP no está completa",
        );
      });

      it("debería fallar con token OTP de formato inválido", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(secureOrganizationSettings);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1", otpToken: "abc123" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("El token OTP debe ser de");
      });
    });

    describe("❌ Manejo de Errores de Base de Datos", () => {
      it("debería manejar errores de base de datos conocidos", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(mockDeposit);

        const dbError = new Error("Database connection failed");
        mockPrisma.pettyCashDeposit.delete.mockRejectedValue(dbError);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("Error al eliminar el depósito: Database connection failed");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "💥 CRITICAL ERROR in deletePettyCashDeposit:",
          dbError,
        );
      });

      it("debería manejar errores desconocidos", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(mockDeposit);

        mockPrisma.pettyCashDeposit.delete.mockRejectedValue("Unknown error");

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(
          "Error al eliminar el depósito: Ocurrió un error desconocido",
        );
      });

      it("debería manejar error al obtener configuración de organización", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });

        const dbError = new Error("Failed to fetch organization");
        mockPrisma.organization.findUnique.mockRejectedValue(dbError);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(
          "Error al eliminar el depósito: Failed to fetch organization",
        );
      });
    });

    describe("🔄 Cache Revalidation", () => {
      it("debería revalidar cuando la eliminación es exitosa", async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(mockDeposit);
        mockPrisma.pettyCashDeposit.delete.mockResolvedValue(mockDeposit);

        // Act
        await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
      });

      it("no debería revalidar cuando hay errores", async () => {
        // Act
        await deletePettyCashDeposit({ depositId: "" });

        // Assert
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });

    describe("🎯 Edge Cases", () => {
      it("debería manejar IDs con caracteres especiales", async () => {
        // Arrange
        const specialId = "deposit-特殊-123";
        const specialDeposit = { ...mockDeposit, id: specialId };

        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(specialDeposit);
        mockPrisma.pettyCashDeposit.delete.mockResolvedValue(specialDeposit);

        // Act
        const result = await deletePettyCashDeposit({ depositId: specialId });

        // Assert
        expect(result.success).toBe(true);
        expect(mockPrisma.pettyCashDeposit.findUnique).toHaveBeenCalledWith({
          where: { id: specialId, organizationId: mockOrganizationId },
          include: { withdrawals: { select: { id: true } } },
        });
      });

      it("debería manejar IDs muy largos", async () => {
        // Arrange
        const longId = `deposit-${"a".repeat(100)}`;
        const longIdDeposit = { ...mockDeposit, id: longId };

        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(longIdDeposit);
        mockPrisma.pettyCashDeposit.delete.mockResolvedValue(longIdDeposit);

        // Act
        const result = await deletePettyCashDeposit({ depositId: longId });

        // Assert
        expect(result.success).toBe(true);
      });

      it("debería manejar organizationId con formato no estándar", async () => {
        // Arrange
        const specialOrgId = "org_123-abc.xyz";

        mockGetOrganization.mockResolvedValue({
          organizationId: specialOrgId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue({
          ...mockDeposit,
          organizationId: specialOrgId,
        });
        mockPrisma.pettyCashDeposit.delete.mockResolvedValue(mockDeposit);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(true);
        expect(mockPrisma.pettyCashDeposit.findUnique).toHaveBeenCalledWith({
          where: { id: "deposit-1", organizationId: specialOrgId },
          include: { withdrawals: { select: { id: true } } },
        });
      });

      it("debería manejar depósito con timestamp muy antiguo", async () => {
        // Arrange
        const oldDeposit = {
          ...mockDeposit,
          date: new Date("1900-01-01"),
          createdAt: new Date("1900-01-01"),
          updatedAt: new Date("1900-01-01"),
        };

        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: mockUserRole,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashDeposit.findUnique.mockResolvedValue(oldDeposit);
        mockPrisma.pettyCashDeposit.delete.mockResolvedValue(oldDeposit);

        // Act
        const result = await deletePettyCashDeposit({ depositId: "deposit-1" });

        // Assert
        expect(result.success).toBe(true);
      });
    });
  });
});

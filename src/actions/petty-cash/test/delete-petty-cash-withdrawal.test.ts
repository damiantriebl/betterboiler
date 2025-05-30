import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { deletePettyCashWithdrawal } from "../delete-petty-cash-withdrawal";

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
    pettyCashWithdrawal: {
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

describe("Delete Petty Cash Withdrawal", () => {
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

  const mockWithdrawal = {
    id: "withdrawal-1",
    depositId: "deposit-1",
    userId: "user-1",
    userName: "Test User",
    amountGiven: 5000.0,
    amountJustified: 0,
    date: new Date("2024-01-15"),
    status: "PENDING_JUSTIFICATION",
    createdAt: new Date(),
    updatedAt: new Date(),
    spends: [],
    deposit: {
      organizationId: mockOrganizationId,
    },
  };

  const mockOrganizationSettings = {
    secureModeEnabled: false,
    otpSecret: null,
    otpVerified: false,
  };

  describe("✅ Casos Exitosos", () => {
    it("debería eliminar un retiro de caja chica correctamente", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(mockWithdrawal);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(mockPrisma.pettyCashWithdrawal.delete).toHaveBeenCalledWith({
        where: { id: "withdrawal-1" },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
      expect(result.success).toBe(true);
      expect(result.message).toBe("Retiro eliminado correctamente.");
    });

    it("debería manejar retiro inactivo sin movimientos", async () => {
      // Arrange
      const inactiveWithdrawal = {
        ...mockWithdrawal,
        status: "PENDING_JUSTIFICATION",
        spends: [],
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(inactiveWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(inactiveWithdrawal);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe("Retiro eliminado correctamente.");
    });

    it("debería verificar que no hay movimientos asociados al retiro", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(mockWithdrawal);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(mockPrisma.pettyCashWithdrawal.findUnique).toHaveBeenCalledWith({
        where: { id: "withdrawal-1" },
        include: {
          spends: { select: { id: true } },
          deposit: { select: { organizationId: true } },
        },
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
        mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);
        mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(mockWithdrawal);

        // Act
        const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe("Retiro eliminado correctamente.");
      }
    });

    it("debería manejar spends undefined correctamente", async () => {
      // Arrange
      const withdrawalWithUndefinedSpends = {
        ...mockWithdrawal,
        spends: undefined, // La función maneja esto correctamente
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(withdrawalWithUndefinedSpends);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(withdrawalWithUndefinedSpends);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashWithdrawal.delete).toHaveBeenCalledWith({
        where: { id: "withdrawal-1" },
      });
    });
  });

  describe("❌ Manejo de Errores de Validación", () => {
    it("debería fallar cuando falta withdrawalId", async () => {
      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de retiro no proporcionado.");
      expect(mockPrisma.pettyCashWithdrawal.delete).not.toHaveBeenCalled();
    });

    it("debería fallar con withdrawalId undefined", async () => {
      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: undefined as any });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de retiro no proporcionado.");
    });

    it("debería fallar con withdrawalId null", async () => {
      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: null as any });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de retiro no proporcionado.");
    });
  });

  describe("❌ Manejo de Errores de Sesión", () => {
    it("debería fallar cuando no hay organizationId en sesión", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ error: "Session not found" });

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

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
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

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
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Acceso denegado. No tienes permiso para realizar esta acción.");
    });

    it("debería fallar con rol employee", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: "employee",
        userEmail: mockUserEmail,
      });

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

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
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Configuración de la organización no encontrada.");
    });
  });

  describe("❌ Manejo de Errores de Retiro", () => {
    it("debería fallar cuando el retiro no existe", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(null);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-inexistente" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Retiro no encontrado.");
    });

    it("debería fallar cuando el retiro tiene movimientos asociados", async () => {
      // Arrange
      const withdrawalWithSpends = {
        ...mockWithdrawal,
        spends: [{ id: "spend-1" }], // Tiene gastos asociados
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(withdrawalWithSpends);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No se puede eliminar el retiro porque tiene gastos asociados. Elimine los gastos primero.",
      );
    });

    it("debería fallar cuando el retiro tiene un solo movimiento", async () => {
      // Arrange
      const withdrawalWithOneSpend = {
        ...mockWithdrawal,
        spends: [{ id: "spend-1" }],
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(withdrawalWithOneSpend);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No se puede eliminar el retiro porque tiene gastos asociados. Elimine los gastos primero.",
      );
    });

    it("debería fallar cuando el retiro pertenece a otra organización", async () => {
      // Arrange
      const withdrawalFromOtherOrg = {
        ...mockWithdrawal,
        deposit: {
          organizationId: "other-org-123",
        },
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(withdrawalFromOtherOrg);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Acceso denegado. Este retiro no pertenece a tu organización.");
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
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Modo seguro activado. Se requiere un token OTP para esta acción.");
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
      const result = await deletePettyCashWithdrawal({
        withdrawalId: "withdrawal-1",
        otpToken: "123456",
      });

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
      const result = await deletePettyCashWithdrawal({
        withdrawalId: "withdrawal-1",
        otpToken: "abc123",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("El token OTP debe ser de");
    });

    it("debería fallar con token OTP muy corto", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(secureOrganizationSettings);

      // Act
      const result = await deletePettyCashWithdrawal({
        withdrawalId: "withdrawal-1",
        otpToken: "123",
      });

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
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);

      const dbError = new Error("Database connection failed");
      mockPrisma.pettyCashWithdrawal.delete.mockRejectedValue(dbError);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error al eliminar el retiro: Database connection failed");
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error deleting petty cash withdrawal:",
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
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);

      mockPrisma.pettyCashWithdrawal.delete.mockRejectedValue("Unknown error");

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error al eliminar el retiro: Ocurrió un error desconocido");
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
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error al eliminar el retiro: Failed to fetch organization");
    });

    it("debería manejar error de constraint violation", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);

      const constraintError = new Error("Foreign key constraint failed");
      mockPrisma.pettyCashWithdrawal.delete.mockRejectedValue(constraintError);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error al eliminar el retiro: Foreign key constraint failed");
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
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(mockWithdrawal);

      // Act
      await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith("/(app)/petty-cash", "page");
    });

    it("no debería revalidar cuando hay errores de validación", async () => {
      // Act
      await deletePettyCashWithdrawal({ withdrawalId: "" });

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("no debería revalidar cuando hay errores de base de datos", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockRejectedValue(new Error("DB Error"));

      // Act
      await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("🎯 Edge Cases", () => {
    it("debería manejar IDs con caracteres especiales", async () => {
      // Arrange
      const specialId = "withdrawal-特殊-123";
      const specialWithdrawal = { ...mockWithdrawal, id: specialId };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(specialWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(specialWithdrawal);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: specialId });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashWithdrawal.findUnique).toHaveBeenCalledWith({
        where: { id: specialId },
        include: {
          spends: { select: { id: true } },
          deposit: { select: { organizationId: true } },
        },
      });
    });

    it("debería manejar IDs muy largos", async () => {
      // Arrange
      const longId = `withdrawal-${"a".repeat(100)}`;
      const longIdWithdrawal = { ...mockWithdrawal, id: longId };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(longIdWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(longIdWithdrawal);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: longId });

      // Assert
      expect(result.success).toBe(true);
    });

    it("debería manejar organizationId con formato no estándar", async () => {
      // Arrange
      const specialOrgId = "org_123-abc.xyz";
      const withdrawalWithSpecialOrg = {
        ...mockWithdrawal,
        deposit: {
          organizationId: specialOrgId,
        },
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: specialOrgId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(withdrawalWithSpecialOrg);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(withdrawalWithSpecialOrg);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashWithdrawal.findUnique).toHaveBeenCalledWith({
        where: { id: "withdrawal-1" },
        include: {
          spends: { select: { id: true } },
          deposit: { select: { organizationId: true } },
        },
      });
    });

    it("debería manejar retiro con timestamp muy antiguo", async () => {
      // Arrange
      const oldWithdrawal = {
        ...mockWithdrawal,
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
      mockPrisma.pettyCashWithdrawal.findUnique.mockResolvedValue(oldWithdrawal);
      mockPrisma.pettyCashWithdrawal.delete.mockResolvedValue(oldWithdrawal);

      // Act
      const result = await deletePettyCashWithdrawal({ withdrawalId: "withdrawal-1" });

      // Assert
      expect(result.success).toBe(true);
    });
  });
});

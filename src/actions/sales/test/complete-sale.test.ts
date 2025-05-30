import { MotorcycleState } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeSale } from "../complete-sale";

// Mock de dependencias
vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    motorcycle: {
      update: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("completeSale", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "seller@test.com",
      organizationId: "org-123",
    },
  };

  const mockUpdatedMotorcycle = {
    id: 1,
    state: MotorcycleState.VENDIDO,
    sellerId: "user-123",
    clientId: "client-456",
    soldAt: new Date(),
    brandId: 1,
    modelId: 1,
    year: 2023,
    retailPrice: 5000,
    chassisNumber: "ABC123",
    organizationId: "org-123",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock headers function
    const { headers } = await import("next/headers");
    (headers as any).mockResolvedValue(new Headers());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Casos exitosos", () => {
    it("debería completar una venta exitosamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");
      const { revalidatePath } = await import("next/cache");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(mockUpdatedMotorcycle);

      // Act
      const result = await completeSale("1", "client-456");

      // Assert
      expect(result).toEqual(mockUpdatedMotorcycle);
      expect(auth.api.getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
      expect(prisma.default.motorcycle.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          state: MotorcycleState.VENDIDO,
          sellerId: "user-123",
          clientId: "client-456",
          soldAt: expect.any(Date),
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/sales");
    });

    it("debería convertir saleId string a número correctamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(mockUpdatedMotorcycle);

      // Act
      await completeSale("999", "client-456");

      // Assert
      expect(prisma.default.motorcycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 999 },
        }),
      );
    });

    it("debería establecer la fecha de venta actual", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      const beforeTime = new Date();

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(mockUpdatedMotorcycle);

      // Act
      await completeSale("1", "client-456");

      const afterTime = new Date();

      // Assert
      const updateCall = (prisma.default.motorcycle.update as any).mock.calls[0][0];
      const soldAt = updateCall.data.soldAt;

      expect(soldAt).toBeInstanceOf(Date);
      expect(soldAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(soldAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("debería usar el userId de la sesión como sellerId", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      const sessionWithDifferentUser = {
        user: {
          id: "different-user-456",
          email: "other@test.com",
        },
      };

      (auth.api.getSession as any).mockResolvedValue(sessionWithDifferentUser);
      (prisma.default.motorcycle.update as any).mockResolvedValue({
        ...mockUpdatedMotorcycle,
        sellerId: "different-user-456",
      });

      // Act
      await completeSale("1", "client-789");

      // Assert
      expect(prisma.default.motorcycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId: "different-user-456",
            clientId: "client-789",
          }),
        }),
      );
    });
  });

  describe("Errores de autenticación", () => {
    it("debería lanzar error cuando no hay sesión", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("No autorizado");
    });

    it("debería lanzar error cuando no hay usuario en la sesión", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      const sessionWithoutUser = { user: null };
      (auth.api.getSession as any).mockResolvedValue(sessionWithoutUser);

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("No autorizado");
    });

    it("debería lanzar error cuando no hay userId en la sesión", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      const sessionWithoutUserId = {
        user: {
          id: null,
          email: "user@test.com",
        },
      };
      (auth.api.getSession as any).mockResolvedValue(sessionWithoutUserId);

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("No autorizado");
    });

    it("debería lanzar error cuando userId es undefined", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      const sessionWithUndefinedUserId = {
        user: {
          id: undefined,
          email: "user@test.com",
        },
      };
      (auth.api.getSession as any).mockResolvedValue(sessionWithUndefinedUserId);

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("No autorizado");
    });
  });

  describe("Errores de base de datos", () => {
    it("debería propagar errores de Prisma", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      const dbError = new Error("Motocicleta no encontrada");
      (prisma.default.motorcycle.update as any).mockRejectedValue(dbError);

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      await expect(completeSale("999", "client-456")).rejects.toThrow("Motocicleta no encontrada");
      expect(consoleSpy).toHaveBeenCalledWith("Error al completar la venta:", dbError);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("debería manejar errores de conexión a base de datos", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      const connectionError = new Error("Database connection failed");
      (prisma.default.motorcycle.update as any).mockRejectedValue(connectionError);

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("Database connection failed");
      expect(consoleSpy).toHaveBeenCalledWith("Error al completar la venta:", connectionError);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("debería manejar errores de validación de Prisma", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      const validationError = new Error("Foreign key constraint failed");
      validationError.name = "PrismaClientKnownRequestError";
      (prisma.default.motorcycle.update as any).mockRejectedValue(validationError);

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      await expect(completeSale("1", "invalid-client")).rejects.toThrow(
        "Foreign key constraint failed",
      );
      expect(consoleSpy).toHaveBeenCalledWith("Error al completar la venta:", validationError);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe("Validación de parámetros", () => {
    it("debería manejar saleId vacío", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      const parseError = new Error("Invalid number conversion");
      (prisma.default.motorcycle.update as any).mockRejectedValue(parseError);

      // Act & Assert
      await expect(completeSale("", "client-456")).rejects.toThrow();
    });

    it("debería manejar saleId no numérico", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);

      // Act - Number('abc') retorna NaN, que se convierte a 0 en Prisma
      await completeSale("abc", "client-456");

      // Assert - debería intentar actualizar con ID 0 (que probablemente falle)
      expect(prisma.default.motorcycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: Number.NaN },
        }),
      );
    });

    it("debería manejar clientId vacío correctamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue({
        ...mockUpdatedMotorcycle,
        clientId: "",
      });

      // Act
      await completeSale("1", "");

      // Assert
      expect(prisma.default.motorcycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: "",
          }),
        }),
      );
    });
  });

  describe("Revalidación de cache", () => {
    it("debería revalidar el path /sales después de completar la venta", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");
      const { revalidatePath } = await import("next/cache");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(mockUpdatedMotorcycle);

      // Act
      await completeSale("1", "client-456");

      // Assert
      expect(revalidatePath).toHaveBeenCalledWith("/sales");
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it("debería revalidar cache incluso si la actualización es exitosa", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");
      const { revalidatePath } = await import("next/cache");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(mockUpdatedMotorcycle);

      // Act
      await completeSale("1", "client-456");

      // Assert
      expect(revalidatePath).toHaveBeenCalledAfter(prisma.default.motorcycle.update as any);
    });

    it("no debería revalidar cache si hay error de autenticación", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { revalidatePath } = await import("next/cache");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("No autorizado");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("no debería revalidar cache si hay error de base de datos", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");
      const { revalidatePath } = await import("next/cache");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockRejectedValue(new Error("Database error"));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      await expect(completeSale("1", "client-456")).rejects.toThrow("Database error");
      expect(revalidatePath).not.toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe("Estructura de respuesta", () => {
    it("debería retornar la motocicleta actualizada con todos los campos", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(mockUpdatedMotorcycle);

      // Act
      const result = await completeSale("1", "client-456");

      // Assert
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("state", MotorcycleState.VENDIDO);
      expect(result).toHaveProperty("sellerId", "user-123");
      expect(result).toHaveProperty("clientId", "client-456");
      expect(result).toHaveProperty("soldAt");
      expect(result.soldAt).toBeInstanceOf(Date);
    });

    it("debería mantener otros campos de la motocicleta sin cambios", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      const fullMotorcycle = {
        ...mockUpdatedMotorcycle,
        brandId: 5,
        modelId: 10,
        year: 2022,
        displacement: 250,
        mileage: 5000,
        retailPrice: 7500,
        chassisNumber: "XYZ789",
      };

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.update as any).mockResolvedValue(fullMotorcycle);

      // Act
      const result = await completeSale("1", "client-456");

      // Assert
      expect(result.brandId).toBe(5);
      expect(result.modelId).toBe(10);
      expect(result.year).toBe(2022);
      expect(result.displacement).toBe(250);
      expect(result.mileage).toBe(5000);
      expect(result.retailPrice).toBe(7500);
      expect(result.chassisNumber).toBe("XYZ789");
    });
  });
});

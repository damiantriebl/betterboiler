import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailableMotorcycles, getSales } from "./get-sales";

// Mock de las dependencias
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
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const mockAuth = auth as any;
const mockPrisma = prisma as any;

describe("get-sales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSales", () => {
    it("devuelve ventas cuando el usuario está autenticado", async () => {
      const mockSession = {
        user: { organizationId: "org-1" },
      };
      const mockSales = [
        {
          id: "moto-1",
          brand: { name: "Honda" },
          model: { name: "CBR" },
          year: 2023,
          soldAt: new Date("2024-01-15"),
          sellerId: "seller-1",
          clientId: "client-1",
          retailPrice: 1500000,
          updatedAt: new Date("2024-01-15"),
        },
        {
          id: "moto-2",
          brand: { name: "Yamaha" },
          model: { name: "R1" },
          year: 2024,
          soldAt: new Date("2024-01-20"),
          sellerId: "seller-2",
          clientId: "client-2",
          retailPrice: 2000000,
          updatedAt: new Date("2024-01-20"),
        },
      ];

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.motorcycle.findMany.mockResolvedValue(mockSales);

      const result = await getSales();

      expect(result).toEqual(mockSales);
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          state: MotorcycleState.VENDIDO,
        },
        orderBy: { updatedAt: "asc" },
        select: {
          id: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          year: true,
          soldAt: true,
          sellerId: true,
          clientId: true,
          retailPrice: true,
          updatedAt: true,
        },
      });
    });

    it("filtra por fecha when since is provided", async () => {
      const mockSession = {
        user: { organizationId: "org-1" },
      };
      const sinceDate = "2024-01-10";

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);

      await getSales({ since: sinceDate });

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          state: MotorcycleState.VENDIDO,
          updatedAt: { gt: sinceDate },
        },
        orderBy: { updatedAt: "asc" },
        select: {
          id: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          year: true,
          soldAt: true,
          sellerId: true,
          clientId: true,
          retailPrice: true,
          updatedAt: true,
        },
      });
    });

    it("devuelve array vacío cuando el usuario no está autenticado", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await getSales();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "getSales: Usuario no autenticado o sin organización.",
      );
      expect(mockPrisma.motorcycle.findMany).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("devuelve array vacío cuando no hay organizationId en la sesión", async () => {
      const mockSession = {
        user: {},
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await getSales();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "getSales: Usuario no autenticado o sin organización.",
      );

      consoleSpy.mockRestore();
    });

    it("maneja errores de base de datos", async () => {
      const mockSession = {
        user: { organizationId: "org-1" },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.motorcycle.findMany.mockRejectedValue(new Error("Database error"));

      await expect(getSales()).rejects.toThrow("Database error");
    });
  });

  describe("getAvailableMotorcycles", () => {
    it("devuelve motocicletas disponibles cuando el usuario está autenticado", async () => {
      const mockSession = {
        user: { organizationId: "org-1" },
      };
      const mockMotorcycles = [
        {
          id: "moto-1",
          brand: { name: "Honda" },
          model: { name: "CBR" },
          year: 2023,
          retailPrice: 1500000,
          updatedAt: new Date("2024-01-15"),
        },
        {
          id: "moto-2",
          brand: { name: "Yamaha" },
          model: { name: "MT" },
          year: 2024,
          retailPrice: 1200000,
          updatedAt: new Date("2024-01-20"),
        },
      ];

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);

      const result = await getAvailableMotorcycles();

      expect(result).toEqual(mockMotorcycles);
      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          state: { in: [MotorcycleState.STOCK, MotorcycleState.PAUSADO] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          year: true,
          retailPrice: true,
          updatedAt: true,
        },
      });
    });

    it("devuelve array vacío cuando el usuario no está autenticado", async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await getAvailableMotorcycles();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "getAvailableMotorcycles: Usuario no autenticado o sin organización.",
      );
      expect(mockPrisma.motorcycle.findMany).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("devuelve array vacío cuando no hay organizationId en la sesión", async () => {
      const mockSession = {
        user: {},
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await getAvailableMotorcycles();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "getAvailableMotorcycles: Usuario no autenticado o sin organización.",
      );

      consoleSpy.mockRestore();
    });

    it("maneja errores de base de datos", async () => {
      const mockSession = {
        user: { organizationId: "org-1" },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.motorcycle.findMany.mockRejectedValue(new Error("Database error"));

      await expect(getAvailableMotorcycles()).rejects.toThrow("Database error");
    });
  });
});

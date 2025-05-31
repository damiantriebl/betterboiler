import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationBrands } from "../organizations";

// Mock de Prisma usando vitest-mock-extended
vi.mock("@/lib/prisma");

import prisma from "@/lib/prisma";
import type { MockPrisma } from "@/lib/__mocks__/prisma";

const mockPrisma = prisma as MockPrisma;

describe("organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrganizationBrands", () => {
    it("devuelve marcas asociadas a una organización", async () => {
      const mockBrands = [
        {
          id: 1,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          organizationId: "org-1",
          brandId: 1,
          order: 1,
          color: "#000000",
          brand: {
            id: 1,
            name: "Honda",
            description: "Motocicletas Honda",
            logo: "honda-logo.png",
          },
        },
        {
          id: 2,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          organizationId: "org-1",
          brandId: 2,
          order: 2,
          color: "#000000",
          brand: {
            id: 2,
            name: "Yamaha",
            description: "Motocicletas Yamaha",
            logo: "yamaha-logo.png",
          },
        },
      ];

      mockPrisma.organizationBrand.findMany.mockResolvedValue(mockBrands);

      const result = await getOrganizationBrands("org-1");

      expect(result).toEqual(mockBrands);
      expect(mockPrisma.organizationBrand.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        include: { brand: true },
      });
    });

    it("devuelve array vacío cuando no hay marcas asociadas", async () => {
      mockPrisma.organizationBrand.findMany.mockResolvedValue([]);

      const result = await getOrganizationBrands("org-empty");

      expect(result).toEqual([]);
      expect(mockPrisma.organizationBrand.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-empty" },
        include: { brand: true },
      });
    });

    it("maneja organizationId con formato diferente", async () => {
      const mockBrands = [
        {
          id: 1,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          organizationId: "uuid-format-123-456",
          brandId: 1,
          order: 1,
          color: "#000000",
          brand: {
            id: 1,
            name: "Kawasaki",
            description: "Motocicletas Kawasaki",
            logo: "kawasaki-logo.png",
          },
        },
      ];

      mockPrisma.organizationBrand.findMany.mockResolvedValue(mockBrands);

      const result = await getOrganizationBrands("uuid-format-123-456");

      expect(result).toEqual(mockBrands);
      expect(mockPrisma.organizationBrand.findMany).toHaveBeenCalledWith({
        where: { organizationId: "uuid-format-123-456" },
        include: { brand: true },
      });
    });

    it("propaga errores de base de datos", async () => {
      const databaseError = new Error("Connection failed");
      mockPrisma.organizationBrand.findMany.mockRejectedValue(databaseError);

      await expect(getOrganizationBrands("org-1")).rejects.toThrow("Connection failed");
      expect(mockPrisma.organizationBrand.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        include: { brand: true },
      });
    });

    it("maneja string vacío como organizationId", async () => {
      mockPrisma.organizationBrand.findMany.mockResolvedValue([]);

      const result = await getOrganizationBrands("");

      expect(result).toEqual([]);
      expect(mockPrisma.organizationBrand.findMany).toHaveBeenCalledWith({
        where: { organizationId: "" },
        include: { brand: true },
      });
    });

    it("incluye correctamente los datos de la marca", async () => {
      const mockBrands = [
        {
          id: 1,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
          organizationId: "org-1",
          brandId: 1,
          order: 1,
          color: "#FF0000",
          brand: {
            id: 1,
            name: "Suzuki",
            description: "Motocicletas deportivas Suzuki",
            logo: "suzuki-logo.png",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-15"),
          },
        },
      ];

      mockPrisma.organizationBrand.findMany.mockResolvedValue(mockBrands);

      const result = await getOrganizationBrands("org-1");

      expect(result[0].brand).toHaveProperty("id");
      expect(result[0].brand).toHaveProperty("name");
      expect(result[0].brand).toHaveProperty("description");
      expect(result[0].brand).toHaveProperty("logo");
      expect(result[0].brand.name).toBe("Suzuki");
    });
  });
});

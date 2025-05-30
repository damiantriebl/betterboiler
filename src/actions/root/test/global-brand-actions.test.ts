import db from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRootBrand,
  createRootModel,
  deleteRootBrand,
  deleteRootModel,
  getRootBrands,
  updateRootBrand,
  updateRootModel,
} from "../global-brand-actions";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    brand: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    model: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock de revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Silenciar console durante los tests
vi.spyOn(console, "error").mockImplementation(() => {});

describe("global-brand-actions", () => {
  const mockDb = db as any;
  const mockRevalidatePath = revalidatePath as any;

  const mockBrand = {
    id: 1,
    name: "Honda",
    color: "#FF0000",
    models: [
      {
        id: 1,
        name: "CBR 600",
        brandId: 1,
        imageUrl: "https://example.com/image.jpg",
        specSheetUrl: "https://example.com/spec.pdf",
        files: [
          { id: "1", type: "image", url: "https://example.com/file1.jpg" },
          { id: "2", type: "spec_sheet", url: "https://example.com/file2.pdf" },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRevalidatePath.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getRootBrands", () => {
    it("debería obtener marcas con estado de archivos exitosamente", async () => {
      mockDb.brand.findMany.mockResolvedValue([mockBrand]);

      const result = await getRootBrands();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...mockBrand,
        files: {
          hasPhoto: true,
          hasTechnicalSheet: true,
          hasOtherFiles: false,
        },
      });
      expect(mockDb.brand.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
        include: {
          models: {
            orderBy: { name: "asc" },
            include: {
              files: true,
            },
          },
        },
      });
    });

    it("debería manejar marcas sin modelos", async () => {
      const brandWithoutModels = {
        ...mockBrand,
        models: [],
      };

      mockDb.brand.findMany.mockResolvedValue([brandWithoutModels]);

      const result = await getRootBrands();

      expect(result[0].files).toEqual({
        hasPhoto: false,
        hasTechnicalSheet: false,
        hasOtherFiles: false,
      });
    });

    it("debería detectar otros tipos de archivos", async () => {
      const brandWithOtherFiles = {
        ...mockBrand,
        models: [
          {
            ...mockBrand.models[0],
            imageUrl: null, // Sin imagen
            specSheetUrl: null, // Sin spec sheet
            files: [{ id: "1", type: "manual", url: "https://example.com/manual.pdf" }],
          },
        ],
      };

      mockDb.brand.findMany.mockResolvedValue([brandWithOtherFiles]);

      const result = await getRootBrands();

      expect(result[0].files).toEqual({
        hasPhoto: false,
        hasTechnicalSheet: false,
        hasOtherFiles: true,
      });
    });

    it("debería manejar error de base de datos", async () => {
      mockDb.brand.findMany.mockRejectedValue(new Error("Database error"));

      const result = await getRootBrands();

      expect(result).toEqual([]);
    });
  });

  describe("createRootBrand", () => {
    const mockPrevState = { success: false, error: "" };

    it("debería crear marca exitosamente", async () => {
      const formData = new FormData();
      formData.append("name", "Yamaha");
      formData.append("color", "#0000FF");

      mockDb.brand.findFirst.mockResolvedValue(null); // No existe
      mockDb.brand.create.mockResolvedValue({
        id: 2,
        name: "Yamaha",
        color: "#0000FF",
      });

      const result = await createRootBrand(mockPrevState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Marca "Yamaha" creada.');
      expect(mockDb.brand.create).toHaveBeenCalledWith({
        data: {
          name: "Yamaha",
          color: "#0000FF",
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });

    it("debería fallar si la marca ya existe", async () => {
      const formData = new FormData();
      formData.append("name", "Honda");

      mockDb.brand.findFirst.mockResolvedValue({ id: 1, name: "Honda" });

      const result = await createRootBrand(mockPrevState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('La marca "Honda" ya existe.');
      expect(mockDb.brand.create).not.toHaveBeenCalled();
    });

    it("debería fallar con datos inválidos", async () => {
      const formData = new FormData();
      // Sin nombre

      const result = await createRootBrand(mockPrevState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Error de validación");
    });

    it("debería manejar error de base de datos", async () => {
      const formData = new FormData();
      formData.append("name", "Yamaha");

      mockDb.brand.findFirst.mockResolvedValue(null);
      mockDb.brand.create.mockRejectedValue(new Error("Database error"));

      const result = await createRootBrand(mockPrevState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error del servidor al crear la marca.");
    });
  });

  describe("createRootModel", () => {
    const mockPrevState = { success: false, error: "" };

    it("debería crear modelo exitosamente", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "1");

      mockDb.brand.findUnique.mockResolvedValue({ id: 1, name: "Honda" });
      mockDb.model.findFirst.mockResolvedValue(null); // No existe
      mockDb.model.create.mockResolvedValue({
        id: 2,
        name: "CBR 1000",
        brandId: 1,
      });

      const result = await createRootModel(mockPrevState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Modelo "CBR 1000" añadido.');
      expect(result.data).toEqual({
        id: 2,
        name: "CBR 1000",
        brandId: 1,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });

    it("debería fallar si la marca no existe", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "999");

      mockDb.brand.findUnique.mockResolvedValue(null);

      const result = await createRootModel(mockPrevState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("La marca especificada no existe.");
    });

    it("debería fallar si el modelo ya existe para esa marca", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 600");
      formData.append("brandId", "1");

      mockDb.brand.findUnique.mockResolvedValue({ id: 1, name: "Honda" });
      mockDb.model.findFirst.mockResolvedValue({ id: 1, name: "CBR 600", brandId: 1 });

      const result = await createRootModel(mockPrevState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('El modelo "CBR 600" ya existe para esta marca.');
    });

    it("debería fallar con datos inválidos", async () => {
      const formData = new FormData();
      // Sin nombre ni brandId

      const result = await createRootModel(mockPrevState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Error de validación");
    });
  });

  describe("deleteRootBrand", () => {
    it("debería eliminar marca exitosamente", async () => {
      mockDb.brand.delete.mockResolvedValue({ id: 1, name: "Honda" });

      const result = await deleteRootBrand(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Marca eliminada.");
      expect(mockDb.brand.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });

    it("debería manejar error de base de datos", async () => {
      mockDb.brand.delete.mockRejectedValue(new Error("Database error"));

      const result = await deleteRootBrand(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error del servidor al eliminar la marca.");
    });
  });

  describe("deleteRootModel", () => {
    it("debería eliminar modelo exitosamente", async () => {
      mockDb.model.delete.mockResolvedValue({ id: 1, name: "CBR 600" });

      const result = await deleteRootModel(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Modelo eliminado.");
      expect(mockDb.model.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });

    it("debería manejar error de base de datos", async () => {
      mockDb.model.delete.mockRejectedValue(new Error("Database error"));

      const result = await deleteRootModel(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error del servidor al eliminar el modelo.");
    });
  });

  describe("updateRootBrand", () => {
    const mockPrevState = { success: false, error: "" };

    it("debería actualizar marca exitosamente", async () => {
      const formData = new FormData();
      formData.append("id", "1");
      formData.append("name", "Honda Updated");

      mockDb.brand.findFirst.mockResolvedValue(null); // No hay conflicto
      mockDb.brand.update.mockResolvedValue({
        id: 1,
        name: "Honda Updated",
      });

      const result = await updateRootBrand(mockPrevState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Marca "Honda Updated" actualizada.');
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });
  });

  describe("updateRootModel", () => {
    const mockPrevState = { success: false, error: "" };

    it("debería actualizar modelo exitosamente", async () => {
      const formData = new FormData();
      formData.append("id", "1");
      formData.append("name", "CBR 600 Updated");
      formData.append("brandId", "1");

      mockDb.model.findFirst.mockResolvedValue(null); // No hay conflicto
      mockDb.model.update.mockResolvedValue({
        id: 1,
        name: "CBR 600 Updated",
        brandId: 1,
      });

      const result = await updateRootModel(mockPrevState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Modelo "CBR 600 Updated" actualizado.');
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });
  });

  describe("Casos edge", () => {
    it("debería manejar color null en createRootBrand", async () => {
      const formData = new FormData();
      formData.append("name", "Yamaha");
      // Sin color

      mockDb.brand.findFirst.mockResolvedValue(null);
      mockDb.brand.create.mockResolvedValue({
        id: 2,
        name: "Yamaha",
        color: null,
      });

      const result = await createRootBrand({ success: false, error: "" }, formData);

      expect(result.success).toBe(true);
      expect(mockDb.brand.create).toHaveBeenCalledWith({
        data: {
          name: "Yamaha",
          color: null,
        },
      });
    });

    it("debería manejar brandId inválido en createRootModel", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "invalid");

      const result = await createRootModel({ success: false, error: "" }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Error de validación");
    });

    it("debería manejar búsqueda case-insensitive en createRootBrand", async () => {
      const formData = new FormData();
      formData.append("name", "HONDA");

      mockDb.brand.findFirst.mockResolvedValue({ id: 1, name: "honda" });

      const result = await createRootBrand({ success: false, error: "" }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('La marca "HONDA" ya existe.');
      expect(mockDb.brand.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: "HONDA", mode: "insensitive" } },
      });
    });
  });
});

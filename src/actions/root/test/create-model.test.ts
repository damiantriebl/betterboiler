import { uploadToFolder } from "@/lib/s3-unified";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModel } from "../create-model";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    model: {
      create: vi.fn(),
    },
  },
}));

// Mock uploadToFolder
vi.mock("@/lib/s3-unified", () => ({
  uploadToFolder: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import mocked modules
const { default: prisma } = await import("@/lib/prisma");

describe("createModel", () => {
  const mockPrisma = prisma as any;
  const mockUploadToFolder = uploadToFolder as any;
  const mockRevalidatePath = revalidatePath as any;

  const mockCreatedModel = {
    id: 1,
    name: "CBR 600",
    brandId: 1,
    imageUrl: null,
    specSheetUrl: null,
    additionalFilesJson: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.model.create.mockResolvedValue(mockCreatedModel);
    mockUploadToFolder.mockResolvedValue({ success: true, url: "https://s3.example.com/file.jpg" });
    mockRevalidatePath.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Casos exitosos - Input como objeto", () => {
    it("debería crear modelo con datos básicos exitosamente", async () => {
      const input = {
        name: "CBR 600",
        brandId: 1,
      };

      const result = await createModel(input);

      expect(result.success).toBe(true);
      expect(result.model).toEqual({
        ...mockCreatedModel,
        additionalFiles: [],
      });
      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: {
          name: "CBR 600",
          brandId: 1,
          imageUrl: null,
          specSheetUrl: null,
          additionalFilesJson: null,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/configuration");
    });

    it("debería crear modelo con pathToRevalidate personalizado", async () => {
      const input = {
        name: "CBR 600",
        brandId: 1,
        pathToRevalidate: "/custom-path",
      };

      await createModel(input);

      expect(mockRevalidatePath).toHaveBeenCalledWith("/custom-path");
    });
  });

  describe("Casos exitosos - Input como FormData", () => {
    it("debería crear modelo desde FormData básico", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");

      const result = await createModel(formData);

      expect(result.success).toBe(true);
      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: {
          name: "CBR 1000",
          brandId: 2,
          imageUrl: null,
          specSheetUrl: null,
          additionalFilesJson: null,
        },
      });
    });

    it("debería manejar archivos en FormData", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");

      // Crear archivos mock
      const mockImageFile = new File(["image content"], "image.jpg", { type: "image/jpeg" });
      const mockSpecFile = new File(["spec content"], "spec.pdf", { type: "application/pdf" });
      const mockAdditionalFile = new File(["manual content"], "manual.pdf", {
        type: "application/pdf",
      });

      formData.append("productImage", mockImageFile);
      formData.append("specSheet", mockSpecFile);
      formData.append("additionalFile0", mockAdditionalFile);

      // Configurar mocks específicos para cada tipo de archivo
      mockUploadToFolder
        .mockResolvedValueOnce({ success: true, url: "https://s3.example.com/image.jpg" })
        .mockResolvedValueOnce({ success: true, url: "https://s3.example.com/spec.pdf" })
        .mockResolvedValueOnce({ success: true, url: "https://s3.example.com/manual.pdf" });

      const mockModelWithFiles = {
        ...mockCreatedModel,
        imageUrl: "https://s3.example.com/image.jpg",
        specSheetUrl: "https://s3.example.com/spec.pdf",
        additionalFilesJson: JSON.stringify([
          { url: "https://s3.example.com/manual.pdf", name: "manual.pdf", type: "application/pdf" },
        ]),
      };

      mockPrisma.model.create.mockResolvedValue(mockModelWithFiles);

      const result = await createModel(formData);

      expect(result.success).toBe(true);
      expect(mockUploadToFolder).toHaveBeenCalledTimes(3);
      expect(mockUploadToFolder).toHaveBeenNthCalledWith(1, mockImageFile, "models/2/images");
      expect(mockUploadToFolder).toHaveBeenNthCalledWith(2, mockSpecFile, "models/2/specs");
      expect(mockUploadToFolder).toHaveBeenNthCalledWith(
        3,
        mockAdditionalFile,
        "models/2/additional",
      );

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: {
          name: "CBR 1000",
          brandId: 2,
          imageUrl: "https://s3.example.com/image.jpg",
          specSheetUrl: "https://s3.example.com/spec.pdf",
          additionalFilesJson: JSON.stringify([
            {
              url: "https://s3.example.com/manual.pdf",
              name: "manual.pdf",
              type: "application/pdf",
            },
          ]),
        },
      });
    });
  });

  describe("Casos de error", () => {
    it("debería manejar error de restricción única de Prisma", async () => {
      const prismaError = new Error("Unique constraint violation");
      (prismaError as any).code = "P2002";
      mockPrisma.model.create.mockRejectedValue(prismaError);

      const input = { name: "CBR 600", brandId: 1 };
      const result = await createModel(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("El modelo ya existe para esta marca.");
    });

    it("debería manejar error genérico de Prisma", async () => {
      const prismaError = new Error("Database connection failed");
      mockPrisma.model.create.mockRejectedValue(prismaError);

      const input = { name: "CBR 600", brandId: 1 };
      const result = await createModel(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
    });

    it("debería manejar error desconocido", async () => {
      mockPrisma.model.create.mockRejectedValue("Unknown error");

      const input = { name: "CBR 600", brandId: 1 };
      const result = await createModel(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error desconocido al crear el modelo");
    });

    it("debería manejar fallo en subida de archivo a S3", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");

      const mockImageFile = new File(["image content"], "image.jpg", { type: "image/jpeg" });
      formData.append("productImage", mockImageFile);

      // Simular fallo en S3
      mockUploadToFolder.mockResolvedValue({ success: false, error: "S3 upload failed" });

      const result = await createModel(formData);

      expect(result.success).toBe(true); // El modelo se crea aunque falle S3
      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: {
          name: "CBR 1000",
          brandId: 2,
          imageUrl: null, // Sin URL porque falló la subida
          specSheetUrl: null,
          additionalFilesJson: null,
        },
      });
    });
  });

  describe("Casos edge", () => {
    it("debería manejar FormData con pathToRevalidate", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");
      formData.append("pathToRevalidate", "/custom");

      await createModel(formData);

      expect(mockRevalidatePath).toHaveBeenCalledWith("/custom");
    });

    it("debería manejar brandId como string en FormData", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");

      await createModel(formData);

      expect(mockPrisma.model.create).toHaveBeenCalledWith({
        data: {
          name: "CBR 1000",
          brandId: 2, // Convertido a número
          imageUrl: null,
          specSheetUrl: null,
          additionalFilesJson: null,
        },
      });
    });

    it("debería manejar archivos que no existen en FormData", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");
      // No se agregan archivos

      const result = await createModel(formData);

      expect(result.success).toBe(true);
      expect(mockUploadToFolder).not.toHaveBeenCalled();
    });

    it("debería formatear resultado con additionalFiles desde uploadResults", async () => {
      const formData = new FormData();
      formData.append("name", "CBR 1000");
      formData.append("brandId", "2");

      const mockAdditionalFile = new File(["manual content"], "manual.pdf", {
        type: "application/pdf",
      });
      formData.append("additionalFile0", mockAdditionalFile);

      mockUploadToFolder.mockResolvedValue({
        success: true,
        url: "https://s3.example.com/manual.pdf",
      });

      const result = await createModel(formData);

      expect(result.success).toBe(true);
      expect(result.model?.additionalFiles).toEqual([
        { url: "https://s3.example.com/manual.pdf", name: "manual.pdf", type: "application/pdf" },
      ]);
    });

    it("debería manejar additionalFiles vacío", async () => {
      const input = { name: "CBR 600", brandId: 1 };

      const result = await createModel(input);

      expect(result.success).toBe(true);
      expect(result.model?.additionalFiles).toEqual([]);
    });
  });
});

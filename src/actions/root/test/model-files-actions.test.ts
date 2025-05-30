import { getSession } from "@/actions/util";
import { deleteFromS3 } from "@/lib/s3-unified";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock de getSession
vi.mock("@/actions/util", () => ({
  getSession: vi.fn(),
}));

// Mock de S3
vi.mock("@/lib/s3-unified", () => ({
  deleteFromS3: vi.fn(),
}));

// Mock de revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock directo del constructor de PrismaClient
const mockPrisma = {
  $use: vi.fn(),
  modelFile: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
};

// Mock PrismaClient constructor to return our mock
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  Prisma: {
    TransactionIsolationLevel: {
      ReadCommitted: "ReadCommitted",
    },
  },
}));

// Mock de sharp
vi.mock("sharp", () => ({
  default: vi.fn(),
}));

describe("model-files-actions", () => {
  const mockDeleteFromS3 = vi.mocked(deleteFromS3);
  const mockRevalidatePath = vi.mocked(revalidatePath);
  const mockGetSession = vi.mocked(getSession);

  const mockSessionData = {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      banned: false,
    },
    session: {
      id: "session-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      token: "mock-token",
    },
  };

  const mockFile = {
    id: "file-1",
    modelId: 1,
    name: "image.jpg",
    type: "image",
    url: "https://s3.example.com/image.jpg",
    size: 1024,
    s3Key: "models/honda/cbr-600/images/image.jpg",
    s3KeySmall: "models/honda/cbr-600/images/image_400.webp",
    createdAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRevalidatePath.mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ session: mockSessionData });
    mockPrisma.modelFile.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getModelFiles", () => {
    it("debería obtener archivos de modelo exitosamente", async () => {
      const mockFiles = [
        { ...mockFile, id: "file-1", name: "image1.jpg" },
        { ...mockFile, id: "file-2", name: "spec.pdf", type: "spec" },
      ];
      mockPrisma.modelFile.findMany.mockResolvedValue(mockFiles);

      const { getModelFiles } = await import("../model-files-actions");
      const result = await getModelFiles(1);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(mockPrisma.modelFile.findMany).toHaveBeenCalledWith({
        where: { modelId: 1 },
        orderBy: { createdAt: "desc" },
      });
    });

    it("debería fallar si no hay sesión válida", async () => {
      mockGetSession.mockResolvedValue({ session: null });

      const { getModelFiles } = await import("../model-files-actions");
      const result = await getModelFiles(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("debería devolver lista vacía si no hay archivos", async () => {
      mockPrisma.modelFile.findMany.mockResolvedValue([]);

      const { getModelFiles } = await import("../model-files-actions");
      const result = await getModelFiles(1);

      expect(result.success).toBe(true);
      expect(result.files).toEqual([]);
    });

    it("debería manejar error de base de datos", async () => {
      mockPrisma.modelFile.findMany.mockRejectedValue(new Error("Database error"));

      const { getModelFiles } = await import("../model-files-actions");
      const result = await getModelFiles(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("debería manejar modelId inválido", async () => {
      const { getModelFiles } = await import("../model-files-actions");

      let result = await getModelFiles(0);
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de modelo no válido");

      result = await getModelFiles(-1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de modelo no válido");

      result = await getModelFiles(Number.NaN);
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de modelo no válido");
    });
  });

  describe("deleteModelFile", () => {
    it("debería eliminar archivo exitosamente", async () => {
      mockPrisma.modelFile.findUnique.mockResolvedValue(mockFile);
      mockPrisma.modelFile.delete.mockResolvedValue(mockFile);
      mockDeleteFromS3.mockResolvedValue(undefined);

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Archivo eliminado correctamente");
      expect(mockPrisma.modelFile.findUnique).toHaveBeenCalledWith({ where: { id: "file-1" } });
      expect(mockDeleteFromS3).toHaveBeenCalledTimes(2);
      expect(mockDeleteFromS3).toHaveBeenCalledWith(mockFile.s3Key);
      expect(mockDeleteFromS3).toHaveBeenCalledWith(mockFile.s3KeySmall);
      expect(mockPrisma.modelFile.delete).toHaveBeenCalledWith({ where: { id: "file-1" } });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root/global-brands");
    });

    it("debería fallar si no hay sesión válida", async () => {
      mockGetSession.mockResolvedValue({ session: null });

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("debería fallar si el archivo no existe", async () => {
      mockPrisma.modelFile.findUnique.mockResolvedValue(null);

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-999");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Archivo no encontrado");
    });

    it("debería manejar archivo sin s3KeySmall", async () => {
      const fileWithoutSmallKey = { ...mockFile, s3KeySmall: null };
      mockPrisma.modelFile.findUnique.mockResolvedValue(fileWithoutSmallKey);
      mockPrisma.modelFile.delete.mockResolvedValue(fileWithoutSmallKey);
      mockDeleteFromS3.mockResolvedValue(undefined);

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(true);
      expect(mockDeleteFromS3).toHaveBeenCalledTimes(1);
      expect(mockDeleteFromS3).toHaveBeenCalledWith(fileWithoutSmallKey.s3Key);
    });

    it("debería manejar error en eliminación de S3", async () => {
      mockPrisma.modelFile.findUnique.mockResolvedValue(mockFile);
      mockDeleteFromS3.mockRejectedValue(new Error("S3 delete failed"));

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Error al eliminar archivo de S3");
    });

    it("debería manejar error en eliminación de base de datos", async () => {
      mockPrisma.modelFile.findUnique.mockResolvedValue(mockFile);
      mockDeleteFromS3.mockResolvedValue(undefined);
      mockPrisma.modelFile.delete.mockRejectedValue(new Error("Database error"));

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("debería manejar fileId vacío", async () => {
      const { deleteModelFile } = await import("../model-files-actions");

      let result = await deleteModelFile("");
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de archivo no válido");

      result = await deleteModelFile("   ");
      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de archivo no válido");
    });
  });

  describe("Casos edge", () => {
    it("debería manejar múltiples tipos de archivos", async () => {
      const mixedFiles = [
        { ...mockFile, id: "file-1", type: "image", name: "photo.jpg" },
        { ...mockFile, id: "file-2", type: "spec", name: "manual.pdf" },
        { ...mockFile, id: "file-3", type: "other", name: "document.docx" },
      ];
      mockPrisma.modelFile.findMany.mockResolvedValue(mixedFiles);

      const { getModelFiles } = await import("../model-files-actions");
      const result = await getModelFiles(1);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(3);
      expect(result.files?.map((f) => f.type)).toEqual(["image", "spec", "other"]);
    });

    it("debería manejar archivo de tipo spec sin s3KeySmall", async () => {
      const specFile = { ...mockFile, type: "spec", name: "manual.pdf", s3KeySmall: null };
      mockPrisma.modelFile.findUnique.mockResolvedValue(specFile);
      mockPrisma.modelFile.delete.mockResolvedValue(specFile);
      mockDeleteFromS3.mockResolvedValue(undefined);

      const { deleteModelFile } = await import("../model-files-actions");
      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(true);
      expect(mockDeleteFromS3).toHaveBeenCalledTimes(1);
      expect(mockDeleteFromS3).toHaveBeenCalledWith(specFile.s3Key);
    });
  });
});

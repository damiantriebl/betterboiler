import { type S3UploadResult, uploadToS3 } from "@/lib/s3-unified";
import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    model: {
      findUnique: vi.fn(),
    },
    modelFile: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/s3-unified", () => ({
  uploadToS3: vi.fn(),
}));

// Mock sharp correctamente
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    webp: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-processed-image")),
  })),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import { GET, POST } from "./route";

describe("/api/models/[modelId]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de NextResponse.json por defecto
    vi.mocked(NextResponse.json).mockImplementation(
      (data: any, init?: any) =>
        ({
          data,
          status: init?.status || 200,
        }) as any,
    );

    // Configurar mock de uploadToS3 por defecto
    vi.mocked(uploadToS3).mockResolvedValue({
      success: true,
      url: "https://example.com/test.jpg",
      key: "models/honda/1/original/test.jpg",
    });
  });

  describe("GET", () => {
    it("debería devolver lista de archivos cuando el modelo existe", async () => {
      // Arrange
      const mockModel = {
        id: 1,
        files: [
          {
            id: "1",
            name: "file1.jpg",
            type: "image/jpeg",
            s3Key: "models/honda/1/original/file1.jpg",
            s3KeySmall: "models/honda/1/thumbnail/file1.jpg",
            size: 1024,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.model.findUnique).mockResolvedValue(mockModel as any);

      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1" }),
      };

      // Act
      const response = await GET(mockRequest, mockContext);

      // Assert
      expect(prisma.model.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          files: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              type: true,
              s3Key: true,
              s3KeySmall: true,
              size: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      expect(NextResponse.json).toHaveBeenCalledWith({
        files: expect.arrayContaining([
          expect.objectContaining({
            id: "1",
            name: "file1.jpg",
            url: expect.stringContaining("amazonaws.com"),
          }),
        ]),
      });
    });

    it("debería devolver error 400 cuando el ID del modelo es inválido", async () => {
      // Arrange
      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "invalid" }),
      };

      // Act
      const response = await GET(mockRequest, mockContext);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "ID de modelo inválido" },
        { status: 400 },
      );
      expect(prisma.model.findUnique).not.toHaveBeenCalled();
    });

    it("debería devolver error 404 cuando el modelo no existe", async () => {
      // Arrange
      vi.mocked(prisma.model.findUnique).mockResolvedValue(null);

      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "999" }),
      };

      // Act
      const response = await GET(mockRequest, mockContext);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Modelo no encontrado" },
        { status: 404 },
      );
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      vi.mocked(prisma.model.findUnique).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1" }),
      };

      // Act
      const response = await GET(mockRequest, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error fetching model files:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Error al obtener archivos" },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });
  });

  describe("POST", () => {
    it("debería subir y procesar una imagen correctamente", async () => {
      // Arrange
      const mockFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
      } as unknown as File;

      // Mock FormData personalizado
      const mockFormData = {
        get: vi.fn((key: string) => {
          if (key === "file") return mockFile;
          if (key === "brandName") return "honda";
          return null;
        }),
        append: vi.fn(),
      } as unknown as FormData;

      const mockUploadResult: S3UploadResult = {
        success: true as const,
        url: "https://example.com/test.jpg",
        key: "models/honda/1/original/test.jpg",
      };

      vi.mocked(uploadToS3).mockResolvedValue(mockUploadResult);
      vi.mocked(prisma.modelFile.create).mockResolvedValue({
        id: "1",
        name: "test.jpg",
        type: "image/jpeg",
        s3Key: "models/honda/1/original/test.jpg",
        s3KeySmall: "models/honda/1/thumbnail/test.jpg",
        size: 1024,
        modelId: 1,
        url: "https://example.com/test.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1" }),
      };

      // Act
      const response = await POST(mockRequest, mockContext);

      // Assert
      expect(uploadToS3).toHaveBeenCalledTimes(2); // Original y thumbnail
      expect(prisma.modelFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "test.jpg",
          type: "image/jpeg",
          s3Key: "models/honda/1/original/test.jpg",
          s3KeySmall: "models/honda/1/thumbnail/test.jpg",
          modelId: 1,
        }),
      });
      expect(NextResponse.json).toHaveBeenCalledWith({
        file: expect.objectContaining({
          id: "1",
          name: "test.jpg",
        }),
      });
    });

    it("debería devolver error 400 cuando no se proporciona archivo", async () => {
      // Arrange
      const mockFormData = {
        get: vi.fn((key: string) => {
          if (key === "file") return null;
          if (key === "brandName") return "honda";
          return null;
        }),
        append: vi.fn(),
      } as unknown as FormData;

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1" }),
      };

      // Act
      const response = await POST(mockRequest, mockContext);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 },
      );
      expect(uploadToS3).not.toHaveBeenCalled();
      expect(prisma.modelFile.create).not.toHaveBeenCalled();
    });

    it("debería manejar errores de subida a S3", async () => {
      // Arrange
      const mockFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
      } as unknown as File;

      const mockFormData = {
        get: vi.fn((key: string) => {
          if (key === "file") return mockFile;
          if (key === "brandName") return "honda";
          return null;
        }),
        append: vi.fn(),
      } as unknown as FormData;

      // Mock para que falle la subida a S3
      vi.mocked(uploadToS3).mockResolvedValue({
        success: false,
        error: "S3 upload failed",
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1" }),
      };

      // Act
      const response = await POST(mockRequest, mockContext);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Error al subir archivo a S3" },
        { status: 500 },
      );
      expect(prisma.modelFile.create).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      const mockFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
      } as unknown as File;

      const mockFormData = {
        get: vi.fn((key: string) => {
          if (key === "file") return mockFile;
          if (key === "brandName") return "honda";
          return null;
        }),
        append: vi.fn(),
      } as unknown as FormData;

      vi.mocked(uploadToS3).mockResolvedValue({
        success: true as const,
        url: "https://example.com/test.jpg",
        key: "models/honda/1/original/test.jpg",
      });
      vi.mocked(prisma.modelFile.create).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1" }),
      };

      // Act
      const response = await POST(mockRequest, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error uploading model file:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Database error" }, { status: 500 });

      consoleSpy.mockRestore();
    });
  });
});

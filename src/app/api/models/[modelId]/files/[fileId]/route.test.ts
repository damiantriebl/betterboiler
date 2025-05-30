import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  default: {
    modelFile: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/s3-unified", () => ({
  deleteFromS3: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import { deleteFromS3 } from "@/lib/s3-unified";
import { DELETE } from "./route";

describe("/api/models/[modelId]/files/[fileId]", () => {
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
  });

  describe("DELETE", () => {
    it("debería eliminar archivo correctamente", async () => {
      // Arrange
      const mockFile = {
        id: "file-1",
        s3Key: "models/honda/1/original/test.jpg",
        s3KeySmall: "models/honda/1/thumbnail/test.jpg",
        name: "test.jpg",
        type: "image/jpeg",
      };

      vi.mocked(prisma.modelFile.findUnique).mockResolvedValue(mockFile as any);
      vi.mocked(deleteFromS3).mockResolvedValue(undefined);
      vi.mocked(prisma.modelFile.delete).mockResolvedValue(mockFile as any);

      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1", fileId: "file-1" }),
      };

      // Act
      const response = await DELETE(mockRequest, mockContext);

      // Assert
      expect(prisma.modelFile.findUnique).toHaveBeenCalledWith({
        where: { id: "file-1" },
      });
      expect(deleteFromS3).toHaveBeenCalledWith("models/honda/1/original/test.jpg");
      expect(deleteFromS3).toHaveBeenCalledWith("models/honda/1/thumbnail/test.jpg");
      expect(prisma.modelFile.delete).toHaveBeenCalledWith({
        where: { id: "file-1" },
      });
      expect(NextResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it("debería devolver error 400 cuando el ID del modelo es inválido", async () => {
      // Arrange
      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "invalid", fileId: "file-1" }),
      };

      // Act
      const response = await DELETE(mockRequest, mockContext);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith({ error: "ID inválido" }, { status: 400 });
      expect(prisma.modelFile.findUnique).not.toHaveBeenCalled();
    });

    it("debería devolver error 404 cuando el archivo no existe", async () => {
      // Arrange
      vi.mocked(prisma.modelFile.findUnique).mockResolvedValue(null);

      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1", fileId: "file-999" }),
      };

      // Act
      const response = await DELETE(mockRequest, mockContext);

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Archivo no encontrado" },
        { status: 404 },
      );
      expect(deleteFromS3).not.toHaveBeenCalled();
      expect(prisma.modelFile.delete).not.toHaveBeenCalled();
    });

    it("debería eliminar solo imagen original si no hay thumbnail", async () => {
      // Arrange
      const mockFile = {
        id: "file-1",
        s3Key: "models/honda/1/original/document.pdf",
        s3KeySmall: null,
        name: "document.pdf",
        type: "application/pdf",
      };

      vi.mocked(prisma.modelFile.findUnique).mockResolvedValue(mockFile as any);
      vi.mocked(deleteFromS3).mockResolvedValue(undefined);
      vi.mocked(prisma.modelFile.delete).mockResolvedValue(mockFile as any);

      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1", fileId: "file-1" }),
      };

      // Act
      const response = await DELETE(mockRequest, mockContext);

      // Assert
      expect(deleteFromS3).toHaveBeenCalledTimes(1);
      expect(deleteFromS3).toHaveBeenCalledWith("models/honda/1/original/document.pdf");
      expect(prisma.modelFile.delete).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it("debería manejar errores de base de datos en findUnique", async () => {
      // Arrange
      vi.mocked(prisma.modelFile.findUnique).mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1", fileId: "file-1" }),
      };

      // Act
      const response = await DELETE(mockRequest, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error deleting model file:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Error al eliminar archivo" },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });

    it("debería manejar errores de S3", async () => {
      // Arrange
      const mockFile = {
        id: "file-1",
        s3Key: "models/honda/1/original/test.jpg",
        s3KeySmall: null,
        name: "test.jpg",
        type: "image/jpeg",
      };

      vi.mocked(prisma.modelFile.findUnique).mockResolvedValue(mockFile as any);
      vi.mocked(deleteFromS3).mockRejectedValue(new Error("S3 error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {} as NextRequest;
      const mockContext = {
        params: Promise.resolve({ modelId: "1", fileId: "file-1" }),
      };

      // Act
      const response = await DELETE(mockRequest, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Error deleting model file:", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Error al eliminar archivo" },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });
  });
});

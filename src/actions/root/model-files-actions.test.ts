import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks básicos
vi.mock("@/actions/util", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/s3-unified", () => ({
  uploadToS3: vi.fn(),
  deleteFromS3: vi.fn(),
}));

vi.mock("sharp", () => ({
  default: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    model: {
      findUnique: vi.fn(),
    },
    modelFile: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getSession } from "@/actions/util";
import prisma from "@/lib/prisma";
import { deleteFromS3, uploadToS3 } from "@/lib/s3-unified";
import sharp from "sharp";
// Import after mocks
import { deleteModelFile, getModelFiles, uploadModelFiles } from "./model-files-actions";

describe("model-files-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadModelFiles", () => {
    it("devuelve error cuando no hay sesión válida", async () => {
      vi.mocked(getSession).mockResolvedValue({ session: null });

      const formData = new FormData();
      formData.append("modelId", "1");

      const result = await uploadModelFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("devuelve error cuando modelId no es válido", async () => {
      vi.mocked(getSession).mockResolvedValue({
        session: { user: { id: "user-1" } },
      });

      const formData = new FormData();
      formData.append("modelId", "invalid");

      const result = await uploadModelFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de modelo no válido");
    });
  });

  describe("getModelFiles", () => {
    it("devuelve error cuando no hay sesión válida", async () => {
      vi.mocked(getSession).mockResolvedValue({ session: null });

      const result = await getModelFiles(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("devuelve error cuando modelId no es válido", async () => {
      vi.mocked(getSession).mockResolvedValue({
        session: { user: { id: "user-1" } },
      });

      const result = await getModelFiles(0);

      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de modelo no válido");
    });
  });

  describe("deleteModelFile", () => {
    it("devuelve error cuando no hay sesión válida", async () => {
      vi.mocked(getSession).mockResolvedValue({ session: null });

      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("devuelve error cuando fileId no es válido", async () => {
      vi.mocked(getSession).mockResolvedValue({
        session: { user: { id: "user-1" } },
      });

      const result = await deleteModelFile("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de archivo no válido");
    });

    it("devuelve error cuando el archivo no existe", async () => {
      const mockSession = {
        session: { user: { id: "user-1" } },
      };

      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.modelFile.findUnique).mockResolvedValue(null);

      const result = await deleteModelFile("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Archivo no encontrado");
    });
  });
});

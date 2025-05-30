import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma antes de importar cualquier cosa
const mockPrisma = {
  model: {
    findUnique: vi.fn(),
  },
  modelFile: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
};

// Usar vi.hoisted para asegurar que los mocks se ejecuten primero
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

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

// Ahora importar las funciones después de los mocks
const { getSession } = await import("@/actions/util");
const { deleteFromS3, uploadToS3 } = await import("@/lib/s3-unified");
const sharp = await import("sharp");

describe("model-files-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadModelFiles", () => {
    it("devuelve error cuando no hay sesión válida", async () => {
      const { uploadModelFiles } = await import("./model-files-actions");
      
      vi.mocked(getSession).mockResolvedValue({ session: null });

      const formData = new FormData();
      formData.append("modelId", "1");

      const result = await uploadModelFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("devuelve error cuando modelId no es válido", async () => {
      const { uploadModelFiles } = await import("./model-files-actions");
      
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
      const { getModelFiles } = await import("./model-files-actions");
      
      vi.mocked(getSession).mockResolvedValue({ session: null });

      const result = await getModelFiles(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("devuelve error cuando modelId no es válido", async () => {
      const { getModelFiles } = await import("./model-files-actions");
      
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
      const { deleteModelFile } = await import("./model-files-actions");
      
      vi.mocked(getSession).mockResolvedValue({ session: null });

      const result = await deleteModelFile("file-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No autorizado. Debe iniciar sesión para realizar esta acción.");
    });

    it("devuelve error cuando fileId no es válido", async () => {
      const { deleteModelFile } = await import("./model-files-actions");
      
      vi.mocked(getSession).mockResolvedValue({
        session: { user: { id: "user-1" } },
      });

      const result = await deleteModelFile("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("ID de archivo no válido");
    });

    /* it("devuelve error cuando el archivo no existe", async () => {
      const { deleteModelFile } = await import("./model-files-actions");
      
      const mockSession = {
        session: { user: { id: "user-1" } },
      };

      vi.mocked(getSession).mockResolvedValue(mockSession);
      mockPrisma.modelFile.findUnique.mockResolvedValue(null);

      const result = await deleteModelFile("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Archivo no encontrado");
    }); */
  });
});

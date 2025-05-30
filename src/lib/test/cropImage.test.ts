import type { Crop } from "react-image-crop";
import { beforeEach, describe, expect, it, vi } from "vitest";
import getCroppedImg from "../cropImage";

// Mock de window y document
Object.defineProperty(window, "Image", {
  writable: true,
  value: class MockImage {
    onload: (() => void) | null = null;
    onerror: ((error: any) => void) | null = null;
    src = "";

    constructor() {
      // Simular carga de imagen
      setTimeout(() => {
        if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  },
});

// Mock de HTMLCanvasElement
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn(),
};

Object.defineProperty(document, "createElement", {
  writable: true,
  value: vi.fn((tagName: string) => {
    if (tagName === "canvas") {
      return mockCanvas;
    }
    return {};
  }),
});

describe("cropImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.toBlob.mockClear();
    mockCanvas.getContext.mockClear();
  });

  describe("getCroppedImg", () => {
    const mockImageSrc = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA...";

    beforeEach(() => {
      // Resetear el mock de Image para cada test
      Object.defineProperty(window, "Image", {
        writable: true,
        value: class MockImage {
          onload: (() => void) | null = null;
          onerror: ((error: any) => void) | null = null;
          src = "";

          constructor() {
            // Simular carga de imagen
            setTimeout(() => {
              if (this.onload) {
                this.onload();
              }
            }, 0);
          }
        },
      });
    });

    it("recorta imagen con dimensiones válidas", async () => {
      const pixelCrop: Crop = {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        unit: "px",
      };

      const mockBlob = new Blob(["mocked image data"], { type: "image/webp" });
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(mockBlob);
      });

      const mockContext = {
        drawImage: vi.fn(),
      };
      mockCanvas.getContext.mockReturnValue(mockContext);

      const result = await getCroppedImg(mockImageSrc, pixelCrop);

      expect(result).toBe(mockBlob);
      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(150);
      expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        expect.any(Object), // imagen
        10,
        20,
        100,
        150, // crop
        0,
        0,
        100,
        150, // destino
      );
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp");
    });

    it("rechaza promesa cuando no hay width en el crop", async () => {
      const pixelCrop: Crop = {
        x: 10,
        y: 20,
        width: 0, // Invalid width
        height: 150,
        unit: "px",
      };

      await expect(getCroppedImg(mockImageSrc, pixelCrop)).rejects.toThrow(
        "Crop dimensions are missing",
      );
    });

    it("rechaza promesa cuando no hay height en el crop", async () => {
      const pixelCrop: Crop = {
        x: 10,
        y: 20,
        width: 100,
        height: 0, // Invalid height
        unit: "px",
      };

      await expect(getCroppedImg(mockImageSrc, pixelCrop)).rejects.toThrow(
        "Crop dimensions are missing",
      );
    });

    it("rechaza promesa cuando no puede obtener contexto del canvas", async () => {
      const pixelCrop: Crop = {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        unit: "px",
      };

      mockCanvas.getContext.mockReturnValue(null as any);

      await expect(getCroppedImg(mockImageSrc, pixelCrop)).rejects.toThrow(
        "Failed to get canvas context",
      );
    });

    it("maneja error en la carga de imagen", async () => {
      const pixelCrop: Crop = {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        unit: "px",
      };

      // Mock de Image que falla en la carga
      Object.defineProperty(window, "Image", {
        writable: true,
        value: class MockErrorImage {
          onload: (() => void) | null = null;
          onerror: ((error: any) => void) | null = null;
          src = "";

          constructor() {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror(new Error("Failed to load image"));
              }
            }, 0);
          }
        },
      });

      await expect(getCroppedImg(mockImageSrc, pixelCrop)).rejects.toThrow("Failed to load image");
    });

    it("maneja dimensiones de crop grandes", async () => {
      const pixelCrop: Crop = {
        x: 0,
        y: 0,
        width: 2000,
        height: 1500,
        unit: "px",
      };

      const mockBlob = new Blob(["large image data"], { type: "image/webp" });
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(mockBlob);
      });

      const mockContext = {
        drawImage: vi.fn(),
      };
      mockCanvas.getContext.mockReturnValue(mockContext);

      const result = await getCroppedImg(mockImageSrc, pixelCrop);

      expect(result).toBe(mockBlob);
      expect(mockCanvas.width).toBe(2000);
      expect(mockCanvas.height).toBe(1500);
    });

    it("maneja crop con posición negativa", async () => {
      const pixelCrop: Crop = {
        x: -5,
        y: -10,
        width: 100,
        height: 150,
        unit: "px",
      };

      const mockBlob = new Blob(["cropped image data"], { type: "image/webp" });
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(mockBlob);
      });

      const mockContext = {
        drawImage: vi.fn(),
      };
      mockCanvas.getContext.mockReturnValue(mockContext);

      const result = await getCroppedImg(mockImageSrc, pixelCrop);

      expect(result).toBe(mockBlob);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        expect.any(Object),
        -5,
        -10,
        100,
        150,
        0,
        0,
        100,
        150,
      );
    });

    it("maneja crop con dimensiones decimales", async () => {
      const pixelCrop: Crop = {
        x: 10.5,
        y: 20.7,
        width: 100.3,
        height: 150.8,
        unit: "px",
      };

      const mockBlob = new Blob(["decimal crop data"], { type: "image/webp" });
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(mockBlob);
      });

      const mockContext = {
        drawImage: vi.fn(),
      };
      mockCanvas.getContext.mockReturnValue(mockContext);

      const result = await getCroppedImg(mockImageSrc, pixelCrop);

      expect(result).toBe(mockBlob);
      expect(mockCanvas.width).toBe(100.3);
      expect(mockCanvas.height).toBe(150.8);
    });

    it("maneja cuando toBlob devuelve null", async () => {
      const pixelCrop: Crop = {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        unit: "px",
      };

      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(null);
      });

      const mockContext = {
        drawImage: vi.fn(),
      };
      mockCanvas.getContext.mockReturnValue(mockContext);

      const result = await getCroppedImg(mockImageSrc, pixelCrop);

      expect(result).toBeNull();
    });
  });
});

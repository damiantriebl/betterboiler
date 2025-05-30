import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/api-optimizer", () => ({
  getCacheStats: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
  },
}));

import { getCacheStats } from "@/lib/api-optimizer";
import { GET } from "./route";

describe("/api/cache/stats", () => {
  const originalNodeEnv = process.env.NODE_ENV;

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

  afterEach(() => {
    // @ts-ignore - necesario para testing
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("GET", () => {
    it("debería devolver estadísticas de cache en desarrollo", async () => {
      // Arrange
      // @ts-ignore - necesario para testing
      process.env.NODE_ENV = "development";
      const mockStats = {
        hitRate: "85.7%",
        cacheSize: 100,
        maxSize: 1000,
        hits: 150,
        misses: 25,
        evictions: 0,
      };

      vi.mocked(getCacheStats).mockReturnValue(mockStats);
      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getCacheStats).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith({
        cache: mockStats,
        timestamp: expect.any(String),
        environment: "development",
      });
      expect(response.status).toBe(200);
    });

    it("debería devolver error 404 en producción", async () => {
      // Arrange
      // @ts-ignore - necesario para testing
      process.env.NODE_ENV = "production";
      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(getCacheStats).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Not available in production" },
        { status: 404 },
      );
      expect(response.status).toBe(404);
    });

    it("debería manejar errores de getCacheStats", async () => {
      // Arrange
      // @ts-ignore - necesario para testing
      process.env.NODE_ENV = "development";
      vi.mocked(getCacheStats).mockImplementation(() => {
        throw new Error("Cache error");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRequest = {} as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("[CACHE_STATS]", expect.any(Error));
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Error getting cache stats" },
        { status: 500 },
      );
      expect(response.status).toBe(500);

      consoleSpy.mockRestore();
    });
  });
});

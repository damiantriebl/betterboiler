import prisma from "@/lib/prisma";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAssetCache,
  fetchImageAsBase64,
  getAssetCacheSize,
  getAssetWithFallback,
  getLogoUrl,
  getLogoUrlFromOrganization,
  preloadAssets,
  removeFromAssetCache,
} from "../assets-unified";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../auth-session-unified", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

const mockPrisma = prisma as any;
const mockFetch = global.fetch as Mock;

// Import the mocked function
import { getOrganizationIdFromSession } from "../auth-session-unified";
const mockGetOrganizationIdFromSession = getOrganizationIdFromSession as Mock;

describe("assets-unified", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAssetCache();
  });

  describe("getLogoUrl", () => {
    it("should return null for empty input", async () => {
      const result = await getLogoUrl("");
      expect(result).toBeNull();
    });

    it("should return URL directly for valid HTTP URLs", async () => {
      const url = "https://example.com/logo.png";
      const result = await getLogoUrl(url);
      expect(result).toBe(url);
    });

    it("should return URL directly for valid HTTPS URLs", async () => {
      const url = "https://example.com/logo.png";
      const result = await getLogoUrl(url);
      expect(result).toBe(url);
    });

    it("should cache valid URLs", async () => {
      const url = "https://example.com/logo.png";

      // First call
      await getLogoUrl(url);
      // Second call should use cache
      const result = await getLogoUrl(url);

      expect(result).toBe(url);
      expect(getAssetCacheSize()).toBe(1);
    });

    it("should fetch signed URL for S3 paths", async () => {
      const s3Path = "logos/company-logo.png";
      const signedUrl = "https://s3.amazonaws.com/signed-url";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: { url: signedUrl },
          }),
      });

      const result = await getLogoUrl(s3Path);

      expect(result).toBe(signedUrl);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/s3/get-signed-url?name=${encodeURIComponent(s3Path)}&operation=get`,
      );
    });

    it("should return null when S3 API returns error", async () => {
      const s3Path = "logos/company-logo.png";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: "File not found",
          }),
      });

      const result = await getLogoUrl(s3Path);

      expect(result).toBeNull();
    });

    it("should handle fetch errors gracefully", async () => {
      const s3Path = "logos/company-logo.png";

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getLogoUrl(s3Path);

      expect(result).toBeNull();
    });

    it("should handle JSON parsing errors", async () => {
      const s3Path = "logos/company-logo.png";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const result = await getLogoUrl(s3Path);

      expect(result).toBeNull();
    });
  });

  describe("getLogoUrlFromOrganization", () => {
    it("should return logo URL when organization has logo", async () => {
      const logoPath = "logos/org-logo.png";
      const signedUrl = "https://s3.amazonaws.com/signed-url";

      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        logo: logoPath,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: { url: signedUrl },
          }),
      });

      const result = await getLogoUrlFromOrganization();

      expect(result).toBe(signedUrl);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "org-1" },
        select: { logo: true },
      });
    });

    it("should return null when no organization ID", async () => {
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: null,
      });

      const result = await getLogoUrlFromOrganization();

      expect(result).toBeNull();
    });

    it("should return null when organization has no logo", async () => {
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        logo: null,
      });

      const result = await getLogoUrlFromOrganization();

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockGetOrganizationIdFromSession.mockResolvedValue({
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await getLogoUrlFromOrganization();

      expect(result).toBeNull();
    });
  });

  describe("fetchImageAsBase64", () => {
    it("should return base64 encoded image", async () => {
      const imagePath = "images/test.png";
      const signedUrl = "https://s3.amazonaws.com/signed-url";
      const mockBuffer = new ArrayBuffer(8);
      const expectedBase64 = Buffer.from(mockBuffer).toString("base64");

      // Mock getLogoUrl
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: { url: signedUrl },
          }),
      });

      // Mock image fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === "content-type" ? "image/png" : null),
        },
        arrayBuffer: () => Promise.resolve(mockBuffer),
      });

      const result = await fetchImageAsBase64(imagePath);

      expect(result).toBe(`data:image/png;base64,${expectedBase64}`);
    });

    it("should throw error when image URL cannot be obtained", async () => {
      const imagePath = "images/test.png";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: "File not found",
          }),
      });

      await expect(fetchImageAsBase64(imagePath)).rejects.toThrow(
        "No se pudo obtener la URL de la imagen",
      );
    });

    it("should throw error when image fetch fails", async () => {
      const imagePath = "images/test.png";
      const signedUrl = "https://s3.amazonaws.com/signed-url";

      // Mock getLogoUrl success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: { url: signedUrl },
          }),
      });

      // Mock image fetch failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(fetchImageAsBase64(imagePath)).rejects.toThrow("No se pudo obtener la imagen");
    });

    it("should use default content type when not provided", async () => {
      const imagePath = "images/test.png";
      const signedUrl = "https://s3.amazonaws.com/signed-url";
      const mockBuffer = new ArrayBuffer(8);
      const expectedBase64 = Buffer.from(mockBuffer).toString("base64");

      // Mock getLogoUrl
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: { url: signedUrl },
          }),
      });

      // Mock image fetch without content-type
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
        arrayBuffer: () => Promise.resolve(mockBuffer),
      });

      const result = await fetchImageAsBase64(imagePath);

      expect(result).toBe(`data:image/png;base64,${expectedBase64}`);
    });
  });

  describe("cache management", () => {
    it("should clear cache", () => {
      // Add something to cache first
      getLogoUrl("https://example.com/logo.png");
      expect(getAssetCacheSize()).toBeGreaterThan(0);

      clearAssetCache();
      expect(getAssetCacheSize()).toBe(0);
    });

    it("should remove specific item from cache", async () => {
      const url = "https://example.com/logo.png";
      await getLogoUrl(url);

      expect(getAssetCacheSize()).toBe(1);

      const removed = removeFromAssetCache(url);
      expect(removed).toBe(true);
      expect(getAssetCacheSize()).toBe(0);
    });

    it("should return false when removing non-existent cache item", () => {
      const removed = removeFromAssetCache("non-existent");
      expect(removed).toBe(false);
    });
  });

  describe("getAssetWithFallback", () => {
    it("should return primary asset when available", async () => {
      const primaryUrl = "https://example.com/primary.png";

      const result = await getAssetWithFallback(primaryUrl);

      expect(result).toEqual({
        success: true,
        url: primaryUrl,
      });
    });

    it("should return fallback when primary fails", async () => {
      const primaryPath = "missing/primary.png";
      const fallbackUrl = "https://example.com/fallback.png";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: "File not found",
          }),
      });

      const result = await getAssetWithFallback(primaryPath, fallbackUrl);

      expect(result).toEqual({
        success: true,
        url: fallbackUrl,
      });
    });

    it("should return error when both primary and fallback fail", async () => {
      const primaryPath = "missing/primary.png";
      const fallbackPath = "missing/fallback.png";

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: "File not found",
          }),
      });

      const result = await getAssetWithFallback(primaryPath, fallbackPath);

      expect(result).toEqual({
        success: false,
        error: "No se pudo obtener la imagen principal ni la de respaldo",
      });
    });

    it("should handle errors gracefully", async () => {
      const primaryPath = "error/primary.png";

      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await getAssetWithFallback(primaryPath);

      expect(result).toEqual({
        success: false,
        error: "No se pudo obtener la imagen principal ni la de respaldo",
      });
    });
  });

  describe("preloadAssets", () => {
    it("should preload multiple assets", async () => {
      const paths = [
        "https://example.com/logo1.png",
        "https://example.com/logo2.png",
        "path/to/logo3.png",
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: { url: "https://s3.amazonaws.com/signed-url" },
          }),
      });

      await preloadAssets(paths);

      // Should have cached the HTTP URLs and attempted to fetch signed URLs
      expect(getAssetCacheSize()).toBeGreaterThan(0);
    });

    it("should handle preload errors gracefully", async () => {
      const paths = ["error/path.png"];

      mockFetch.mockRejectedValue(new Error("Network error"));

      // Should not throw
      await expect(preloadAssets(paths)).resolves.toBeUndefined();
    });
  });
});

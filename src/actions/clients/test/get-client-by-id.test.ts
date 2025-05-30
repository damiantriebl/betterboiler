import prisma from "@/lib/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientById } from "../get-client-by-id";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    client: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

const mockPrisma = prisma as any;

describe("getClientById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockClient = {
    id: "client-123",
    type: "Individual",
    firstName: "Juan",
    lastName: "Pérez",
    companyName: null,
    taxId: "20-12345678-9",
    email: "juan.perez@example.com",
    phone: "+5491123456789",
    mobile: "+5491198765432",
    address: "Av. Corrientes 1234, CABA",
    status: "active",
    notes: "Cliente regular",
    vatStatus: "Responsable Inscripto",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  describe("✅ Successful Retrieval", () => {
    it("should return client when found", async () => {
      // Arrange
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);

      // Act
      const result = await getClientById("client-123");

      // Assert
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: "client-123" },
      });
      expect(result).toEqual(mockClient);
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[Action getClientById] Fetching client with ID: client-123",
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[Action getClientById] Client found:",
        mockClient,
      );
    });

    it("should handle client with minimal data", async () => {
      // Arrange
      const minimalClient = {
        id: "client-456",
        type: "Individual",
        firstName: "María",
        lastName: null,
        companyName: null,
        taxId: "27-87654321-0",
        email: "maria@example.com",
        phone: null,
        mobile: null,
        address: null,
        status: "active",
        notes: null,
        vatStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.client.findUnique.mockResolvedValue(minimalClient);

      // Act
      const result = await getClientById("client-456");

      // Assert
      expect(result).toEqual(minimalClient);
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[Action getClientById] Client found:",
        minimalClient,
      );
    });

    it("should handle legal entity client", async () => {
      // Arrange
      const legalEntityClient = {
        ...mockClient,
        id: "client-789",
        type: "LegalEntity",
        firstName: "ACME",
        lastName: null,
        companyName: "ACME Corporation S.A.",
        taxId: "30-12345678-9",
      };

      mockPrisma.client.findUnique.mockResolvedValue(legalEntityClient);

      // Act
      const result = await getClientById("client-789");

      // Assert
      expect(result).toEqual(legalEntityClient);
      expect(result?.type).toBe("LegalEntity");
      expect(result?.companyName).toBe("ACME Corporation S.A.");
    });

    it("should handle client with different status", async () => {
      // Arrange
      const inactiveClient = {
        ...mockClient,
        id: "client-inactive",
        status: "inactive",
      };

      mockPrisma.client.findUnique.mockResolvedValue(inactiveClient);

      // Act
      const result = await getClientById("client-inactive");

      // Assert
      expect(result).toEqual(inactiveClient);
      expect(result?.status).toBe("inactive");
    });
  });

  describe("❌ Client Not Found", () => {
    it("should return null when client does not exist", async () => {
      // Arrange
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById("non-existent-client");

      // Assert
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-client" },
      });
      expect(result).toBe(null);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[Action getClientById] Client not found for ID: non-existent-client",
      );
    });

    it("should return null for empty client ID", async () => {
      // Act
      const result = await getClientById("");

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] No client ID provided.",
      );
      expect(mockPrisma.client.findUnique).not.toHaveBeenCalled();
    });

    it("should return null for undefined client ID", async () => {
      // Act
      const result = await getClientById(undefined as any);

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] No client ID provided.",
      );
      expect(mockPrisma.client.findUnique).not.toHaveBeenCalled();
    });

    it("should return null for null client ID", async () => {
      // Act
      const result = await getClientById(null as any);

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] No client ID provided.",
      );
      expect(mockPrisma.client.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("❌ Database Errors", () => {
    it("should handle database connection error", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      mockPrisma.client.findUnique.mockRejectedValue(dbError);

      // Act
      const result = await getClientById("client-123");

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] Error fetching client ID client-123:",
        dbError,
      );
    });

    it("should handle timeout error", async () => {
      // Arrange
      const timeoutError = new Error("Query timeout");
      mockPrisma.client.findUnique.mockRejectedValue(timeoutError);

      // Act
      const result = await getClientById("client-timeout");

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] Error fetching client ID client-timeout:",
        timeoutError,
      );
    });

    it("should handle unknown database error", async () => {
      // Arrange
      const unknownError = "Unknown database error";
      mockPrisma.client.findUnique.mockRejectedValue(unknownError);

      // Act
      const result = await getClientById("client-error");

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] Error fetching client ID client-error:",
        unknownError,
      );
    });

    it("should handle network error", async () => {
      // Arrange
      const networkError = new Error("Network unreachable");
      mockPrisma.client.findUnique.mockRejectedValue(networkError);

      // Act
      const result = await getClientById("client-network");

      // Assert
      expect(result).toBe(null);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] Error fetching client ID client-network:",
        networkError,
      );
    });
  });

  describe("🎯 Edge Cases", () => {
    it("should handle very long client ID", async () => {
      // Arrange
      const longId = "a".repeat(1000);
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById(longId);

      // Assert
      expect(result).toBe(null);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: longId },
      });
    });

    it("should handle client ID with special characters", async () => {
      // Arrange
      const specialId = "client-@#$%^&*()_+-=[]{}|;:,.<>?";
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById(specialId);

      // Assert
      expect(result).toBe(null);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: specialId },
      });
    });

    it("should handle client ID with unicode characters", async () => {
      // Arrange
      const unicodeId = "cliente-año-2025-🏢";
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById(unicodeId);

      // Assert
      expect(result).toBe(null);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: unicodeId },
      });
    });

    it("should handle numeric string ID", async () => {
      // Arrange
      const numericId = "123456789";
      const clientWithNumericId = { ...mockClient, id: numericId };
      mockPrisma.client.findUnique.mockResolvedValue(clientWithNumericId);

      // Act
      const result = await getClientById(numericId);

      // Assert
      expect(result).toEqual(clientWithNumericId);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: numericId },
      });
    });

    it("should handle whitespace in client ID", async () => {
      // Arrange
      const whitespaceId = "  client-with-spaces  ";
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById(whitespaceId);

      // Assert
      expect(result).toBe(null);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: whitespaceId },
      });
    });
  });

  describe("📊 Logging Behavior", () => {
    it("should log the correct sequence for successful retrieval", async () => {
      // Arrange
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);

      // Act
      await getClientById("client-123");

      // Assert
      expect(mockConsole.log).toHaveBeenCalledTimes(2);
      expect(mockConsole.log).toHaveBeenNthCalledWith(
        1,
        "[Action getClientById] Fetching client with ID: client-123",
      );
      expect(mockConsole.log).toHaveBeenNthCalledWith(
        2,
        "[Action getClientById] Client found:",
        mockClient,
      );
    });

    it("should log the correct sequence for client not found", async () => {
      // Arrange
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      await getClientById("non-existent");

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[Action getClientById] Fetching client with ID: non-existent",
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[Action getClientById] Client not found for ID: non-existent",
      );
    });

    it("should log error for database issues", async () => {
      // Arrange
      const error = new Error("DB Error");
      mockPrisma.client.findUnique.mockRejectedValue(error);

      // Act
      await getClientById("error-client");

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[Action getClientById] Fetching client with ID: error-client",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] Error fetching client ID error-client:",
        error,
      );
    });

    it("should not log fetching message for empty ID", async () => {
      // Act
      await getClientById("");

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[Action getClientById] No client ID provided.",
      );
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe("🔄 Cache Behavior", () => {
    it("should use React cache function", () => {
      // The function is wrapped with cache() from React
      // This is more of a structural test to ensure the function is exported correctly
      expect(typeof getClientById).toBe("function");
    });

    it("should work with multiple calls (cache should not interfere with testing)", async () => {
      // Arrange
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);

      // Act
      const result1 = await getClientById("client-123");
      const result2 = await getClientById("client-123");

      // Assert
      expect(result1).toEqual(mockClient);
      expect(result2).toEqual(mockClient);
      // In testing environment, cache might not work exactly as in production
      // but we should still get the expected results
    });
  });

  describe("🔐 Security Considerations", () => {
    it("should handle potential SQL injection attempts safely", async () => {
      // Arrange
      const maliciousId = "'; DROP TABLE clients; --";
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById(maliciousId);

      // Assert
      expect(result).toBe(null);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: maliciousId },
      });
      // Prisma ORM should handle SQL injection protection automatically
    });

    it("should handle XSS attempts in client ID", async () => {
      // Arrange
      const xssId = '<script>alert("xss")</script>';
      mockPrisma.client.findUnique.mockResolvedValue(null);

      // Act
      const result = await getClientById(xssId);

      // Assert
      expect(result).toBe(null);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: xssId },
      });
    });
  });
});

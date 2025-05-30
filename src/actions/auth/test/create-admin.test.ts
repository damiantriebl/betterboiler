import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminUser } from "../create-admin";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    organization: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    account: {
      deleteMany: vi.fn(),
    },
  },
}));

// Mock de auth
vi.mock("@/auth", () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};

describe("createAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockData = {
    email: "admin@test.com",
    password: "password123",
    name: "Admin User",
    organizationSlug: "test-org",
    organizationName: "Test Organization",
    role: "admin",
  };

  const mockOrganization = {
    id: "org-123",
    name: "Test Organization",
    slug: "test-org",
  };

  describe("✅ Successful Admin Creation", () => {
    it("should create organization and new user successfully", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaMock = prisma as any;
      prismaMock.organization.upsert.mockResolvedValue(mockOrganization);
      prismaMock.user.findUnique.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authMock = auth as any;
      authMock.api.signUpEmail.mockResolvedValue({
        user: { id: "user-123", email: mockData.email },
      });
      prismaMock.user.update.mockResolvedValue({});

      // Act
      const result = await createAdminUser(
        mockData.email,
        mockData.password,
        mockData.name,
        mockData.organizationSlug,
        mockData.organizationName,
        mockData.role,
      );

      // Assert
      expect(prismaMock.organization.upsert).toHaveBeenCalledWith({
        where: { slug: mockData.organizationSlug },
        update: {},
        create: {
          name: mockData.organizationName,
          slug: mockData.organizationSlug,
        },
      });
      expect(authMock.api.signUpEmail).toHaveBeenCalledWith({
        body: {
          email: mockData.email,
          password: mockData.password,
          name: mockData.name,
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Usuario administrador creado correctamente");
    });

    it("should update existing user successfully", async () => {
      // Arrange
      const existingUser = {
        id: "existing-user-123",
        email: mockData.email,
        accounts: [{ id: "account-1" }],
      };

      const prismaMock = prisma as any;
      prismaMock.organization.upsert.mockResolvedValue(mockOrganization);
      prismaMock.user.findUnique.mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.account.deleteMany.mockResolvedValue({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authMock = auth as any;
      authMock.api.signUpEmail.mockResolvedValue({
        user: { id: existingUser.id, email: mockData.email },
      });

      // Act
      const result = await createAdminUser(
        mockData.email,
        mockData.password,
        mockData.name,
        mockData.organizationSlug,
        mockData.organizationName,
        mockData.role,
      );

      // Assert
      expect(prismaMock.account.deleteMany).toHaveBeenCalledWith({
        where: { userId: existingUser.id },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Usuario administrador actualizado correctamente");
    });

    it('should use default role "root" when role is not provided', async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaMock = prisma as any;
      prismaMock.organization.upsert.mockResolvedValue(mockOrganization);
      prismaMock.user.findUnique.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authMock = auth as any;
      const mockUser = { id: "user-123", email: mockData.email };
      authMock.api.signUpEmail.mockResolvedValue({ user: mockUser });
      prismaMock.user.update.mockResolvedValue({});

      // Act
      await createAdminUser(
        mockData.email,
        mockData.password,
        mockData.name,
        mockData.organizationSlug,
        mockData.organizationName,
        // No role provided - should default to "root"
      );

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          emailVerified: true,
          role: "root", // Default value
          organizationId: mockOrganization.id,
        },
      });
    });
  });

  describe("❌ Error Handling", () => {
    it("should handle auth signup failure", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaMock = prisma as any;
      prismaMock.organization.upsert.mockResolvedValue(mockOrganization);
      prismaMock.user.findUnique.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authMock = auth as any;
      authMock.api.signUpEmail.mockResolvedValue({ user: null });

      // Act
      const result = await createAdminUser(
        mockData.email,
        mockData.password,
        mockData.name,
        mockData.organizationSlug,
        mockData.organizationName,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain("Error:");
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaMock = prisma as any;
      prismaMock.organization.upsert.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const result = await createAdminUser(
        mockData.email,
        mockData.password,
        mockData.name,
        mockData.organizationSlug,
        mockData.organizationName,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("Error: Database connection failed");
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe("🧪 Console Logging", () => {
    it("should log organization creation process", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaMock = prisma as any;
      prismaMock.organization.upsert.mockResolvedValue(mockOrganization);
      prismaMock.user.findUnique.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authMock = auth as any;
      authMock.api.signUpEmail.mockResolvedValue({
        user: { id: "user-123", email: mockData.email },
      });
      prismaMock.user.update.mockResolvedValue({});

      // Act
      await createAdminUser(
        mockData.email,
        mockData.password,
        mockData.name,
        mockData.organizationSlug,
        mockData.organizationName,
      );

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        `Creando/verificando organización ${mockData.organizationName}...`,
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        `Organización creada/actualizada con ID: ${mockOrganization.id}`,
      );
    });
  });
});

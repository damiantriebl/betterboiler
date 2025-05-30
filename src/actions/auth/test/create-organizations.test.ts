import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrganization } from "../create-edit-organizations";

// Mock de Next.js cache y headers
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock de auth
vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock de Sharp
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-image")),
  }));
  return { default: mockSharp };
});

// Mock de S3 upload
vi.mock("@/lib/s3-unified", () => ({
  uploadToS3: vi.fn().mockResolvedValue({
    success: true,
    key: "mock-s3-key",
    url: "https://s3.example.com/mock-s3-key",
  }),
}));

// Mock de uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockHeaders = headers as any;
const mockPrisma = prisma as any;
const mockAuth = auth as any;

describe("createOrganization", () => {
  const initialState = { success: false as string | false, error: false as string | false };
  const mockUser = {
    id: "user-123",
    email: "user@example.com",
    name: "Test User",
  };
  const mockHeadersInstance = new Headers();

  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
    mockHeaders.mockResolvedValue(mockHeadersInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createFormData = (name: string, logo?: string) => {
    const formData = new FormData();
    formData.append("name", name);
    if (logo) formData.append("logo", logo);
    return formData;
  };

  describe("✅ Successful Organization Creation", () => {
    it("should create organization successfully with valid name", async () => {
      // Arrange
      const orgName = "Test Organization";
      const expectedSlug = "test-organization";
      const mockOrganization = {
        id: "org-123",
        name: orgName,
        slug: expectedSlug,
        logo: "",
      };

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.findUnique.mockResolvedValue(null); // No existe slug duplicado
      mockPrisma.organization.create.mockResolvedValue(mockOrganization);
      mockPrisma.organization.update.mockResolvedValue(mockOrganization);

      // Act
      const result = await createOrganization(initialState, createFormData(orgName));

      // Assert
      expect(mockAuth.api.getSession).toHaveBeenCalledWith({ headers: mockHeadersInstance });
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: expectedSlug },
      });
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: orgName,
          slug: expectedSlug,
        },
      });
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-123" },
        data: {
          name: orgName,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root");
      expect(mockConsole.log).toHaveBeenCalledWith("new organization", mockOrganization);
      expect(result.success).toBe("Organización creada con éxito.");
      expect(result.error).toBe(false);
    });

    it("should create organization with logo string", async () => {
      // Arrange
      const orgName = "Organization with Logo";
      const logoUrl = "https://example.com/logo.png";
      const mockOrganization = {
        id: "org-123",
        name: orgName,
        slug: "organization-with-logo",
        logo: logoUrl,
      };

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockOrganization);
      mockPrisma.organization.update.mockResolvedValue(mockOrganization);

      // Act
      const result = await createOrganization(initialState, createFormData(orgName, logoUrl));

      // Assert
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-123" },
        data: {
          name: orgName,
          logo: logoUrl,
        },
      });
      expect(result.success).toBe("Organización creada con éxito.");
    });

    it("should generate correct slug from organization name", async () => {
      // Arrange
      const testCases = [
        { name: "My Company", expectedSlug: "my-company" },
        { name: "Tech Innovation", expectedSlug: "tech-innovation" },
        { name: "Company With Spaces", expectedSlug: "company-with-spaces" },
        { name: "UPPERCASE NAME", expectedSlug: "uppercase-name" },
      ];

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });

      for (const { name, expectedSlug } of testCases) {
        mockPrisma.organization.findUnique.mockResolvedValue(null);
        mockPrisma.organization.create.mockResolvedValue({
          id: "org-123",
          name,
          slug: expectedSlug,
        });
        mockPrisma.organization.update.mockResolvedValue({
          id: "org-123",
          name,
          slug: expectedSlug,
        });

        // Act
        await createOrganization(initialState, createFormData(name));

        // Assert
        expect(mockPrisma.organization.create).toHaveBeenCalledWith({
          data: {
            name,
            slug: expectedSlug,
          },
        });
      }
    });

    it("should handle null logo and default to empty string", async () => {
      // Arrange
      const orgName = "Test Org";
      const formData = new FormData();
      formData.append("name", orgName);
      // No logo field

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: orgName,
        slug: "test-org",
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: "org-123",
        name: orgName,
        slug: "test-org",
      });

      // Act
      const result = await createOrganization(initialState, formData);

      // Assert
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: orgName,
          slug: "test-org",
        },
      });
      expect(result.success).toBeTruthy();
    });
  });

  describe("❌ Authentication Errors", () => {
    it("should return error when user is not authenticated", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      // Act
      const result = await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado");
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("should return error when session exists but user is null", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: null });

      // Act
      const result = await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado");
    });

    it("should return error when session is undefined", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue(undefined);

      // Act
      const result = await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(result.error).toBe("Usuario no autenticado");
      expect(result.success).toBe(false);
    });
  });

  describe("❌ Validation Errors", () => {
    it("should return error when name is not provided", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      const formData = new FormData();
      // No name field

      // Act
      const result = await createOrganization(initialState, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("El nombre es requerido.");
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
    });

    it("should return error when name is empty string", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });

      // Act
      const result = await createOrganization(initialState, createFormData(""));

      // Assert
      expect(result.error).toBe("El nombre es requerido.");
      expect(result.success).toBe(false);
    });

    it("should return error when name is null", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      const formData = new FormData();
      formData.append("name", "null");
      formData.delete("name"); // This makes get() return null

      // Act
      const result = await createOrganization(initialState, formData);

      // Assert
      expect(result.error).toBe("El nombre es requerido.");
      expect(result.success).toBe(false);
    });
  });

  describe("🔧 Database Errors", () => {
    it("should handle database connection errors", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const result = await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("should handle unique constraint violations", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockRejectedValue(new Error("Unique constraint violation"));

      // Act
      const result = await createOrganization(initialState, createFormData("Existing Org"));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unique constraint violation");
    });

    it("should handle unknown database errors gracefully", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockRejectedValue("Unknown error");

      // Act
      const result = await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(result.error).toBe("Ocurrió un error inesperado.");
      expect(result.success).toBe(false);
    });
  });

  describe("🔄 Cache Revalidation", () => {
    it("should revalidate /root path after successful creation", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
        logo: "",
      });

      // Act
      await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith("/root");
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });

    it("should not revalidate on validation errors", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });

      // Act
      await createOrganization(initialState, createFormData(""));

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("should not revalidate on database errors", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockRejectedValue(new Error("Database error"));

      // Act
      await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("🧪 Console Logging", () => {
    it("should log organization creation with correct details", async () => {
      // Arrange
      const orgName = "Logged Organization";
      const mockOrganization = {
        id: "org-123",
        name: orgName,
        slug: "logged-organization",
        logo: "",
      };

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockResolvedValue(mockOrganization);

      // Act
      await createOrganization(initialState, createFormData(orgName));

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith("new organization", mockOrganization);
    });

    it("should not log on failed creation", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockRejectedValue(new Error("Creation failed"));

      // Act
      await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe("📋 FormData Handling", () => {
    it("should correctly extract name and logo from FormData", async () => {
      // Arrange
      const orgName = "FormData Organization";
      const logoUrl = "https://example.com/logo.png";

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: orgName,
        slug: "formdata-organization",
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: "org-123",
        name: orgName,
        slug: "formdata-organization",
        logo: logoUrl,
      });

      // Act
      await createOrganization(initialState, createFormData(orgName, logoUrl));

      // Assert
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: orgName,
          slug: "formdata-organization",
        },
      });
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-123" },
        data: {
          name: orgName,
          logo: logoUrl,
        },
      });
    });

    it("should handle FormData with extra fields", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("name", "Test Org");
      formData.append("logo", "logo.png");
      formData.append("extraField", "should-be-ignored");
      formData.append("description", "should-be-ignored");

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
        logo: "logo.png",
      });

      // Act
      const result = await createOrganization(initialState, formData);

      // Assert
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: "Test Org",
          slug: "test-org",
        },
      });
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-123" },
        data: {
          name: "Test Org",
          logo: "logo.png",
        },
      });
      expect(result.success).toBeTruthy();
    });
  });

  describe("🚀 Edge Cases", () => {
    it("should handle very long organization names", async () => {
      // Arrange
      const longName =
        "Very Long Organization Name That Exceeds Normal Limits And Should Be Handled Gracefully";

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: longName,
        slug: longName.toLowerCase().replace(/ /g, "-"),
        logo: "",
      });

      // Act
      const result = await createOrganization(initialState, createFormData(longName));

      // Assert
      expect(result.success).toBe("Organización creada con éxito.");
    });

    it("should handle organization names with special characters", async () => {
      // Arrange
      const specialName = "Tech & Innovation Co.";

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: specialName,
        slug: "tech-&-innovation-co.",
        logo: "",
      });

      // Act
      const result = await createOrganization(initialState, createFormData(specialName));

      // Assert
      expect(result.success).toBe("Organización creada con éxito.");
    });

    it("should handle organization names with multiple spaces", async () => {
      // Arrange
      const spacedName = "Organization   With   Multiple   Spaces";

      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-123",
        name: spacedName,
        slug: "organization---with---multiple---spaces",
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: "org-123",
        name: spacedName,
        slug: "organization---with---multiple---spaces",
      });

      // Act
      const result = await createOrganization(initialState, createFormData(spacedName));

      // Assert
      expect(result.success).toBe("Organización creada con éxito.");
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: spacedName,
          slug: "organization---with---multiple---spaces",
        },
      });
    });
  });

  describe("⚡ Performance Considerations", () => {
    it("should fail fast on authentication errors", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue(null);

      const startTime = Date.now();

      // Act
      await createOrganization(initialState, createFormData("Test Org"));

      // Assert
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should fail quickly
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
    });

    it("should not make unnecessary API calls on validation failure", async () => {
      // Arrange
      mockAuth.api.getSession.mockResolvedValue({ user: mockUser });

      // Act
      await createOrganization(initialState, createFormData(""));

      // Assert
      expect(mockAuth.api.getSession).toHaveBeenCalledTimes(1);
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});

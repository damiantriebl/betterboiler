import prisma from "@/lib/prisma";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBranchesData,
  getBranchesForOrganizationAction,
  getCurrentOrganizationDetails,
  getOrganizationDetailsById,
  getOrganizationSummary,
  getOrganizationUsers,
  getUsersForOrganizationAction,
} from "../organization-data-unified";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    organization: {
      findUnique: vi.fn(),
    },
    branch: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../auth-session-unified", () => ({
  validateOrganizationAccess: vi.fn(),
}));

const mockPrisma = prisma as any;

// Import the mocked function
import { validateOrganizationAccess } from "../auth-session-unified";
const mockValidateOrganizationAccess = validateOrganizationAccess as Mock;

describe("organization-data-unified", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrganizationDetailsById", () => {
    it("should return organization when found", async () => {
      const mockOrganization = {
        id: "org-1",
        name: "Test Organization",
        email: "test@org.com",
      };

      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await getOrganizationDetailsById("org-1");

      expect(result).toEqual(mockOrganization);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "org-1" },
      });
    });

    it("should return null when organization not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await getOrganizationDetailsById("non-existent");

      expect(result).toBeNull();
    });

    it("should return null for empty organizationId", async () => {
      const result = await getOrganizationDetailsById("");

      expect(result).toBeNull();
      expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      mockPrisma.organization.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await getOrganizationDetailsById("org-1");

      expect(result).toBeNull();
    });
  });

  describe("getCurrentOrganizationDetails", () => {
    it("should return organization details when valid access", async () => {
      const mockOrganization = {
        id: "org-1",
        name: "Test Organization",
        email: "test@org.com",
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await getCurrentOrganizationDetails();

      expect(result).toEqual({
        success: true,
        data: mockOrganization,
      });
    });

    it("should return error when organization access fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getCurrentOrganizationDetails();

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });

    it("should return error when organization not found", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await getCurrentOrganizationDetails();

      expect(result).toEqual({
        success: false,
        error: "Organización no encontrada",
      });
    });

    it("should handle database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await getCurrentOrganizationDetails();

      expect(result).toEqual({
        success: false,
        error: "Organización no encontrada",
      });
    });
  });

  describe("getBranchesForOrganizationAction", () => {
    it("should return branches for provided organizationId", async () => {
      const mockBranches = [
        { id: 1, name: "Branch 1", organizationId: "org-1", order: 1 },
        { id: 2, name: "Branch 2", organizationId: "org-1", order: 2 },
      ];

      mockPrisma.branch.findMany.mockResolvedValue(mockBranches);

      const result = await getBranchesForOrganizationAction("org-1");

      expect(result).toEqual(mockBranches);
      expect(mockPrisma.branch.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { order: "asc" },
      });
    });

    it("should use session organizationId when not provided", async () => {
      const mockBranches = [{ id: 1, name: "Branch 1", organizationId: "org-1", order: 1 }];

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.branch.findMany.mockResolvedValue(mockBranches);

      const result = await getBranchesForOrganizationAction();

      expect(result).toEqual(mockBranches);
      expect(mockPrisma.branch.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { order: "asc" },
      });
    });

    it("should return empty array when no organization access", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getBranchesForOrganizationAction();

      expect(result).toEqual([]);
    });

    it("should handle database errors", async () => {
      mockPrisma.branch.findMany.mockRejectedValue(new Error("Database error"));

      const result = await getBranchesForOrganizationAction("org-1");

      expect(result).toEqual([]);
    });
  });

  describe("getBranchesData", () => {
    it("should return formatted branch data", async () => {
      const mockBranches = [
        { id: 1, name: "Branch 1", organizationId: "org-1", order: 1 },
        { id: 2, name: "Branch 2", organizationId: "org-1", order: 2 },
      ];

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.branch.findMany.mockResolvedValue(mockBranches);

      const result = await getBranchesData();

      expect(result).toEqual(mockBranches);
      expect(mockPrisma.branch.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        select: {
          id: true,
          name: true,
          organizationId: true,
          order: true,
        },
        orderBy: { order: "asc" },
      });
    });

    it("should return empty array when no organization access", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getBranchesData();

      expect(result).toEqual([]);
    });
  });

  describe("getUsersForOrganizationAction", () => {
    it("should return users for provided organizationId", async () => {
      const mockUsers = [
        { id: "user-1", name: "User 1", email: "user1@test.com", role: "admin" },
        { id: "user-2", name: "User 2", email: "user2@test.com", role: "user" },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await getUsersForOrganizationAction("org-1");

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
        },
        orderBy: { name: "asc" },
      });
    });

    it("should use session organizationId when not provided", async () => {
      const mockUsers = [{ id: "user-1", name: "User 1", email: "user1@test.com", role: "admin" }];

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await getUsersForOrganizationAction();

      expect(result).toEqual(mockUsers);
    });

    it("should return empty array when no organization access", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getUsersForOrganizationAction();

      expect(result).toEqual([]);
    });

    it("should handle database errors", async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error("Database error"));

      const result = await getUsersForOrganizationAction("org-1");

      expect(result).toEqual([]);
    });
  });

  describe("getOrganizationUsers", () => {
    it("should return users with success result", async () => {
      const mockUsers = [
        { id: "user-1", name: "User 1", email: "user1@test.com", role: "admin" },
        { id: "user-2", name: "User 2", email: "user2@test.com", role: "user" },
      ];

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await getOrganizationUsers();

      expect(result).toEqual({
        success: true,
        data: mockUsers,
      });
    });

    it("should use provided organizationId", async () => {
      const mockUsers = [{ id: "user-1", name: "User 1", email: "user1@test.com", role: "admin" }];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await getOrganizationUsers({ organizationId: "org-1" });

      expect(result).toEqual({
        success: true,
        data: mockUsers,
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });
    });

    it("should return error when organization access fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getOrganizationUsers();

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });

    it("should handle database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.user.findMany.mockRejectedValue(new Error("Database error"));

      const result = await getOrganizationUsers();

      expect(result).toEqual({
        success: false,
        error: "Error al obtener los usuarios de la organización: Database error",
      });
    });
  });

  describe("getOrganizationSummary", () => {
    it("should return complete organization summary", async () => {
      const mockOrganization = {
        id: "org-1",
        name: "Test Organization",
        email: "test@org.com",
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.branch.count.mockResolvedValue(3);
      mockPrisma.user.count.mockResolvedValue(5);

      const result = await getOrganizationSummary();

      expect(result).toEqual({
        success: true,
        data: {
          organization: mockOrganization,
          branchCount: 3,
          userCount: 5,
        },
      });
    });

    it("should return error when organization access fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getOrganizationSummary();

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });

    it("should return error when organization not found", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.branch.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await getOrganizationSummary();

      expect(result).toEqual({
        success: false,
        error: "Organización no encontrada",
      });
    });

    it("should handle database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organization.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await getOrganizationSummary();

      expect(result).toEqual({
        success: false,
        error: "Database error",
      });
    });

    it("should handle partial database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      const mockOrganization = {
        id: "org-1",
        name: "Test Organization",
        email: "test@org.com",
      };

      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.branch.count.mockRejectedValue(new Error("Branch count error"));
      mockPrisma.user.count.mockResolvedValue(5);

      const result = await getOrganizationSummary();

      expect(result).toEqual({
        success: false,
        error: "Branch count error",
      });
    });
  });
});

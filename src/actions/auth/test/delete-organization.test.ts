import { deleteOrganization } from "@/actions/auth/delete-organization";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    user: {
      updateMany: vi.fn(),
    },
    organization: {
      delete: vi.fn(),
    },
  },
}));

describe("deleteOrganization", () => {
  const mockOrganizationId = "org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update users and delete organization in a transaction", async () => {
    // Arrange
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}]);

    // Act
    await deleteOrganization(mockOrganizationId);

    // Assert
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));

    // Verify the array has 2 operations
    const calledWith = vi.mocked(prisma.$transaction).mock.calls[0][0];
    expect(calledWith).toHaveLength(2);
  });

  it("should handle transaction errors", async () => {
    // Arrange
    const mockError = new Error("Transaction failed");
    vi.mocked(prisma.$transaction).mockRejectedValue(mockError);

    // Act & Assert
    await expect(deleteOrganization(mockOrganizationId)).rejects.toThrow("Transaction failed");
  });
});

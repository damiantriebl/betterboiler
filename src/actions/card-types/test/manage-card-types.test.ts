import { createCardType } from "@/actions/card-types/manage-card-types";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma and next/cache
vi.mock("@/lib/prisma", () => ({
  default: {
    cardType: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("createCardType", () => {
  let mockFormData: FormData;
  const initialFormState = {
    success: false,
    message: null,
    fieldErrors: null,
    data: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData = new FormData();
  });

  it("should create a new card type successfully", async () => {
    // Arrange
    const mockCardType = {
      id: 1,
      name: "Visa",
      type: "credit",
      logoUrl: "https://example.com/visa.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFormData.append("name", "Visa");
    mockFormData.append("type", "credit");
    mockFormData.append("logoUrl", "https://example.com/visa.png");

    vi.mocked(prisma.cardType.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.cardType.create).mockResolvedValue(mockCardType);

    // Act
    const result = await createCardType(initialFormState, mockFormData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe("Tipo de tarjeta 'Visa' creado correctamente.");
    expect(result.data).toEqual(mockCardType);
    expect(result.fieldErrors).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/configuration");
  });

  it("should return error when card type already exists", async () => {
    // Arrange
    const existingCardType = {
      id: 1,
      name: "Visa",
      type: "credit",
      logoUrl: "https://example.com/visa.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFormData.append("name", "Visa");
    mockFormData.append("type", "credit");
    mockFormData.append("logoUrl", "https://example.com/visa.png");

    vi.mocked(prisma.cardType.findFirst).mockResolvedValue(existingCardType);

    // Act
    const result = await createCardType(initialFormState, mockFormData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe("Ya existe un tipo de tarjeta llamado 'Visa'.");
    expect(result.data).toBeNull();
    expect(result.fieldErrors).toBeNull();
  });

  it("should validate required fields", async () => {
    // Arrange
    mockFormData.append("name", "Vi"); // Too short
    mockFormData.append("type", "invalid"); // Invalid type
    mockFormData.append("logoUrl", "invalid-url"); // Invalid URL

    // Act
    const result = await createCardType(initialFormState, mockFormData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe("Error de validación. Verifique los campos.");
    expect(result.fieldErrors).toBeDefined();
    expect(result.data).toBeNull();
  });

  it("should handle database errors", async () => {
    // Arrange
    mockFormData.append("name", "Visa");
    mockFormData.append("type", "credit");
    mockFormData.append("logoUrl", "https://example.com/visa.png");

    vi.mocked(prisma.cardType.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.cardType.create).mockRejectedValue(new Error("Database error"));

    // Act
    const result = await createCardType(initialFormState, mockFormData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe("Database error");
    expect(result.data).toBeNull();
    expect(result.fieldErrors).toBeNull();
  });

  it("should accept empty logoUrl", async () => {
    // Arrange
    const mockCardType = {
      id: 1,
      name: "Visa",
      type: "credit",
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFormData.append("name", "Visa");
    mockFormData.append("type", "credit");
    mockFormData.append("logoUrl", "");

    vi.mocked(prisma.cardType.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.cardType.create).mockResolvedValue(mockCardType);

    // Act
    const result = await createCardType(initialFormState, mockFormData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCardType);
    expect(result.fieldErrors).toBeNull();
  });
});

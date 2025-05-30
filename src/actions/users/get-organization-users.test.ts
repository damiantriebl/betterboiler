import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationUsers } from "./get-organization-users";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe("getOrganizationUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve usuarios cuando todo sale bien", async () => {
    const mockUsers = [
      { id: "1", name: "Juan Pérez", email: "juan@test.com" },
      { id: "2", name: "María García", email: "maria@test.com" },
    ];

    mockPrisma.user.findMany.mockResolvedValue(mockUsers);

    const result = await getOrganizationUsers({ organizationId: "org-1" });

    expect(result.success).toBe(true);
    expect(result.users).toEqual(mockUsers);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  });

  it("devuelve error cuando no se proporciona organizationId", async () => {
    const result = await getOrganizationUsers({ organizationId: "" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("ID de organización no proporcionado.");
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("maneja errores de base de datos correctamente", async () => {
    const dbError = new Error("Database connection failed");
    mockPrisma.user.findMany.mockRejectedValue(dbError);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getOrganizationUsers({ organizationId: "org-1" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Error al obtener los usuarios de la organización: Database connection failed",
    );
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching organization users:", dbError);

    consoleSpy.mockRestore();
  });

  it("maneja errores desconocidos correctamente", async () => {
    mockPrisma.user.findMany.mockRejectedValue("String error");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getOrganizationUsers({ organizationId: "org-1" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Error al obtener los usuarios de la organización: Ocurrió un error desconocido",
    );
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching organization users:", "String error");

    consoleSpy.mockRestore();
  });

  it("devuelve array vacío cuando no hay usuarios", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const result = await getOrganizationUsers({ organizationId: "org-1" });

    expect(result.success).toBe(true);
    expect(result.users).toEqual([]);
  });
});

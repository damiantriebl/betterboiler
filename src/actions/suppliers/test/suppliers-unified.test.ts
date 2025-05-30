import type { SupplierFormData } from "@/zod/SuppliersZod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DeleteSupplierResult,
  type SupplierListResult,
  type SupplierOperationResult,
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  getSuppliersByStatus,
  getSuppliersForSelect,
  updateSupplier,
} from "../suppliers-unified";

// Mock de dependencias
vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    supplier: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/zod/SuppliersZod", () => ({
  supplierSchema: {
    safeParse: vi.fn(),
  },
}));

describe("suppliers-unified", () => {
  const mockOrganizationId = "org-123";
  const mockSupplierData: SupplierFormData = {
    legalName: "Proveedor Test S.A.",
    commercialName: "Proveedor Test",
    taxIdentification: "20-12345678-9",
    vatCondition: "Responsable Inscripto",
    voucherType: "Factura A",
    grossIncome: "123456",
    localTaxRegistration: "ABC123",
    contactName: "Juan Pérez",
    contactPosition: "Gerente",
    landlineNumber: "011-1234-5678",
    mobileNumber: "011-9876-5432",
    email: "contacto@proveedor.com",
    website: "https://www.proveedor.com",
    legalAddress: "Av. Corrientes 1234, CABA",
    commercialAddress: "Av. Santa Fe 5678, CABA",
    deliveryAddress: "Av. Rivadavia 9012, CABA",
    bank: "Banco Nación",
    accountTypeNumber: "1234567890",
    cbu: "0110123456789012345678",
    bankAlias: "proveedor.test",
    swiftBic: "NACNARBAXXX",
    paymentCurrency: "ARS",
    paymentMethods: ["Transferencia", "Cheque"],
    paymentTermDays: 30,
    creditLimit: 100000,
    returnPolicy: "Devolución en 30 días",
    discountsConditions: "5% por pago contado",
    shippingMethods: "Transporte propio",
    shippingCosts: "Sin costo",
    deliveryTimes: "24-48 horas",
    transportConditions: "Entrega en planta",
    itemsCategories: "Repuestos",
    certifications: "ISO 9001",
    commercialReferences: "Cliente desde 2020",
    status: "activo",
    notesObservations: "Proveedor confiable",
  };

  const mockSupplier = {
    id: 1,
    ...mockSupplierData,
    organizationId: mockOrganizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSupplier", () => {
    it("debería crear un proveedor exitosamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockSupplierData,
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(null);
      (prisma.default.supplier.create as any).mockResolvedValue(mockSupplier);

      // Act
      const result = await createSupplier(mockSupplierData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.supplier).toEqual(mockSupplier);
      expect(prisma.default.supplier.create).toHaveBeenCalledWith({
        data: {
          ...mockSupplierData,
          organizationId: mockOrganizationId,
          paymentTermDays: 30,
          creditLimit: 100000,
          paymentMethods: ["Transferencia", "Cheque"],
        },
      });
    });

    it("debería fallar cuando no hay autenticación", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Act
      const result = await createSupplier(mockSupplierData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado o sin organización.");
    });

    it("debería fallar cuando hay errores de validación", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          errors: [
            { path: ["legalName"], message: "La razón social es requerida" },
            { path: ["taxIdentification"], message: "El CUIT es requerido" },
          ],
        },
      });

      // Act
      const result = await createSupplier(mockSupplierData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Datos inválidos");
      expect(result.error).toContain("legalName");
      expect(result.error).toContain("taxIdentification");
    });

    it("debería fallar cuando ya existe un proveedor con el mismo CUIT", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockSupplierData,
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(mockSupplier);

      // Act
      const result = await createSupplier(mockSupplierData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Ya existe un proveedor con CUIT");
      expect(result.error).toContain(mockSupplierData.taxIdentification);
    });

    it("debería manejar errores de Prisma P2002", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");
      const prisma = await import("@/lib/prisma");
      const { Prisma } = await import("@prisma/client");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockSupplierData,
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      (prisma.default.supplier.create as any).mockRejectedValue(prismaError);

      // Act
      const result = await createSupplier(mockSupplierData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Ya existe un proveedor con datos únicos conflictivos");
    });
  });

  describe("getSuppliers", () => {
    it("debería obtener todos los proveedores exitosamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      const mockSuppliers = [mockSupplier, { ...mockSupplier, id: 2 }];

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findMany as any).mockResolvedValue(mockSuppliers);

      // Act
      const result = await getSuppliers();

      // Assert
      expect(result.success).toBe(true);
      expect(result.suppliers).toEqual(mockSuppliers);
      expect(prisma.default.supplier.findMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        orderBy: { legalName: "asc" },
      });
    });

    it("debería fallar cuando no hay autenticación", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Act
      const result = await getSuppliers();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.suppliers).toEqual([]);
    });

    it("debería manejar errores de base de datos", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findMany as any).mockRejectedValue(new Error("Database error"));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const result = await getSuppliers();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error al obtener proveedores.");
      expect(result.suppliers).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Error obteniendo proveedores:", expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe("getSupplierById", () => {
    it("debería obtener un proveedor por ID exitosamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(mockSupplier);

      // Act
      const result = await getSupplierById(1);

      // Assert
      expect(result).toEqual(mockSupplier);
      expect(prisma.default.supplier.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
          organizationId: mockOrganizationId,
        },
      });
    });

    it("debería retornar null cuando no hay autenticación", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const result = await getSupplierById(1);

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "getSupplierById: Usuario no autenticado o sin organización.",
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it("debería retornar null cuando el proveedor no existe", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(null);

      // Act
      const result = await getSupplierById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateSupplier", () => {
    it("debería actualizar un proveedor exitosamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");
      const prisma = await import("@/lib/prisma");

      const updatedData = { ...mockSupplierData, legalName: "Proveedor Actualizado S.A." };
      const updatedSupplier = { ...mockSupplier, legalName: "Proveedor Actualizado S.A." };

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: true,
        data: updatedData,
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(mockSupplier);
      (prisma.default.supplier.update as any).mockResolvedValue(updatedSupplier);

      // Act
      const result = await updateSupplier(1, updatedData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.supplier).toEqual(updatedSupplier);
    });

    it("debería fallar cuando el proveedor no existe", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockSupplierData,
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue(null);

      // Act
      const result = await updateSupplier(999, mockSupplierData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Proveedor no encontrado o no pertenece a esta organización.");
    });

    it("debería detectar conflictos de CUIT al actualizar", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const { supplierSchema } = await import("@/zod/SuppliersZod");
      const prisma = await import("@/lib/prisma");

      const updatedData = { ...mockSupplierData, taxIdentification: "20-87654321-0" };
      const conflictingSupplier = { ...mockSupplier, id: 2, taxIdentification: "20-87654321-0" };

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (supplierSchema.safeParse as any).mockReturnValue({
        success: true,
        data: updatedData,
      });
      (prisma.default.supplier.findUnique as any)
        .mockResolvedValueOnce(mockSupplier) // First call for existing supplier
        .mockResolvedValueOnce(conflictingSupplier); // Second call for conflict check

      // Act
      const result = await updateSupplier(1, updatedData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Ya existe otro proveedor con CUIT");
      expect(result.error).toContain("20-87654321-0");
    });
  });

  describe("deleteSupplier", () => {
    it("debería eliminar un proveedor exitosamente", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue({
        organizationId: mockOrganizationId,
      });
      (prisma.default.supplier.delete as any).mockResolvedValue(mockSupplier);

      // Act
      const result = await deleteSupplier(1);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.default.supplier.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("debería fallar cuando el proveedor no pertenece a la organización", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue({
        organizationId: "other-org",
      });

      // Act
      const result = await deleteSupplier(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Proveedor no encontrado o no pertenece a esta organización.");
    });

    it("debería manejar errores P2003 (registros asociados)", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");
      const { Prisma } = await import("@prisma/client");

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findUnique as any).mockResolvedValue({
        organizationId: mockOrganizationId,
      });

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "5.0.0",
        },
      );
      (prisma.default.supplier.delete as any).mockRejectedValue(prismaError);

      // Act
      const result = await deleteSupplier(1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "No se puede eliminar el proveedor porque tiene registros asociados",
      );
    });
  });

  describe("getSuppliersForSelect", () => {
    it("debería obtener proveedores formateados para select", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      const mockSuppliers = [
        { ...mockSupplier, commercialName: "Proveedor Test" },
        { ...mockSupplier, id: 2, commercialName: null, legalName: "Proveedor Legal" },
      ];

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findMany as any).mockResolvedValue(mockSuppliers);

      // Act
      const result = await getSuppliersForSelect();

      // Assert
      expect(result).toEqual([
        { id: 1, name: "Proveedor Test" },
        { id: 2, name: "Proveedor Legal" },
      ]);
    });

    it("debería retornar array vacío cuando falla getSuppliers", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Act
      const result = await getSuppliersForSelect();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getSuppliersByStatus", () => {
    it("debería obtener proveedores por estado", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const prisma = await import("@/lib/prisma");

      const activeSuppliers = [mockSupplier];

      (auth.api.getSession as any).mockResolvedValue({
        user: { organizationId: mockOrganizationId },
      });
      (prisma.default.supplier.findMany as any).mockResolvedValue(activeSuppliers);

      // Act
      const result = await getSuppliersByStatus("activo");

      // Assert
      expect(result.success).toBe(true);
      expect(result.suppliers).toEqual(activeSuppliers);
      expect(prisma.default.supplier.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          status: "activo",
        },
        orderBy: { legalName: "asc" },
      });
    });

    it("debería fallar cuando no hay autenticación", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockResolvedValue(null);

      // Act
      const result = await getSuppliersByStatus("activo");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado.");
      expect(result.suppliers).toEqual([]);
    });
  });

  describe("Manejo de errores de autenticación", () => {
    it("debería manejar errores en validateOrganizationAccess", async () => {
      // Arrange
      const { auth } = await import("@/auth");

      (auth.api.getSession as any).mockRejectedValue(new Error("Auth error"));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const result = await createSupplier(mockSupplierData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuario no autenticado o sin organización.");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error validating organization access:",
        expect.any(Error),
      );

      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});

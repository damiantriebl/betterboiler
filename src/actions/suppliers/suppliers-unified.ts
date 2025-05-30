"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type SupplierFormData, supplierSchema } from "@/zod/SuppliersZod";
import { Prisma, type Supplier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Types
export interface SupplierOperationResult {
  success: boolean;
  error?: string;
  supplier?: Supplier;
}

export interface SupplierListResult {
  success: boolean;
  error?: string;
  suppliers: Supplier[];
}

export interface DeleteSupplierResult {
  success: boolean;
  error?: string;
}

// Authentication helper
async function validateOrganizationAccess(): Promise<{ organizationId: string } | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.organizationId ? { organizationId: session.user.organizationId } : null;
  } catch (error) {
    console.error("Error validating organization access:", error);
    return null;
  }
}

// Validation helper
function validateSupplierData(
  formData: SupplierFormData,
): { success: true; data: SupplierFormData } | { success: false; error: string } {
  const validation = supplierSchema.safeParse(formData);
  if (!validation.success) {
    const errors = validation.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }
  return { success: true, data: validation.data };
}

// Revalidation helper
function revalidateSupplierPaths(supplierId?: number): void {
  revalidatePath("/(app)/suppliers");
  if (supplierId) {
    revalidatePath(`/(app)/suppliers/${supplierId}`);
  }
}

// Error handling helper
function handlePrismaError(error: unknown, operation: string): string {
  console.error(`Error in ${operation}:`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "Ya existe un proveedor con datos únicos conflictivos.";
      case "P2003":
        return "No se puede eliminar el proveedor porque tiene registros asociados.";
      case "P2025":
        return "Proveedor no encontrado.";
      default:
        return `Error de base de datos: ${error.message}`;
    }
  }

  return `Error interno en ${operation}.`;
}

// Core operations
export async function createSupplier(formData: SupplierFormData): Promise<SupplierOperationResult> {
  const orgAccess = await validateOrganizationAccess();
  if (!orgAccess) {
    return { success: false, error: "Usuario no autenticado o sin organización." };
  }

  const validation = validateSupplierData(formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const dataToSave = validation.data;

  try {
    // Check for existing supplier with same tax identification
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        organizationId_taxIdentification: {
          organizationId: orgAccess.organizationId,
          taxIdentification: dataToSave.taxIdentification,
        },
      },
    });

    if (existingSupplier) {
      return {
        success: false,
        error: `Ya existe un proveedor con CUIT ${dataToSave.taxIdentification} en esta organización.`,
      };
    }

    // Create supplier
    const newSupplier = await prisma.supplier.create({
      data: {
        ...dataToSave,
        organizationId: orgAccess.organizationId,
        paymentTermDays: dataToSave.paymentTermDays ?? null,
        creditLimit: dataToSave.creditLimit ?? null,
        paymentMethods: dataToSave.paymentMethods ?? [],
      },
    });

    revalidateSupplierPaths();
    return { success: true, supplier: newSupplier };
  } catch (error) {
    return { success: false, error: handlePrismaError(error, "createSupplier") };
  }
}

export async function getSuppliers(): Promise<SupplierListResult> {
  const orgAccess = await validateOrganizationAccess();
  if (!orgAccess) {
    console.warn("getSuppliers: Usuario no autenticado o sin organización.");
    return { success: false, error: "Usuario no autenticado.", suppliers: [] };
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { organizationId: orgAccess.organizationId },
      orderBy: { legalName: "asc" },
    });

    return { success: true, suppliers };
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    return { success: false, error: "Error al obtener proveedores.", suppliers: [] };
  }
}

export async function getSupplierById(supplierId: number): Promise<Supplier | null> {
  const orgAccess = await validateOrganizationAccess();
  if (!orgAccess) {
    console.error("getSupplierById: Usuario no autenticado o sin organización.");
    return null;
  }

  try {
    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
        organizationId: orgAccess.organizationId,
      },
    });
    return supplier;
  } catch (error) {
    console.error(`Error obteniendo proveedor con ID ${supplierId}:`, error);
    return null;
  }
}

export async function updateSupplier(
  supplierId: number,
  formData: SupplierFormData,
): Promise<SupplierOperationResult> {
  const orgAccess = await validateOrganizationAccess();
  if (!orgAccess) {
    return { success: false, error: "Usuario no autenticado o sin organización." };
  }

  const validation = validateSupplierData(formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const dataToUpdate = validation.data;

  try {
    // Verify supplier exists and belongs to organization
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
        organizationId: orgAccess.organizationId,
      },
    });

    if (!existingSupplier) {
      return {
        success: false,
        error: "Proveedor no encontrado o no pertenece a esta organización.",
      };
    }

    // Check for tax identification conflicts if changed
    if (dataToUpdate.taxIdentification !== existingSupplier.taxIdentification) {
      const conflictingSupplier = await prisma.supplier.findUnique({
        where: {
          organizationId_taxIdentification: {
            organizationId: orgAccess.organizationId,
            taxIdentification: dataToUpdate.taxIdentification,
          },
        },
      });

      if (conflictingSupplier) {
        return {
          success: false,
          error: `Ya existe otro proveedor con CUIT ${dataToUpdate.taxIdentification} en esta organización.`,
        };
      }
    }

    // Update supplier
    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...dataToUpdate,
        paymentTermDays: dataToUpdate.paymentTermDays ?? null,
        creditLimit: dataToUpdate.creditLimit ?? null,
        paymentMethods: dataToUpdate.paymentMethods ?? [],
      },
    });

    revalidateSupplierPaths(supplierId);
    return { success: true, supplier: updatedSupplier };
  } catch (error) {
    return { success: false, error: handlePrismaError(error, "updateSupplier") };
  }
}

export async function deleteSupplier(supplierId: number): Promise<DeleteSupplierResult> {
  const orgAccess = await validateOrganizationAccess();
  if (!orgAccess) {
    return { success: false, error: "Usuario no autenticado o sin organización." };
  }

  try {
    // Verify supplier belongs to organization before deletion
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { organizationId: true },
    });

    if (!supplier || supplier.organizationId !== orgAccess.organizationId) {
      return {
        success: false,
        error: "Proveedor no encontrado o no pertenece a esta organización.",
      };
    }

    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    revalidateSupplierPaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error, "deleteSupplier") };
  }
}

// Utility functions
export async function getSuppliersForSelect(): Promise<Array<{ id: number; name: string }>> {
  const result = await getSuppliers();
  if (!result.success) {
    return [];
  }

  return result.suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.commercialName || supplier.legalName,
  }));
}

export async function getSuppliersByStatus(status: string): Promise<SupplierListResult> {
  const orgAccess = await validateOrganizationAccess();
  if (!orgAccess) {
    return { success: false, error: "Usuario no autenticado.", suppliers: [] };
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        organizationId: orgAccess.organizationId,
        status: status,
      },
      orderBy: { legalName: "asc" },
    });

    return { success: true, suppliers };
  } catch (error) {
    console.error("Error obteniendo proveedores por estado:", error);
    return { success: false, error: "Error al obtener proveedores.", suppliers: [] };
  }
}

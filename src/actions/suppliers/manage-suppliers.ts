"use server";

import type { MotorcycleWithDetails } from "@/actions/sales/get-motorcycles";
import { auth } from "@/auth"; // Ajusta la ruta si es diferente
import prisma from "@/lib/prisma";
import { type SupplierFormData, supplierSchema } from "@/zod/SuppliersZod";
import { Prisma, type Supplier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers"; // Importar headers

// Tipo de resultado estándar para acciones
export type SupplierActionResult = {
  success: boolean;
  error?: string;
  supplier?: Supplier;
};

// --- Acción para crear un nuevo proveedor ---
export async function createSupplier(formData: SupplierFormData): Promise<SupplierActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.organizationId) {
    return { success: false, error: "Usuario no autenticado o sin organización." };
  }
  const organizationId = session.user.organizationId;

  // Validar los datos con Zod
  const validation = supplierSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: `Datos inválidos: ${validation.error.message}` };
  }

  const dataToSave = validation.data;

  try {
    // Verificar si ya existe un proveedor con el mismo CUIT en la organización
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        organizationId_taxIdentification: {
          organizationId: organizationId,
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

    // Crear el proveedor
    const newSupplier = await prisma.supplier.create({
      data: {
        ...dataToSave,
        organizationId: organizationId,
        paymentTermDays: dataToSave.paymentTermDays ?? null,
        creditLimit: dataToSave.creditLimit ?? null,
        paymentMethods: dataToSave.paymentMethods ?? [],
      },
    });

    revalidatePath("/(app)/suppliers");

    return { success: true, supplier: newSupplier };
  } catch (error) {
    console.error("Error creando proveedor:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Error de base de datos: Ya existe un proveedor con datos únicos conflictivos.",
        };
      }
    }
    return { success: false, error: "No se pudo crear el proveedor debido a un error interno." };
  }
}

// --- Acción para obtener todos los proveedores de la organización ---
export async function getSuppliers(): Promise<Supplier[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.organizationId) {
    console.warn("getSuppliers: Usuario no autenticado o sin organización. Retornando vacío.");
    return [];
  }
  const organizationId = session.user.organizationId;

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { organizationId: organizationId },
      orderBy: { legalName: "asc" },
    });
    return suppliers;
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    return [];
  }
}

// --- Acción para eliminar un proveedor ---
export async function deleteSupplier(
  supplierId: number,
): Promise<Omit<SupplierActionResult, "supplier">> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.organizationId) {
    return { success: false, error: "Usuario no autenticado o sin organización." };
  }
  const organizationId = session.user.organizationId;

  try {
    // Verificar si el proveedor pertenece a la organización actual antes de borrar
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { organizationId: true },
    });

    if (!supplier || supplier.organizationId !== organizationId) {
      return {
        success: false,
        error: "Proveedor no encontrado o no pertenece a esta organización.",
      };
    }

    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    revalidatePath("/(app)/suppliers");

    return { success: true };
  } catch (error) {
    console.error("Error eliminando proveedor:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          success: false,
          error: "No se puede eliminar el proveedor porque tiene registros asociados (ej: motos).",
        };
      }
    }
    return { success: false, error: "No se pudo eliminar el proveedor." };
  }
}

// +++ NUEVA ACCIÓN: Obtener un proveedor por ID +++
export async function getSupplierById(supplierId: number): Promise<Supplier | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.organizationId) {
    console.error("getSupplierById: Usuario no autenticado o sin organización.");
    return null;
  }
  const organizationId = session.user.organizationId;

  try {
    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
        // Asegurarse que el proveedor pertenece a la organización del usuario
        organizationId: organizationId,
      },
    });
    return supplier;
  } catch (error) {
    console.error(`Error obteniendo proveedor con ID ${supplierId}:`, error);
    return null;
  }
}

// +++ NUEVA ACCIÓN: Actualizar un proveedor existente +++
export async function updateSupplier(
  supplierId: number,
  formData: SupplierFormData,
): Promise<SupplierActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.organizationId) {
    return { success: false, error: "Usuario no autenticado o sin organización." };
  }
  const organizationId = session.user.organizationId;

  // Validar los datos con Zod
  const validation = supplierSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: `Datos inválidos: ${validation.error.message}` };
  }

  const dataToUpdate = validation.data;

  try {
    // Verificar que el proveedor exista y pertenezca a la organización
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
        organizationId: organizationId,
      },
    });

    if (!existingSupplier) {
      return {
        success: false,
        error: "Proveedor no encontrado o no pertenece a esta organización.",
      };
    }

    // Verificar si el CUIT actualizado ya existe en otro proveedor de la misma organización
    if (dataToUpdate.taxIdentification !== existingSupplier.taxIdentification) {
      const conflictingSupplier = await prisma.supplier.findUnique({
        where: {
          organizationId_taxIdentification: {
            organizationId: organizationId,
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

    // Actualizar el proveedor en la base de datos
    const updatedSupplier = await prisma.supplier.update({
      where: {
        id: supplierId,
        // organizationId: organizationId, // No es necesario repetirlo aquí si ya está en el where id
      },
      data: {
        ...dataToUpdate,
        // Asegurarse de que los campos numéricos nullable se pasen correctamente
        paymentTermDays: dataToUpdate.paymentTermDays ?? null,
        creditLimit: dataToUpdate.creditLimit ?? null,
        paymentMethods: dataToUpdate.paymentMethods ?? [],
      },
    });

    // Revalidar la ruta de detalle y la de la tabla
    revalidatePath(`/(app)/suppliers/${supplierId}`);
    revalidatePath("/(app)/suppliers");

    return { success: true, supplier: updatedSupplier };
  } catch (error) {
    console.error(`Error actualizando proveedor con ID ${supplierId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Error de base de datos: Datos únicos conflictivos al actualizar.",
        };
      }
      if (error.code === "P2025") {
        // Record to update not found
        return {
          success: false,
          error: "Error de base de datos: Proveedor no encontrado para actualizar.",
        };
      }
    }
    return {
      success: false,
      error: "No se pudo actualizar el proveedor debido a un error interno.",
    };
  }
}

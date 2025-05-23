"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { motorcycleBatchSchema } from "@/zod/MotorcycleBatchSchema"; // Corregir ruta y nombre schema
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session"; // Helper para obtener orgId

export async function updateMotorcycle(
  id: number, // ID de la moto a actualizar
  currentState: unknown, // Requerido por useActionState
  formData: FormData,
) {
  const validation = motorcycleBatchSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validation.success) {
    console.error("Error de validación:", validation.error.flatten());
    return {
      success: false,
      message: "Error de validación. Revise los campos.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) {
    return { success: false, message: "Error de autenticación." };
  }

  const organizationId = org.organizationId;

  // Extraer los datos validados
  // IMPORTANTE: Ajustar esto según la estructura exacta de MotorcycleBatchSchema
  // Especialmente la parte de 'units'. Para edición, solo nos interesa la primera unidad.
  const validatedData = validation.data;
  const unitData = validatedData.units?.[0];

  if (!unitData) {
    return { success: false, message: "Faltan datos de identificación de la unidad." };
  }

  try {
    await prisma.motorcycle.update({
      where: {
        id: id,
        organizationId: organizationId,
      },
      data: {
        // Campos principales (del nivel raíz del schema)
        brandId: validatedData.brandId,
        modelId: validatedData.modelId,
        year: validatedData.year,
        displacement: validatedData.displacement,
        currency: validatedData.currency,
        costPrice: validatedData.costPrice,
        retailPrice: validatedData.retailPrice,
        wholesalePrice: validatedData.wholesalePrice,
        imageUrl: validatedData.imageUrl,
        supplierId: validatedData.supplierId,
        // Campos de la unidad (asumiendo edición de una sola)
        chassisNumber: unitData.chassisNumber,
        engineNumber: unitData.engineNumber,
        colorId: unitData.colorId,
        mileage: unitData.mileage,
        branchId: unitData.branchId,
        state: unitData.state,
        licensePlate: unitData.licensePlate,
        observations: unitData.observations,
        // No actualizamos organizationId aquí
      },
    });

    // Revalidar rutas para actualizar caché
    revalidatePath("/(app)/stock", "layout"); // Revalida stock y layouts dependientes
    revalidatePath("/(app)/sales", "layout"); // Revalida ventas
    revalidatePath(`/stock/edit/${id}`); // Revalida la propia página de edición

    return { success: true, message: "Motocicleta actualizada correctamente." };
  } catch (error) {
    console.error("Error al actualizar la motocicleta:", error);
    // Manejar errores específicos de Prisma si es necesario (ej: P2025 Not Found)
    return {
      success: false,
      message: "Error interno al actualizar la motocicleta.",
    };
  }
}

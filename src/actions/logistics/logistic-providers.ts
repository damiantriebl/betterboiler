"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type LogisticProviderFormData, logisticProviderSchema } from "@/zod/logistics";
import type { LogisticProvider } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getOrganizationIdFromSession } from "../util";

// Types
export interface LogisticProviderOperationResult {
  success: boolean;
  error?: string;
  provider?: LogisticProvider;
}

export interface LogisticProviderListResult {
  success: boolean;
  error?: string;
  providers: LogisticProvider[];
}

// Validar acceso a organización
async function validateOrganizationAccess() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return null;
  }

  const organizationAccess = await getOrganizationIdFromSession();
  if (!organizationAccess || organizationAccess.error || !organizationAccess.organizationId) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId: organizationAccess.organizationId,
  };
}

// Crear proveedor de logística
export async function createLogisticProvider(
  data: LogisticProviderFormData,
): Promise<LogisticProviderOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Validar datos
    const validatedData = logisticProviderSchema.parse(data);

    // Verificar que no exista ya un proveedor con ese nombre
    const existingProvider = await prisma.logisticProvider.findFirst({
      where: {
        organizationId: orgAccess.organizationId,
        name: validatedData.name,
      },
    });

    if (existingProvider) {
      return { success: false, error: "Ya existe un proveedor de logística con ese nombre." };
    }

    // Crear el proveedor
    const provider = await prisma.logisticProvider.create({
      data: {
        ...validatedData,
        organizationId: orgAccess.organizationId,
      },
    });

    revalidatePath("/logistic");
    return { success: true, provider };
  } catch (error) {
    console.error("Error creando proveedor de logística:", error);
    return { success: false, error: "Error al crear el proveedor de logística." };
  }
}

// Actualizar proveedor de logística
export async function updateLogisticProvider(
  providerId: number,
  data: LogisticProviderFormData,
): Promise<LogisticProviderOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Validar datos
    const validatedData = logisticProviderSchema.parse(data);

    // Verificar que el proveedor existe y pertenece a la organización
    const existingProvider = await prisma.logisticProvider.findFirst({
      where: {
        id: providerId,
        organizationId: orgAccess.organizationId,
      },
    });

    if (!existingProvider) {
      return { success: false, error: "Proveedor no encontrado." };
    }

    // Verificar que no exista otro proveedor con ese nombre
    if (validatedData.name !== existingProvider.name) {
      const duplicateProvider = await prisma.logisticProvider.findFirst({
        where: {
          organizationId: orgAccess.organizationId,
          name: validatedData.name,
          id: { not: providerId },
        },
      });

      if (duplicateProvider) {
        return { success: false, error: "Ya existe un proveedor de logística con ese nombre." };
      }
    }

    // Actualizar el proveedor
    const provider = await prisma.logisticProvider.update({
      where: { id: providerId },
      data: validatedData,
    });

    revalidatePath("/logistic");
    return { success: true, provider };
  } catch (error) {
    console.error("Error actualizando proveedor de logística:", error);
    return { success: false, error: "Error al actualizar el proveedor de logística." };
  }
}

// Obtener todos los proveedores de logística
export async function getLogisticProviders(): Promise<LogisticProviderListResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado.", providers: [] };
    }

    const providers = await prisma.logisticProvider.findMany({
      where: { organizationId: orgAccess.organizationId },
      orderBy: { name: "asc" },
    });

    return { success: true, providers };
  } catch (error) {
    console.error("Error obteniendo proveedores de logística:", error);
    return { success: false, error: "Error al obtener proveedores de logística.", providers: [] };
  }
}

// Obtener proveedor por ID
export async function getLogisticProviderById(
  providerId: number,
): Promise<LogisticProviderOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const provider = await prisma.logisticProvider.findFirst({
      where: {
        id: providerId,
        organizationId: orgAccess.organizationId,
      },
    });

    if (!provider) {
      return { success: false, error: "Proveedor no encontrado." };
    }

    return { success: true, provider };
  } catch (error) {
    console.error("Error obteniendo proveedor de logística:", error);
    return { success: false, error: "Error al obtener el proveedor de logística." };
  }
}

// Eliminar proveedor de logística
export async function deleteLogisticProvider(
  providerId: number,
): Promise<LogisticProviderOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Verificar que el proveedor existe y pertenece a la organización
    const existingProvider = await prisma.logisticProvider.findFirst({
      where: {
        id: providerId,
        organizationId: orgAccess.organizationId,
      },
    });

    if (!existingProvider) {
      return { success: false, error: "Proveedor no encontrado." };
    }

    // Verificar que no tenga transferencias activas
    const activeTransfers = await prisma.motorcycleTransfer.findMany({
      where: {
        logisticProviderId: providerId,
        status: { not: "DELIVERED" },
      },
    });

    if (activeTransfers.length > 0) {
      return {
        success: false,
        error: "No se puede eliminar el proveedor porque tiene transferencias activas.",
      };
    }

    // Eliminar el proveedor
    await prisma.logisticProvider.delete({
      where: { id: providerId },
    });

    revalidatePath("/logistic");
    return { success: true };
  } catch (error) {
    console.error("Error eliminando proveedor de logística:", error);
    return { success: false, error: "Error al eliminar el proveedor de logística." };
  }
}

// Obtener proveedores activos para select
export async function getActiveLogisticProvidersForSelect(): Promise<
  Array<{ id: number; name: string }>
> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return [];
    }

    const providers = await prisma.logisticProvider.findMany({
      where: {
        organizationId: orgAccess.organizationId,
        status: "activo",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return providers;
  } catch (error) {
    console.error("Error obteniendo proveedores activos:", error);
    return [];
  }
}

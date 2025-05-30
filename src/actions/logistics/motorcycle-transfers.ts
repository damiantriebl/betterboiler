"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { MotorcycleTransferWithRelations } from "@/types/logistics";
import {
  type MotorcycleTransferFormData,
  type UpdateTransferStatusFormData,
  motorcycleTransferSchema,
  updateTransferStatusSchema,
} from "@/zod/logistics";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendEmail } from "../auth/email";
import { getOrganizationIdFromSession } from "../util";

// Types
export interface TransferOperationResult {
  success: boolean;
  error?: string;
  transfer?: MotorcycleTransferWithRelations;
}

export interface TransferListResult {
  success: boolean;
  error?: string;
  transfers: MotorcycleTransferWithRelations[];
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

// Crear solicitud de transferencia
export async function createMotorcycleTransfer(
  data: MotorcycleTransferFormData,
): Promise<TransferOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Validar datos
    const validatedData = motorcycleTransferSchema.parse(data);

    // Verificar que la motocicleta existe y está disponible
    const motorcycle = await prisma.motorcycle.findFirst({
      where: {
        id: validatedData.motorcycleId,
        organizationId: orgAccess.organizationId,
        state: "STOCK", // Solo motos en stock pueden ser transferidas
      },
    });

    if (!motorcycle) {
      return {
        success: false,
        error: "Motocicleta no encontrada o no disponible para transferencia.",
      };
    }

    // Verificar que la motocicleta está en la sucursal de origen
    if (motorcycle.branchId !== validatedData.fromBranchId) {
      return {
        success: false,
        error: "La motocicleta no se encuentra en la sucursal de origen especificada.",
      };
    }

    // Verificar que no existe ya una transferencia activa para esta moto
    const activeTransfer = await prisma.motorcycleTransfer.findFirst({
      where: {
        motorcycleId: validatedData.motorcycleId,
        status: { in: ["REQUESTED", "CONFIRMED", "IN_TRANSIT"] },
      },
    });

    if (activeTransfer) {
      return { success: false, error: "La motocicleta ya tiene una transferencia activa." };
    }

    // Crear la transferencia y cambiar estado de la moto en una transacción
    const [transfer] = await prisma.$transaction([
      prisma.motorcycleTransfer.create({
        data: {
          ...validatedData,
          requestedDate: new Date(),
          requestedBy: orgAccess.userId,
          organizationId: orgAccess.organizationId,
          status: "IN_TRANSIT", // Directamente en tránsito
        },
        include: {
          motorcycle: {
            include: {
              brand: true,
              model: true,
              color: true,
            },
          },
          fromBranch: true,
          toBranch: true,
          logisticProvider: true,
          requester: true,
        },
      }),
      // Cambiar estado de la motocicleta a "en_transito"
      prisma.motorcycle.update({
        where: { id: validatedData.motorcycleId },
        data: { state: "EN_TRANSITO" },
      }),
    ]);

    // Enviar email al administrador
    try {
      const adminUsers = await prisma.user.findMany({
        where: {
          organizationId: orgAccess.organizationId,
          role: { in: ["admin", "root"] },
        },
        select: { email: true, name: true },
      });

      const emailPromises = adminUsers.map((admin) =>
        sendEmail({
          to: admin.email,
          subject: `Nueva transferencia de motocicleta en tránsito - ${motorcycle.chassisNumber}`,
          text: `
Hola ${admin.name},

Se ha iniciado una nueva transferencia de motocicleta:

🏍️ Motocicleta: ${transfer.motorcycle?.brand?.name} ${transfer.motorcycle?.model?.name}
🔢 Chasis: ${motorcycle.chassisNumber}
📍 Origen: ${transfer.fromBranch?.name}
📍 Destino: ${transfer.toBranch?.name}
🚚 Proveedor: ${transfer.logisticProvider?.name || "Sin proveedor asignado"}
📅 Fecha estimada de entrega: ${validatedData.scheduledPickupDate ? new Date(validatedData.scheduledPickupDate).toLocaleDateString() : "No especificada"}

La motocicleta está ahora en tránsito. Cuando llegue al destino, deberás confirmar la recepción en el sistema.

Saludos,
Sistema de Gestión
          `,
        }),
      );

      await Promise.all(emailPromises);
    } catch (emailError) {
      console.error("Error enviando emails de notificación:", emailError);
      // No fallar la transferencia por error de email
    }

    revalidatePath("/logistic");
    return { success: true, transfer };
  } catch (error) {
    console.error("Error creando transferencia:", error);
    return { success: false, error: "Error al crear la transferencia." };
  }
}

// Actualizar estado de transferencia
export async function updateTransferStatus(
  transferId: number,
  data: UpdateTransferStatusFormData,
): Promise<TransferOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Validar datos
    const validatedData = updateTransferStatusSchema.parse(data);

    // Verificar que la transferencia existe
    const existingTransfer = await prisma.motorcycleTransfer.findFirst({
      where: {
        id: transferId,
        organizationId: orgAccess.organizationId,
      },
      include: {
        motorcycle: true,
      },
    });

    if (!existingTransfer) {
      return { success: false, error: "Transferencia no encontrada." };
    }

    // Lógica de estados válidos
    const validTransitions: Record<string, string[]> = {
      REQUESTED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["IN_TRANSIT", "CANCELLED"],
      IN_TRANSIT: ["DELIVERED", "CANCELLED"],
      DELIVERED: [], // Estado final
      CANCELLED: [], // Estado final
    };

    if (!validTransitions[existingTransfer.status].includes(validatedData.status)) {
      return {
        success: false,
        error: `Transición de estado inválida de ${existingTransfer.status} a ${validatedData.status}.`,
      };
    }

    // Si se marca como entregada, actualizar la sucursal de la motocicleta
    let motorcycleUpdate = undefined;
    if (validatedData.status === "DELIVERED") {
      motorcycleUpdate = prisma.motorcycle.update({
        where: { id: existingTransfer.motorcycleId },
        data: { branchId: existingTransfer.toBranchId },
      });
    }

    // Actualizar la transferencia
    const updateData: any = {
      ...validatedData,
      confirmedBy:
        validatedData.status === "CONFIRMED" ? orgAccess.userId : existingTransfer.confirmedBy,
    };

    const [transfer] = await prisma.$transaction([
      prisma.motorcycleTransfer.update({
        where: { id: transferId },
        data: updateData,
        include: {
          motorcycle: {
            include: {
              brand: true,
              model: true,
              color: true,
            },
          },
          fromBranch: true,
          toBranch: true,
          logisticProvider: true,
          requester: true,
          confirmer: true,
        },
      }),
      ...(motorcycleUpdate ? [motorcycleUpdate] : []),
    ]);

    revalidatePath("/logistic");
    return { success: true, transfer };
  } catch (error) {
    console.error("Error actualizando transferencia:", error);
    return { success: false, error: "Error al actualizar la transferencia." };
  }
}

// Obtener todas las transferencias
export async function getMotorcycleTransfers(): Promise<TransferListResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado.", transfers: [] };
    }

    const transfers = await prisma.motorcycleTransfer.findMany({
      where: { organizationId: orgAccess.organizationId },
      include: {
        motorcycle: {
          include: {
            brand: true,
            model: true,
            color: true,
          },
        },
        fromBranch: true,
        toBranch: true,
        logisticProvider: true,
        requester: true,
        confirmer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, transfers };
  } catch (error) {
    console.error("Error obteniendo transferencias:", error);
    return { success: false, error: "Error al obtener transferencias.", transfers: [] };
  }
}

// Obtener transferencias por estado
export async function getTransfersByStatus(status: string[]): Promise<TransferListResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado.", transfers: [] };
    }

    const transfers = await prisma.motorcycleTransfer.findMany({
      where: {
        organizationId: orgAccess.organizationId,
        status: { in: status as any },
      },
      include: {
        motorcycle: {
          include: {
            brand: true,
            model: true,
            color: true,
          },
        },
        fromBranch: true,
        toBranch: true,
        logisticProvider: true,
        requester: true,
        confirmer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, transfers };
  } catch (error) {
    console.error("Error obteniendo transferencias por estado:", error);
    return { success: false, error: "Error al obtener transferencias.", transfers: [] };
  }
}

// Cancelar transferencia
export async function cancelTransfer(transferId: number): Promise<TransferOperationResult> {
  return updateTransferStatus(transferId, { status: "CANCELLED" });
}

// Obtener transferencias en tránsito
export async function getTransfersInTransit(): Promise<TransferListResult> {
  return getTransfersByStatus(["IN_TRANSIT"]);
}

// Confirmar llegada de transferencia
export async function confirmTransferArrival(transferId: number): Promise<TransferOperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Verificar que la transferencia existe y está en tránsito
    const existingTransfer = await prisma.motorcycleTransfer.findFirst({
      where: {
        id: transferId,
        organizationId: orgAccess.organizationId,
        status: "IN_TRANSIT",
      },
      include: {
        motorcycle: true,
      },
    });

    if (!existingTransfer) {
      return { success: false, error: "Transferencia no encontrada o no está en tránsito." };
    }

    // Actualizar transferencia y motocicleta en una transacción
    const [transfer] = await prisma.$transaction([
      prisma.motorcycleTransfer.update({
        where: { id: transferId },
        data: {
          status: "DELIVERED",
          actualDeliveryDate: new Date(),
          confirmedBy: orgAccess.userId,
        },
        include: {
          motorcycle: {
            include: {
              brand: true,
              model: true,
              color: true,
            },
          },
          fromBranch: true,
          toBranch: true,
          logisticProvider: true,
          requester: true,
          confirmer: true,
        },
      }),
      // Cambiar la sucursal de la motocicleta y volver a estado STOCK
      prisma.motorcycle.update({
        where: { id: existingTransfer.motorcycleId },
        data: {
          branchId: existingTransfer.toBranchId,
          state: "STOCK",
        },
      }),
    ]);

    revalidatePath("/logistic");
    return { success: true, transfer };
  } catch (error) {
    console.error("Error confirmando llegada de transferencia:", error);
    return { success: false, error: "Error al confirmar la llegada de la transferencia." };
  }
}

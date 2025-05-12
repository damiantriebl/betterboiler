"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "../getOrganizationIdFromSession";

/**
 * Asocia un tipo de tarjeta a un banco para una organización
 */
export async function associateBankWithCardType(
  formData: FormData | null,
  {
    bankId,
    cardTypeId,
    organizationId,
    isEnabled = true,
    order = 0
  }: {
    bankId: number;
    cardTypeId: number;
    organizationId?: string;
    isEnabled?: boolean;
    order?: number;
  }
) {
  try {
    // Si no se proporciona organizationId, obtenerlo de la sesión
    if (!organizationId) {
      const orgId = await getOrganizationIdFromSession();
      if (!orgId) {
        return {
          success: false,
          error: "No se pudo obtener la organización del usuario"
        };
      }
      organizationId = orgId;
    }

    // Verificar si ya existe esta asociación
    const existingAssociation = await prisma.bankCard.findFirst({
      where: {
        bankId,
        cardTypeId,
        organizationId
      }
    });

    if (existingAssociation) {
      return {
        success: false,
        error: "Esta asociación banco-tarjeta ya existe"
      };
    }

    // Crear la asociación
    await prisma.bankCard.create({
      data: {
        bankId,
        cardTypeId,
        organizationId,
        isEnabled,
        order
      }
    });

    revalidatePath('/configuration');

    return {
      success: true,
      message: "Tarjeta asociada al banco correctamente"
    };
  } catch (error: any) {
    console.error("Error associating bank with card type:", error);
    return {
      success: false,
      error: error.message || "Error al asociar tarjeta con banco"
    };
  }
}

/**
 * Actualiza el estado (habilitado/deshabilitado) de una asociación banco-tarjeta
 */
export async function toggleBankCardStatus(
  formData: FormData | null,
  { 
    bankCardId, 
    isEnabled 
  }: { 
    bankCardId: number; 
    isEnabled: boolean 
  }
) {
  try {
    await prisma.bankCard.update({
      where: { id: bankCardId },
      data: { isEnabled }
    });

    revalidatePath('/configuration');

    return {
      success: true,
      message: `Tarjeta ${isEnabled ? 'habilitada' : 'deshabilitada'} correctamente`
    };
  } catch (error: any) {
    console.error("Error toggling bank card status:", error);
    return {
      success: false,
      error: error.message || "Error al cambiar el estado de la tarjeta"
    };
  }
}

/**
 * Actualiza el orden de las tarjetas para un banco
 */
export async function updateBankCardsOrder(
  formData: FormData | null,
  { 
    bankCardOrders 
  }: { 
    bankCardOrders: { id: number; order: number }[] 
  }
) {
  try {
    // Ejecutar todas las actualizaciones en una transacción
    await prisma.$transaction(
      bankCardOrders.map(item => 
        prisma.bankCard.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    );

    revalidatePath('/configuration');

    return {
      success: true,
      message: "Orden de tarjetas actualizado correctamente"
    };
  } catch (error: any) {
    console.error("Error updating bank cards order:", error);
    return {
      success: false,
      error: error.message || "Error al actualizar el orden de las tarjetas"
    };
  }
}

/**
 * Elimina una asociación banco-tarjeta
 */
export async function dissociateBankCard(
  formData: FormData | null,
  { bankCardId }: { bankCardId: number }
) {
  try {
    // Verificar si hay promociones que usan esta asociación
    const associatedPromotions = await prisma.bankingPromotion.findMany({
      where: { bankCardId }
    });

    if (associatedPromotions.length > 0) {
      return {
        success: false,
        error: "No se puede eliminar esta asociación porque está siendo usada en promociones"
      };
    }

    // Eliminar la asociación
    await prisma.bankCard.delete({
      where: { id: bankCardId }
    });

    revalidatePath('/configuration');

    return {
      success: true,
      message: "Asociación banco-tarjeta eliminada correctamente"
    };
  } catch (error: any) {
    console.error("Error dissociating bank card:", error);
    return {
      success: false,
      error: error.message || "Error al eliminar la asociación banco-tarjeta"
    };
  }
}

/**
 * Asocia múltiples tipos de tarjeta a un banco para una organización
 */
export async function associateMultipleCardTypesToBank(
    formData: FormData | null, // Keep signature consistent if needed, though we won't use it
    {
        bankId,
        cardTypeIds,
        organizationId,
    }: {
        bankId: number;
        cardTypeIds: number[];
        organizationId?: string;
    }
) {
    try {
        if (!organizationId) {
            const orgId = await getOrganizationIdFromSession();
            if (!orgId) {
                return { success: false, error: "No se pudo obtener la organización del usuario" };
            }
            organizationId = orgId;
        }

        if (!cardTypeIds || cardTypeIds.length === 0) {
            return { success: false, error: "No se proporcionaron tipos de tarjeta para asociar." };
        }

        // Obtener asociaciones existentes para este banco y tipos de tarjeta
        const existingAssociations = await prisma.bankCard.findMany({
            where: {
                bankId,
                organizationId,
                cardTypeId: { in: cardTypeIds },
            },
            select: {
                cardTypeId: true, // Solo necesitamos saber qué IDs ya existen
            },
        });
        const existingCardTypeIds = new Set(existingAssociations.map(a => a.cardTypeId));

        // Filtrar IDs que ya están asociados
        const idsToCreate = cardTypeIds.filter(id => !existingCardTypeIds.has(id));

        if (idsToCreate.length === 0) {
            return { success: true, message: "Todos los tipos de tarjeta seleccionados ya estaban asociados." };
        }

        // Crear las nuevas asociaciones
        await prisma.bankCard.createMany({
            data: idsToCreate.map((cardTypeId, index) => ({
                bankId,
                cardTypeId,
                organizationId: organizationId!, // Sabemos que está definido aquí
                isEnabled: true, // Default
                order: index, // Podrías querer una lógica de orden más sofisticada
            })),
            skipDuplicates: true, // Evita errores si algo cambió entre la verificación y la creación
        });

        revalidatePath('/configuration'); // Revalidar UNA SOLA VEZ

        return {
            success: true,
            message: `${idsToCreate.length} tipo(s) de tarjeta asociados correctamente.`,
        };

    } catch (error: any) {
        console.error("Error associating multiple card types:", error);
        return {
            success: false,
            error: error.message || "Error al asociar los tipos de tarjeta.",
        };
    }
} 
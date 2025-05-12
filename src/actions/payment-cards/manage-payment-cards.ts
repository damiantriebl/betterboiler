"use server";

import prisma from "@/lib/prisma";
import { toggleCardSchema } from "@/zod/payment-card-schemas";
import { revalidatePath } from "next/cache";
import { type ActionState } from "@/types/action-states";

// Toggle a payment card's enabled status for an organization
export async function togglePaymentCard(
  organizationId: string,
  formData: FormData
): Promise<ActionState> {
  const rawFormData = {
    cardId: Number(formData.get("cardId")),
    isEnabled: formData.get("isEnabled") === "true",
  };

  const validatedFields = toggleCardSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return { 
      success: false, 
      error: "Error de validación: " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", ") 
    };
  }

  const { cardId, isEnabled } = validatedFields.data;

  try {
    await prisma.organizationPaymentCard.update({
      where: { 
        organizationId_cardId: {
          organizationId,
          cardId
        }
      },
      data: { isEnabled }
    });

    revalidatePath("/configuration");
    return { success: true, message: `Tarjeta ${isEnabled ? "habilitada" : "deshabilitada"} correctamente.` };
  } catch (error: any) {
    console.error("Error updating payment card status:", error);
    return { success: false, error: error.message || "Error al actualizar el estado de la tarjeta." };
  }
}

// Associate a payment card with an organization
export async function associatePaymentCard(
  organizationId: string,
  cardId: number
): Promise<ActionState> {
  try {
    // Check if association already exists
    const existingAssociation = await prisma.organizationPaymentCard.findUnique({
      where: {
        organizationId_cardId: {
          organizationId,
          cardId
        }
      }
    });

    if (existingAssociation) {
      return { success: false, error: "Esta tarjeta ya está asociada a la organización." };
    }

    // Get the highest current order for this organization
    const highestOrder = await prisma.organizationPaymentCard.findFirst({
      where: { organizationId },
      orderBy: { order: "desc" },
      select: { order: true }
    });

    // Create the association
    await prisma.organizationPaymentCard.create({
      data: {
        organizationId,
        cardId,
        isEnabled: true,
        order: (highestOrder?.order || -1) + 1
      }
    });

    revalidatePath("/configuration");
    return { success: true, message: "Tarjeta asociada correctamente." };
  } catch (error: any) {
    console.error("Error associating payment card:", error);
    return { success: false, error: error.message || "Error al asociar la tarjeta." };
  }
}

// Remove a payment card from an organization
export async function removePaymentCard(
  organizationId: string,
  organizationCardId: number
): Promise<ActionState> {
  try {
    await prisma.organizationPaymentCard.delete({
      where: { id: organizationCardId }
    });

    revalidatePath("/configuration");
    return { success: true, message: "Tarjeta desasociada correctamente." };
  } catch (error: any) {
    console.error("Error removing payment card:", error);
    return { success: false, error: error.message || "Error al eliminar la tarjeta." };
  }
}

// Update the order of payment cards for an organization
export async function updatePaymentCardsOrder(
  organizationId: string,
  orderData: { id: number; order: number }[]
): Promise<ActionState> {
  try {
    await prisma.$transaction(
      orderData.map(card => 
        prisma.organizationPaymentCard.update({
          where: { id: card.id },
          data: { order: card.order }
        })
      )
    );

    revalidatePath("/configuration");
    return { success: true, message: "Orden de tarjetas actualizado correctamente." };
  } catch (error: any) {
    console.error("Error updating payment cards order:", error);
    return { success: false, error: error.message || "Error al actualizar el orden de las tarjetas." };
  }
} 
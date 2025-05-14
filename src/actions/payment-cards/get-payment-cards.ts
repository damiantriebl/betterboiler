"use server";

import prisma from "@/lib/prisma";
import type { OrganizationPaymentCardDisplay } from "@/types/payment-cards";

// Get all global payment cards (for admin selection)
export async function getAllPaymentCards() {
  try {
    const paymentCards = await prisma.paymentCard.findMany({
      orderBy: { name: "asc" },
    });

    return paymentCards;
  } catch (error) {
    console.error("Error fetching payment cards:", error);
    return [];
  }
}

// Get payment cards associated with an organization
export async function getOrganizationPaymentCards(
  organizationId: string,
): Promise<OrganizationPaymentCardDisplay[]> {
  try {
    const organizationCards = await prisma.organizationPaymentCard.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
      include: {
        card: true,
      },
    });

    const formattedCards: OrganizationPaymentCardDisplay[] = organizationCards.map((orgCard) => ({
      id: orgCard.id,
      order: orgCard.order,
      isEnabled: orgCard.isEnabled,
      card: {
        id: orgCard.card.id,
        name: orgCard.card.name,
        type: orgCard.card.type as "credit" | "debit",
        issuer: orgCard.card.issuer,
        logoUrl: orgCard.card.logoUrl,
      },
    }));

    return formattedCards;
  } catch (error) {
    console.error("Error fetching organization payment cards:", error);
    return [];
  }
}

// Get available payment cards (those not associated with the organization)
export async function getAvailablePaymentCards(organizationId: string) {
  try {
    // First get IDs of cards already associated with the organization
    const orgCardIds = await prisma.organizationPaymentCard.findMany({
      where: { organizationId },
      select: { cardId: true },
    });

    const existingCardIds = orgCardIds.map((item) => item.cardId);

    // Now get all cards that are not in the existing list
    const availableCards = await prisma.paymentCard.findMany({
      where: {
        id: {
          notIn: existingCardIds.length > 0 ? existingCardIds : [-1], // Use [-1] when array is empty to avoid Prisma error
        },
      },
      orderBy: { name: "asc" },
    });

    return availableCards;
  } catch (error) {
    console.error("Error fetching available payment cards:", error);
    return [];
  }
}

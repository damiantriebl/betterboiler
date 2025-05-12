"use server";

import prisma from "@/lib/prisma";
import { type BankCard, type BankWithCards, type CardType } from "@/types/bank-cards";

/**
 * Obtiene todos los tipos de tarjetas disponibles (Visa, Mastercard, etc.)
 */
export async function getAllCardTypes(): Promise<CardType[]> {
  try {
    const cardTypes = await prisma.cardType.findMany({
      orderBy: { name: 'asc' }
    });
    
    return cardTypes as CardType[];
  } catch (error) {
    console.error("Error fetching card types:", error);
    return [];
  }
}

/**
 * Obtiene todas las relaciones banco-tarjeta para una organización
 */
export async function getOrganizationBankCards(organizationId: string): Promise<BankCard[]> {
  try {
    const bankCards = await prisma.bankCard.findMany({
      where: { organizationId },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        cardType: true
      },
      orderBy: [
        { bankId: 'asc' },
        { order: 'asc' }
      ]
    });
    
    return bankCards as BankCard[];
  } catch (error) {
    console.error("Error fetching organization bank cards:", error);
    return [];
  }
}

/**
 * Obtiene las relaciones banco-tarjeta agrupadas por banco para la UI
 */
export async function getBanksWithCards(organizationId: string): Promise<BankWithCards[]> {
  try {
    const bankCards = await getOrganizationBankCards(organizationId);
    
    // Agrupar por banco
    const bankMap = new Map<number, BankWithCards>();
    
    bankCards.forEach(bankCard => {
      if (!bankMap.has(bankCard.bankId)) {
        bankMap.set(bankCard.bankId, {
          bank: bankCard.bank,
          cards: []
        });
      }
      
      bankMap.get(bankCard.bankId)!.cards.push({
        id: bankCard.id,
        cardType: bankCard.cardType,
        isEnabled: bankCard.isEnabled,
        order: bankCard.order
      });
    });
    
    // Convertir Map a array
    return Array.from(bankMap.values());
  } catch (error) {
    console.error("Error creating banks with cards:", error);
    return [];
  }
}

/**
 * Obtiene solo las relaciones banco-tarjeta habilitadas para usar en formularios
 */
export async function getEnabledBankCards(organizationId: string): Promise<BankCard[]> {
  try {
    const bankCards = await prisma.bankCard.findMany({
      where: { 
        organizationId,
        isEnabled: true
      },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        cardType: true
      },
      orderBy: [
        { bankId: 'asc' },
        { order: 'asc' }
      ]
    });
    
    return bankCards as BankCard[];
  } catch (error) {
    console.error("Error fetching enabled bank cards:", error);
    return [];
  }
} 
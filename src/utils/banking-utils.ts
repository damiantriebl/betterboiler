import type { BankCard, BankWithCards } from "@/types/bank-cards";

/**
 * Converts an array of BankCard objects to a BankWithCards structure
 * where cards are grouped by bank for UI display
 */
export function groupBankCardsByBank(bankCards: BankCard[]): BankWithCards[] {
  const bankMap = new Map<number, BankWithCards>();

  // Group cards by bank
  for (const bankCard of bankCards) {
    if (!bankMap.has(bankCard.bankId)) {
      bankMap.set(bankCard.bankId, {
        bank: {
          id: bankCard.bankId,
          name: bankCard.bank.name,
          logoUrl: bankCard.bank.logoUrl,
        },
        cards: [],
      });
    }
    const bank = bankMap.get(bankCard.bankId);
    if (bank) {
      bank.cards.push({
        id: bankCard.id,
        cardType: bankCard.cardType,
        isEnabled: bankCard.isEnabled,
        order: bankCard.order,
      });
    }
  }

  // Convert map to array and sort by bank name
  return Array.from(bankMap.values()).sort((a, b) => a.bank.name.localeCompare(b.bank.name));
}

/**
 * Finds a BankCard by its ID from a list of BankCards
 */
export function findBankCardById(
  bankCards: BankCard[],
  bankCardId: number | null | undefined,
): BankCard | null {
  if (!bankCardId) return null;
  return bankCards.find((bc) => bc.id === bankCardId) || null;
}

/**
 * Extracts bankId and cardId from a bankCardId
 */
export function extractBankAndCardFromBankCardId(
  bankCards: BankCard[],
  bankCardId: number | string | null | undefined,
): { bankId: number | null; cardId: number | null } {
  if (!bankCardId || bankCardId === "all") {
    return { bankId: null, cardId: null };
  }

  const numericId = typeof bankCardId === "string" ? Number.parseInt(bankCardId, 10) : bankCardId;
  const bankCard = findBankCardById(bankCards, numericId);

  if (!bankCard) {
    return { bankId: null, cardId: null };
  }

  return {
    bankId: bankCard.bankId,
    cardId: bankCard.id,
  };
}

/**
 * Find a bankCardId from a bankId and cardId combination
 */
export function findBankCardId(
  bankCards: BankCard[],
  bankId: number | null | undefined,
  cardId: number | null | undefined,
): number | null {
  if (!bankId && !cardId) return null;

  // If only bank is provided (all cards for that bank)
  if (bankId && !cardId) {
    return null; // This means "all cards for this bank" in our application
  }

  // If we have a specific card, find its bankCardId
  if (cardId) {
    const bankCard = bankCards.find((bc) => bc.id === cardId);
    return bankCard?.id || null;
  }

  return null;
}

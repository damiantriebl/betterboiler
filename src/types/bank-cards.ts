// Types for bank-card relationships

export interface CardType {
  id: number;
  name: string;
  type: "credit" | "debit";
  logoUrl?: string | null;
}

export interface BankCard {
  id: number;
  bankId: number;
  cardTypeId: number;
  organizationId: string;
  isEnabled: boolean;
  order: number;
  bank: {
    id: number;
    name: string;
    logoUrl?: string | null;
  };
  cardType: CardType;
}

export interface BankCardDisplay extends BankCard {
  // Incluir propiedades adicionales para la visualización
  displayName: string; // Ejemplo: "Visa - Banco Provincia"
}

// Tipo para agrupar tarjetas por banco en la UI
export interface BankWithCards {
  bank: {
    id: number;
    name: string;
    logoUrl?: string | null;
  };
  cards: {
    id: number; // BankCard.id
    cardType: CardType;
    isEnabled: boolean;
    order: number;
  }[];
}

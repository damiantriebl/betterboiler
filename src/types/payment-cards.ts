// Types for payment cards

export interface PaymentCard {
  id: number;
  name: string;
  type: string;
  issuer: string;
  logoUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrganizationPaymentCard {
  id: number;
  cardId: number;
  organizationId: string;
  isEnabled: boolean;
  order: number;
  card: PaymentCard;
}

export interface OrganizationPaymentCardDisplay {
  id: number;
  order: number;
  isEnabled: boolean;
  card: PaymentCard;
}

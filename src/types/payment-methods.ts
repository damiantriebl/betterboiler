// Types for payment methods

export interface PaymentMethod {
  id: number;
  name: string;
  type: 'cash' | 'credit' | 'debit' | 'transfer' | 'check' | 'deposit' | 'mercadopago' | 'qr' | string;
  description: string;
  iconUrl?: string | null;
}

export interface OrganizationPaymentMethod {
  id: number;
  methodId: number;
  organizationId: string;
  isEnabled: boolean;
  order: number;
  method: PaymentMethod;
}

export interface OrganizationPaymentMethodDisplay {
  id: number;
  order: number;
  isEnabled: boolean;
  card: PaymentMethod;
} 
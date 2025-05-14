import type { MotorcycleState } from "@prisma/client";

// Types for SaleProcess state management
export interface BuyerFormData {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface PaymentFormData {
  metodoPago: string;
  cuotas: number;
  banco: string;
  exchangeRate?: number;
  // Discount fields
  isMayorista: boolean;
  discountType: "percentage" | "fixed" | "none";
  discountValue: number;
  selectedPromotions: number[];
  // Card payment fields
  tarjetaNumero?: string;
  tarjetaVencimiento?: string;
  tarjetaCVV?: string;
  tarjetaTipo?: string;
  // Bank transfer fields
  transferenciaCBU?: string;
  transferenciaTitular?: string;
  transferenciaReferencia?: string;
  // Check payment fields
  chequeNumero?: string;
  chequeFecha?: string;
  chequeEmisor?: string;
  chequeBanco?: string;
  // Digital payment options
  mercadoPagoCheckout?: boolean;
  todoPagoWidget?: boolean;
  rapipagoCodigo?: string;
  qrCode?: string;
  // Current Account (Cuenta Corriente) fields
  downPayment?: number;
  currentAccountInstallments?: number;
  currentAccountFrequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  annualInterestRate?: number;
  currentAccountStartDate?: string;
  currentAccountNotes?: string;
}

export interface SaleProcessState {
  currentStep: number;
  selectedClientId: string | null;
  buyerData: BuyerFormData;
  paymentData: PaymentFormData;
  showClientTable: boolean;
}

// Types for server data
export interface MotorcycleWithRelations {
  id: number;
  brand?: { name: string } | null;
  model?: { name: string } | null;
  year?: number;
  displacement?: number | null;
  chassisNumber?: string | null;
  color?: { name: string } | null;
  state?: MotorcycleState;
  mileage?: number;
  branch?: { name: string } | null;
  retailPrice?: number;
  wholesalePrice?: number | null;
  costPrice?: number | null;
  currency?: string;
  organizationId?: string;
  exchangeRate?: number;
  soldAt?: Date | null;
}

// Types for banking promotions and installment plans

import { PaymentMethod } from "./payment-methods";
import { PaymentCard } from "./payment-cards";
import { Day } from "@/zod/banking-promotion-schemas";

export interface Bank {
  id: number;
  name: string;
  logoUrl?: string | null;
}

export interface InstallmentPlan {
  id: number;
  bankingPromotionId: number;
  installments: number;
  interestRate: number;
  isEnabled: boolean;
}

export interface BankingPromotion {
  id: number;
  name: string;
  description?: string | null;
  organizationId: string;
  paymentMethodId: number;
  cardId?: number | null;
  bankId?: number | null;
  discountRate?: number | null;
  surchargeRate?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  isEnabled: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  activeDays?: Day[];
  paymentMethod?: PaymentMethod;
  card?: PaymentCard | null;
  bank?: Bank | null;
  installmentPlans?: InstallmentPlan[];
}

// Type for complete banking promotion with related entities
export interface BankingPromotionDisplay extends BankingPromotion {
  paymentMethod: PaymentMethod;
  card: PaymentCard | null;
  bank: Bank | null;
  installmentPlans: InstallmentPlan[];
}

// Type for a promotion calculation example
export interface PromotionCalculation {
  originalAmount: number;
  finalAmount: number;
  discountAmount?: number;
  surchargeAmount?: number;
  installmentAmount?: number;
  totalInterest?: number;
  installments?: number;
} 
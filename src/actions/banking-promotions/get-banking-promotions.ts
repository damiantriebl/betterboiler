"use server";

import prisma from "@/lib/prisma";
import type { Bank, BankingPromotionDisplay } from "@/types/banking-promotions";
import { promotionCalculationSchema } from "@/zod/banking-promotion-schemas";

// Get all banks for selecting in forms
export async function getAllBanks(): Promise<Bank[]> {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: { name: "asc" },
    });

    return banks;
  } catch (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
}

// Get banking promotions for an organization
export async function getOrganizationBankingPromotions(
  organizationId: string,
): Promise<BankingPromotionDisplay[]> {
  try {
    const bankingPromotions = await prisma.bankingPromotion.findMany({
      where: { organizationId },
      include: {
        paymentMethod: true,
        card: true,
        bank: true,
        installmentPlans: {
          orderBy: { installments: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return bankingPromotions as BankingPromotionDisplay[];
  } catch (error) {
    console.error("Error fetching banking promotions:", error);
    return [];
  }
}

// Get a single banking promotion with all details
export async function getBankingPromotionById(id: number): Promise<BankingPromotionDisplay | null> {
  try {
    const promotion = await prisma.bankingPromotion.findUnique({
      where: { id },
      include: {
        paymentMethod: true,
        card: true,
        bank: true,
        installmentPlans: {
          orderBy: { installments: "asc" },
        },
      },
    });

    return promotion as BankingPromotionDisplay | null;
  } catch (error) {
    console.error(`Error fetching banking promotion with id ${id}:`, error);
    return null;
  }
}

// Calculate the final amount with a promotion applied
export async function calculatePromotionAmount(params: {
  amount: number;
  promotionId: number;
  installments?: number;
}) {
  try {
    const { amount, promotionId, installments } = params;

    // Get the promotion with installment plans
    const promotion = await prisma.bankingPromotion.findUnique({
      where: { id: promotionId },
      include: {
        installmentPlans: true,
      },
    });

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    let finalAmount = amount;
    let discountAmount = 0;
    let surchargeAmount = 0;
    let installmentAmount = 0;
    let totalInterest = 0;

    // Apply discount or surcharge
    if (promotion.discountRate && promotion.discountRate > 0) {
      discountAmount = amount * (promotion.discountRate / 100);
      finalAmount = amount - discountAmount;
    } else if (promotion.surchargeRate && promotion.surchargeRate > 0) {
      surchargeAmount = amount * (promotion.surchargeRate / 100);
      finalAmount = amount + surchargeAmount;
    }

    // Apply installments if applicable
    if (installments && installments > 1) {
      const installmentPlan = promotion.installmentPlans.find(
        (plan) => plan.installments === installments && plan.isEnabled,
      );

      if (installmentPlan) {
        if (installmentPlan.interestRate > 0) {
          // Apply interest to final amount
          totalInterest = finalAmount * (installmentPlan.interestRate / 100);
          finalAmount = finalAmount + totalInterest;
        }

        // Calculate per-installment amount
        installmentAmount = finalAmount / installments;
      }
    }

    return {
      originalAmount: amount,
      finalAmount,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      surchargeAmount: surchargeAmount > 0 ? surchargeAmount : undefined,
      installmentAmount: installmentAmount > 0 ? installmentAmount : undefined,
      totalInterest: totalInterest > 0 ? totalInterest : undefined,
      installments: installments && installments > 1 ? installments : undefined,
    };
  } catch (error) {
    console.error("Error calculating promotion amount:", error);
    return {
      originalAmount: params.amount,
      finalAmount: params.amount,
    };
  }
}

// Get all enabled banking promotions for an organization
export async function getEnabledBankingPromotions(organizationId: string) {
  try {
    console.log(`Obteniendo promociones bancarias habilitadas para organización ${organizationId}`);

    // Corrección de la consulta para evitar el error
    const promotions = await prisma.bankingPromotion.findMany({
      where: {
        // Pasar organizationId directamente como valor
        organizationId: organizationId,
        isEnabled: true,
      },
      include: {
        paymentMethod: true,
        bank: true,
        card: true,
        installmentPlans: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`Se encontraron ${promotions.length} promociones bancarias habilitadas`);
    return promotions;
  } catch (error) {
    console.error("Error fetching enabled banking promotions:", error);
    return [];
  }
}

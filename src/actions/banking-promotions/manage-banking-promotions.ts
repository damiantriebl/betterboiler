"use server";

import prisma from "@/lib/prisma";
import {
  bankingPromotionSchema,
  updateBankingPromotionSchema,
  updateInstallmentPlanStatusSchema,
} from "@/zod/banking-promotion-schemas";
import { revalidatePath } from "next/cache";
import type { BankingPromotion } from "@prisma/client";

// Create a new banking promotion
export async function createBankingPromotion(
  data: CreateBankingPromotionInput, // Reemplazar any con un tipo específico
) {
  try {
    // Validate the data - include organizationId in validation
    const validatedData = updateBankingPromotionSchema.omit({ id: true }).parse(data);

    // Extract installment plans and organizationId
    const { installmentPlans, organizationId, ...promotionData } = validatedData;

    // Log for debugging with details
    console.log("Validated promotion data for creation:", {
      discountRate: {
        value: promotionData.discountRate,
        type: typeof promotionData.discountRate,
        parsed: promotionData.discountRate
          ? Number.parseFloat(String(promotionData.discountRate))
          : null,
      },
      surchargeRate: {
        value: promotionData.surchargeRate,
        type: typeof promotionData.surchargeRate,
        parsed: promotionData.surchargeRate
          ? Number.parseFloat(String(promotionData.surchargeRate))
          : null,
      },
      description: promotionData.description,
      activeDays: promotionData.activeDays,
    });

    // Ensure numeric fields are properly parsed
    const processedData = {
      ...promotionData,
      discountRate:
        promotionData.discountRate !== null && promotionData.discountRate !== undefined
          ? Number.parseFloat(String(promotionData.discountRate))
          : null,
      surchargeRate:
        promotionData.surchargeRate !== null && promotionData.surchargeRate !== undefined
          ? Number.parseFloat(String(promotionData.surchargeRate))
          : null,
    };

    // Create the banking promotion
    const newPromotion = await prisma.$transaction(async (tx) => {
      // Create the promotion
      const promotion = await tx.bankingPromotion.create({
        data: {
          ...processedData,
          organizationId,
        },
      });

      // Create the installment plans if any
      if (installmentPlans && installmentPlans.length > 0) {
        await tx.installmentPlan.createMany({
          data: installmentPlans.map((plan) => ({
            bankingPromotionId: promotion.id,
            installments: plan.installments,
            interestRate: plan.interestRate,
            isEnabled: plan.isEnabled,
          })),
        });
      }

      return promotion;
    });

    revalidatePath("/configuration");

    return {
      success: true,
      message: "Promoción bancaria creada correctamente",
      data: newPromotion,
    };
  } catch (error: unknown) {
    console.error("Error creating banking promotion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear la promoción",
    };
  }
}

// Update a banking promotion
export async function updateBankingPromotion(data: UpdateBankingPromotionInput) {
  try {
    // Validate the data
    const validatedData = updateBankingPromotionSchema.parse(data);

    // Extract ID and installment plans
    const { id, installmentPlans, ...promotionData } = validatedData;

    // Log for debugging with more details
    console.log("Validated promotion data for update:", {
      id,
      discountRate: {
        value: promotionData.discountRate,
        type: typeof promotionData.discountRate,
        parsed: promotionData.discountRate
          ? Number.parseFloat(String(promotionData.discountRate))
          : null,
      },
      surchargeRate: {
        value: promotionData.surchargeRate,
        type: typeof promotionData.surchargeRate,
        parsed: promotionData.surchargeRate
          ? Number.parseFloat(String(promotionData.surchargeRate))
          : null,
      },
      description: promotionData.description,
      activeDays: promotionData.activeDays,
    });

    // Ensure numeric fields are properly parsed
    const processedData = {
      ...promotionData,
      discountRate:
        promotionData.discountRate !== null && promotionData.discountRate !== undefined
          ? Number.parseFloat(String(promotionData.discountRate))
          : null,
      surchargeRate:
        promotionData.surchargeRate !== null && promotionData.surchargeRate !== undefined
          ? Number.parseFloat(String(promotionData.surchargeRate))
          : null,
    };

    // Update promotion and installment plans in a transaction
    const updatedPromotion = await prisma.$transaction(async (tx) => {
      // Update promotion data
      const promotion = await tx.bankingPromotion.update({
        where: { id },
        data: processedData,
      });

      // Handle installment plans
      if (installmentPlans && installmentPlans.length > 0) {
        // Get existing plans
        const existingPlans = await tx.installmentPlan.findMany({
          where: { bankingPromotionId: id },
        });

        const existingPlanMap = new Map(existingPlans.map((plan) => [plan.installments, plan]));

        // Process each installment plan
        for (const plan of installmentPlans) {
          const existingPlan = existingPlanMap.get(plan.installments);

          if (existingPlan) {
            // Update existing plan
            await tx.installmentPlan.update({
              where: { id: existingPlan.id },
              data: {
                interestRate: plan.interestRate,
                isEnabled: plan.isEnabled,
              },
            });
          } else {
            // Create new plan
            await tx.installmentPlan.create({
              data: {
                bankingPromotionId: id,
                installments: plan.installments,
                interestRate: plan.interestRate,
                isEnabled: plan.isEnabled,
              },
            });
          }
        }
      }

      return promotion;
    });

    // Obtener la promoción completa con sus planes de cuotas
    const completePromotion = await prisma.bankingPromotion.findUnique({
      where: { id },
      include: {
        installmentPlans: true,
      },
    });

    revalidatePath("/configuration");

    return {
      success: true,
      message: "Promoción bancaria actualizada correctamente",
      data: completePromotion,
    };
  } catch (error: unknown) {
    console.error("Error updating banking promotion:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error desconocido al actualizar la promoción",
    };
  }
}

// Toggle a banking promotion's enabled status
export async function toggleBankingPromotion(data: ToggleBankingPromotionInput) {
  try {
    await prisma.bankingPromotion.update({
      where: { id: data.id },
      data: { isEnabled: data.isEnabled },
    });

    revalidatePath("/configuration");

    return {
      success: true,
      message: `Promoción ${data.isEnabled ? "habilitada" : "deshabilitada"} correctamente`,
    };
  } catch (error: unknown) {
    console.error("Error toggling banking promotion:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al cambiar el estado de la promoción",
    };
  }
}

// Toggle an installment plan's enabled status
export async function toggleInstallmentPlan(data: ToggleInstallmentPlanInput) {
  try {
    const { id, isEnabled } = updateInstallmentPlanStatusSchema.parse(data);

    await prisma.installmentPlan.update({
      where: { id },
      data: { isEnabled },
    });

    revalidatePath("/configuration");

    return {
      success: true,
      message: `Plan de cuotas ${isEnabled ? "habilitado" : "deshabilitado"} correctamente`,
    };
  } catch (error: unknown) {
    console.error("Error toggling installment plan:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error desconocido al cambiar el estado del plan",
    };
  }
}

// Delete a banking promotion
export async function deleteBankingPromotion(id: string) {
  try {
    await prisma.bankingPromotion.delete({
      where: { id },
    });

    revalidatePath("/configuration");

    return {
      success: true,
      message: "Promoción bancaria eliminada correctamente",
    };
  } catch (error: unknown) {
    console.error("Error deleting banking promotion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al eliminar la promoción",
    };
  }
}

// Get promotion details with installment plans
export async function getBankingPromotionDetails(id: string) {
  try {
    const promotion = await prisma.bankingPromotion.findUnique({
      where: { id },
      include: {
        installmentPlans: true,
      },
    });

    if (!promotion) {
      return {
        success: false,
        message: "Promoción no encontrada",
      };
    }

    // Log retrieved promotion data for debugging
    console.log("Retrieved promotion details:", {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountRate: {
        value: promotion.discountRate,
        type: typeof promotion.discountRate,
      },
      surchargeRate: {
        value: promotion.surchargeRate,
        type: typeof promotion.surchargeRate,
      },
    });

    return {
      success: true,
      data: promotion,
    };
  } catch (error: unknown) {
    console.error("Error fetching banking promotion details:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al obtener los detalles de la promoción",
    };
  }
}

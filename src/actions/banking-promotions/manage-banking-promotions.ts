"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  bankingPromotionSchema, 
  updateBankingPromotionSchema,
  updateInstallmentPlanStatusSchema
} from "@/zod/banking-promotion-schemas";

// Create a new banking promotion
export async function createBankingPromotion(
  data: any // Keep 'any' for now, validation happens next
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
        parsed: promotionData.discountRate ? parseFloat(String(promotionData.discountRate)) : null
      }, 
      surchargeRate: {
        value: promotionData.surchargeRate,
        type: typeof promotionData.surchargeRate,
        parsed: promotionData.surchargeRate ? parseFloat(String(promotionData.surchargeRate)) : null
      },
      description: promotionData.description,
      activeDays: promotionData.activeDays
    });
    
    // Ensure numeric fields are properly parsed
    const processedData = {
      ...promotionData,
      discountRate: promotionData.discountRate !== null && promotionData.discountRate !== undefined 
        ? parseFloat(String(promotionData.discountRate)) 
        : null,
      surchargeRate: promotionData.surchargeRate !== null && promotionData.surchargeRate !== undefined 
        ? parseFloat(String(promotionData.surchargeRate)) 
        : null,
    };
    
    // Create the banking promotion
    const newPromotion = await prisma.$transaction(async (tx) => {
      // Create the promotion
      const promotion = await tx.bankingPromotion.create({
        data: {
          ...processedData,
          organizationId
        }
      });
      
      // Create the installment plans if any
      if (installmentPlans && installmentPlans.length > 0) {
        await tx.installmentPlan.createMany({
          data: installmentPlans.map(plan => ({
            bankingPromotionId: promotion.id,
            installments: plan.installments,
            interestRate: plan.interestRate,
            isEnabled: plan.isEnabled
          }))
        });
      }
      
      return promotion;
    });
    
    revalidatePath('/configuration');
    
    return { 
      success: true, 
      message: "Promoción bancaria creada correctamente",
      data: newPromotion
    };
  } catch (error: any) {
    console.error("Error creating banking promotion:", error);
    return {
      success: false,
      message: error.message || "Error al crear la promoción bancaria"
    };
  }
}

// Update a banking promotion
export async function updateBankingPromotion(data: any) {
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
        parsed: promotionData.discountRate ? parseFloat(String(promotionData.discountRate)) : null
      }, 
      surchargeRate: {
        value: promotionData.surchargeRate,
        type: typeof promotionData.surchargeRate,
        parsed: promotionData.surchargeRate ? parseFloat(String(promotionData.surchargeRate)) : null
      },
      description: promotionData.description,
      activeDays: promotionData.activeDays
    });
    
    // Ensure numeric fields are properly parsed
    const processedData = {
      ...promotionData,
      discountRate: promotionData.discountRate !== null && promotionData.discountRate !== undefined 
        ? parseFloat(String(promotionData.discountRate)) 
        : null,
      surchargeRate: promotionData.surchargeRate !== null && promotionData.surchargeRate !== undefined 
        ? parseFloat(String(promotionData.surchargeRate)) 
        : null,
    };
    
    // Update promotion and installment plans in a transaction
    const updatedPromotion = await prisma.$transaction(async (tx) => {
      // Update promotion data
      const promotion = await tx.bankingPromotion.update({
        where: { id },
        data: processedData
      });
      
      // Handle installment plans
      if (installmentPlans && installmentPlans.length > 0) {
        // Get existing plans
        const existingPlans = await tx.installmentPlan.findMany({
          where: { bankingPromotionId: id }
        });
        
        const existingPlanMap = new Map(
          existingPlans.map(plan => [plan.installments, plan])
        );
        
        // Process each installment plan
        for (const plan of installmentPlans) {
          const existingPlan = existingPlanMap.get(plan.installments);
          
          if (existingPlan) {
            // Update existing plan
            await tx.installmentPlan.update({
              where: { id: existingPlan.id },
              data: {
                interestRate: plan.interestRate,
                isEnabled: plan.isEnabled
              }
            });
          } else {
            // Create new plan
            await tx.installmentPlan.create({
              data: {
                bankingPromotionId: id,
                installments: plan.installments,
                interestRate: plan.interestRate,
                isEnabled: plan.isEnabled
              }
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
        installmentPlans: true
      }
    });
    
    revalidatePath('/configuration');
    
    return { 
      success: true, 
      message: "Promoción bancaria actualizada correctamente",
      data: completePromotion
    };
  } catch (error: any) {
    console.error("Error updating banking promotion:", error);
    return {
      success: false,
      message: error.message || "Error al actualizar la promoción bancaria"
    };
  }
}

// Toggle a banking promotion's enabled status
export async function toggleBankingPromotion(id: number, isEnabled: boolean) {
  try {
    await prisma.bankingPromotion.update({
      where: { id },
      data: { isEnabled }
    });
    
    revalidatePath('/configuration');
    
    return { 
      success: true, 
      message: `Promoción ${isEnabled ? 'habilitada' : 'deshabilitada'} correctamente`
    };
  } catch (error: any) {
    console.error("Error toggling banking promotion:", error);
    return {
      success: false,
      message: error.message || "Error al cambiar el estado de la promoción"
    };
  }
}

// Toggle an installment plan's enabled status
export async function toggleInstallmentPlan(data: any) {
  try {
    const { id, isEnabled } = updateInstallmentPlanStatusSchema.parse(data);
    
    await prisma.installmentPlan.update({
      where: { id },
      data: { isEnabled }
    });
    
    revalidatePath('/configuration');
    
    return { 
      success: true, 
      message: `Plan de cuotas ${isEnabled ? 'habilitado' : 'deshabilitado'} correctamente`
    };
  } catch (error: any) {
    console.error("Error toggling installment plan:", error);
    return {
      success: false,
      message: error.message || "Error al cambiar el estado del plan de cuotas"
    };
  }
}

// Delete a banking promotion
export async function deleteBankingPromotion(id: number) {
  try {
    await prisma.bankingPromotion.delete({
      where: { id }
    });
    
    revalidatePath('/configuration');
    
    return { 
      success: true, 
      message: "Promoción bancaria eliminada correctamente"
    };
  } catch (error: any) {
    console.error("Error deleting banking promotion:", error);
    return {
      success: false,
      message: error.message || "Error al eliminar la promoción bancaria"
    };
  }
}

// Get promotion details with installment plans
export async function getBankingPromotionDetails(id: number) {
  try {
    const promotion = await prisma.bankingPromotion.findUnique({
      where: { id },
      include: {
        installmentPlans: true
      }
    });
    
    if (!promotion) {
      return {
        success: false,
        message: "Promoción no encontrada"
      };
    }
    
    // Log retrieved promotion data for debugging
    console.log("Retrieved promotion details:", {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountRate: {
        value: promotion.discountRate,
        type: typeof promotion.discountRate
      },
      surchargeRate: {
        value: promotion.surchargeRate,
        type: typeof promotion.surchargeRate
      }
    });
    
    return {
      success: true,
      data: promotion
    };
  } catch (error: any) {
    console.error("Error fetching banking promotion details:", error);
    return {
      success: false,
      message: error.message || "Error al obtener los detalles de la promoción"
    };
  }
} 
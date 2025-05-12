'use server';

import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";

/**
 * Función de diagnóstico para verificar las consultas a BankingPromotion
 */
export async function diagnoseBankingPromotionQueries() {
  try {
    // Obtener el ID de organización actual
    const organizationIdResult = await getOrganizationIdFromSession();
    if (!organizationIdResult) {
      return { success: false, error: 'No se pudo obtener el ID de la organización' };
    }
    
    // Convertir el resultado a string para usarlo con Prisma
    const organizationId = String(organizationIdResult);
    
    // Intentar una consulta básica para ver si funciona
    const bankingPromotionsCount = await prisma.bankingPromotion.count({
      where: { organizationId },
    });
    
    // Probar la consulta específica que falla
    try {
      const promotions = await prisma.bankingPromotion.findMany({
        where: {
          organizationId,
          isEnabled: true,
        },
        take: 1, // Solo necesitamos verificar si funciona
      });
      
      return {
        success: true,
        message: 'La consulta a BankingPromotion funciona correctamente',
        count: bankingPromotionsCount,
        sample: promotions.length > 0 ? promotions[0] : null
      };
    } catch (error) {
      return {
        success: false,
        error: `Error en la consulta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        count: bankingPromotionsCount
      };
    }
  } catch (error) {
    console.error("Error en diagnóstico:", error);
    return {
      success: false,
      error: `Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
} 
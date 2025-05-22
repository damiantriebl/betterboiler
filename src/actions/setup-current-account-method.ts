"use server";

import db from "@/lib/prisma";
import { getOrganizationIdFromSession } from "./get-Organization-Id-From-Session";

export async function setupCurrentAccountMethod() {
  try {
    // Obtener el ID de organización actual
    const sessionInfo = await getOrganizationIdFromSession();
    
    if (sessionInfo.error || !sessionInfo.organizationId) {
      return { success: false, error: sessionInfo.error || "No se pudo obtener el ID de la organización" };
    }

    const organizationId = sessionInfo.organizationId; // Ya es string | null, y hemos verificado que no es null

    let paymentMethod = await db.paymentMethod.findFirst({
      where: { type: "current_account" },
    });

    // Si no existe, crearlo
    if (!paymentMethod) {
      paymentMethod = await db.paymentMethod.create({
        data: {
          name: "Cuenta Corriente",
          type: "current_account",
          description: "Pago con cuenta corriente financiada",
          iconUrl: "/icons/payment-methods/current-account.svg",
        },
      });
    }

    // Si después de intentar crearlo sigue sin existir, es un error crítico.
    if (!paymentMethod) {
      return {
        success: false,
        error: "No se pudo crear o encontrar el método de pago 'Cuenta Corriente'.",
      };
    }

    // 2. Verificar si ya está habilitado para la organización actual
    const existingOrgMethod = await db.organizationPaymentMethod.findFirst({
      where: {
        organizationId,
        methodId: paymentMethod.id, // Seguro usar .id aquí porque paymentMethod no es null
      },
    });

    // Si no está habilitado, habilitarlo
    if (!existingOrgMethod) {
      // Obtener el orden más alto de los métodos de pago existentes
      const highestOrder = await db.organizationPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (highestOrder?.order || 0) + 1;

      await db.organizationPaymentMethod.create({
        data: {
          organizationId,
          methodId: paymentMethod.id, // Seguro usar .id aquí
          isEnabled: true,
          order: newOrder,
        },
      });
    }

    return {
      success: true,
      data: {
        paymentMethod, // paymentMethod aquí no será null
        enabled: !!existingOrgMethod,
      },
    };
  } catch (error) {
    console.error("Error al configurar método de cuenta corriente:", error);
    return {
      success: false,
      error: "Ocurrió un error al configurar el método de pago. Consulte los logs.",
    };
  }
}

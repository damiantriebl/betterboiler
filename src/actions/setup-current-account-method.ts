"use server";

import db from "@/lib/prisma";
import { getOrganizationIdFromSession } from "./getOrganizationIdFromSession";

export async function setupCurrentAccountMethod() {
  try {
    // Obtener el ID de organización actual
    const organizationIdResult = await getOrganizationIdFromSession();
    if (!organizationIdResult) {
      return { success: false, error: "No se pudo obtener el ID de la organización" };
    }

    // Convertir el resultado a string para usarlo con Prisma
    const organizationId = String(organizationIdResult);

    // 1. Verificar si el método de pago "cuenta_corriente" existe
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

    // 2. Verificar si ya está habilitado para la organización actual
    const existingOrgMethod = await db.organizationPaymentMethod.findFirst({
      where: {
        organizationId,
        methodId: paymentMethod.id,
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
          methodId: paymentMethod.id,
          isEnabled: true,
          order: newOrder,
        },
      });
    }

    return {
      success: true,
      data: {
        paymentMethod,
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

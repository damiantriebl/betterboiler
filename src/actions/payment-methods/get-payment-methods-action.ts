"use server";

import { type PaymentMethod, PrismaClient } from "@prisma/client";
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";
import { setupCurrentAccountMethod } from "../setup-current-account-method";

const prisma = new PrismaClient();

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getPaymentMethodsAction(): Promise<ActionResult<PaymentMethod[]>> {
  try {
    // Primero asegurarse de que el método de cuenta corriente esté configurado
    const setupResult = await setupCurrentAccountMethod();
    if (!setupResult.success) {
      // Podrías querer loguear setupResult.error aquí o manejarlo de forma más específica
      return { success: false, error: setupResult.error || "Error al configurar el método de cuenta corriente." };
    }

    // Obtener ID de la organización actual desde la sesión
    const sessionInfo = await getOrganizationIdFromSession();
    if (sessionInfo.error || !sessionInfo.organizationId) {
      return { success: false, error: sessionInfo.error || "Organization ID not found." };
    }

    const organizationId = sessionInfo.organizationId; // Ya es un string aquí debido a la validación previa

    // Obtener los métodos de pago habilitados para esta organización
    const organizationPaymentMethods = await prisma.organizationPaymentMethod.findMany({
      where: {
        organizationId: organizationId,
        isEnabled: true,
      },
      include: {
        method: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Extraer solo los objetos PaymentMethod de los resultados
    const paymentMethods = organizationPaymentMethods.map((opm) => opm.method);

    return { success: true, data: paymentMethods };
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    let errorMessage = "Failed to fetch payment methods.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

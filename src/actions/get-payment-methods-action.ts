"use server";

import { PrismaClient, type PaymentMethod } from '@prisma/client';
import { getOrganizationIdFromSession } from './getOrganizationIdFromSession';
import { setupCurrentAccountMethod } from './setup-current-account-method';

const prisma = new PrismaClient();

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getPaymentMethodsAction(): Promise<ActionResult<PaymentMethod[]>> {
  try {
    // Primero asegurarse de que el método de cuenta corriente esté configurado
    await setupCurrentAccountMethod();
    
    // Obtener ID de la organización actual desde la sesión
    const organizationIdResult = await getOrganizationIdFromSession();
    if (!organizationIdResult) {
      return { success: false, error: 'Organization ID not found.' };
    }
    
    // Convertir el resultado a string para usarlo con Prisma
    const organizationId = String(organizationIdResult);

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
        order: 'asc',
      },
    });

    // Extraer solo los objetos PaymentMethod de los resultados
    const paymentMethods = organizationPaymentMethods.map(opm => opm.method);

    return { success: true, data: paymentMethods };
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    let errorMessage = 'Failed to fetch payment methods.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
} 
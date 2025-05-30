"use server";

import prisma from "@/lib/prisma";
import { validateOrganizationAccess } from "./auth-session-unified";

// Types
export interface PaymentMethodResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface PaymentMethodSetupParams {
  name: string;
  type: string;
  description: string;
  iconUrl: string;
}

// Helper function for error handling
function handlePaymentMethodError(error: unknown, operation: string): string {
  console.error(`Error in ${operation}:`, error);
  return error instanceof Error ? error.message : "Error desconocido en métodos de pago";
}

// Core payment method functions
export async function setupCurrentAccountMethod(): Promise<PaymentMethodResult> {
  try {
    const authResult = await validateOrganizationAccess();

    if (!authResult.success || !authResult.organizationId) {
      return {
        success: false,
        error: authResult.error || "No se pudo obtener el ID de la organización",
      };
    }

    const organizationId = authResult.organizationId;

    // Find or create the current account payment method
    let paymentMethod = await prisma.paymentMethod.findFirst({
      where: { type: "current_account" },
    });

    if (!paymentMethod) {
      paymentMethod = await prisma.paymentMethod.create({
        data: {
          name: "Cuenta Corriente",
          type: "current_account",
          description: "Pago con cuenta corriente financiada",
          iconUrl: "/icons/payment-methods/current-account.svg",
        },
      });
    }

    if (!paymentMethod) {
      return {
        success: false,
        error: "No se pudo crear o encontrar el método de pago 'Cuenta Corriente'.",
      };
    }

    // Check if already enabled for the organization
    const existingOrgMethod = await prisma.organizationPaymentMethod.findFirst({
      where: {
        organizationId,
        methodId: paymentMethod.id,
      },
    });

    // If not enabled, enable it
    if (!existingOrgMethod) {
      const highestOrder = await prisma.organizationPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (highestOrder?.order || 0) + 1;

      await prisma.organizationPaymentMethod.create({
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
    return {
      success: false,
      error: handlePaymentMethodError(error, "setupCurrentAccountMethod"),
    };
  }
}

export async function setupPaymentMethod(
  params: PaymentMethodSetupParams,
): Promise<PaymentMethodResult> {
  try {
    const authResult = await validateOrganizationAccess();

    if (!authResult.success || !authResult.organizationId) {
      return {
        success: false,
        error: authResult.error || "No se pudo obtener el ID de la organización",
      };
    }

    const organizationId = authResult.organizationId;

    // Find or create the payment method
    let paymentMethod = await prisma.paymentMethod.findFirst({
      where: { type: params.type },
    });

    if (!paymentMethod) {
      paymentMethod = await prisma.paymentMethod.create({
        data: {
          name: params.name,
          type: params.type,
          description: params.description,
          iconUrl: params.iconUrl,
        },
      });
    }

    if (!paymentMethod) {
      return {
        success: false,
        error: `No se pudo crear o encontrar el método de pago '${params.name}'.`,
      };
    }

    // Check if already enabled for the organization
    const existingOrgMethod = await prisma.organizationPaymentMethod.findFirst({
      where: {
        organizationId,
        methodId: paymentMethod.id,
      },
    });

    // If not enabled, enable it
    if (!existingOrgMethod) {
      const highestOrder = await prisma.organizationPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (highestOrder?.order || 0) + 1;

      await prisma.organizationPaymentMethod.create({
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
    return {
      success: false,
      error: handlePaymentMethodError(error, "setupPaymentMethod"),
    };
  }
}

// Utility functions
export async function getOrganizationPaymentMethods(): Promise<PaymentMethodResult> {
  try {
    const authResult = await validateOrganizationAccess();

    if (!authResult.success || !authResult.organizationId) {
      return {
        success: false,
        error: authResult.error || "No se pudo obtener el ID de la organización",
      };
    }

    const paymentMethods = await prisma.organizationPaymentMethod.findMany({
      where: {
        organizationId: authResult.organizationId,
        isEnabled: true,
      },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: paymentMethods,
    };
  } catch (error) {
    return {
      success: false,
      error: handlePaymentMethodError(error, "getOrganizationPaymentMethods"),
    };
  }
}

export async function togglePaymentMethodStatus(
  methodId: string,
  isEnabled: boolean,
): Promise<PaymentMethodResult> {
  try {
    const authResult = await validateOrganizationAccess();

    if (!authResult.success || !authResult.organizationId) {
      return {
        success: false,
        error: authResult.error || "No se pudo obtener el ID de la organización",
      };
    }

    const organizationId = authResult.organizationId;

    const orgMethod = await prisma.organizationPaymentMethod.findFirst({
      where: {
        organizationId,
        methodId: Number(methodId),
      },
    });

    if (!orgMethod) {
      return {
        success: false,
        error: "Método de pago no encontrado para esta organización",
      };
    }

    const updatedMethod = await prisma.organizationPaymentMethod.update({
      where: { id: orgMethod.id },
      data: { isEnabled },
    });

    return {
      success: true,
      data: updatedMethod,
    };
  } catch (error) {
    return {
      success: false,
      error: handlePaymentMethodError(error, "togglePaymentMethodStatus"),
    };
  }
}

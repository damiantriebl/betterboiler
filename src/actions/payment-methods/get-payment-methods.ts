"use server";

import prisma from "@/lib/prisma";
import type { OrganizationPaymentMethodDisplay, PaymentMethod } from "@/types/payment-methods";
import type { OrganizationPaymentMethod } from "@prisma/client";

// Default payment methods as fallback when tables don't exist
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    name: "Efectivo",
    type: "cash",
    description: "Pago en efectivo",
    iconUrl: "/icons/payment-methods/cash.svg",
  },
  {
    id: 2,
    name: "Tarjeta de Crédito",
    type: "credit",
    description: "Pago con tarjeta de crédito",
    iconUrl: "/icons/payment-methods/credit-card.svg",
  },
  {
    id: 3,
    name: "Tarjeta de Débito",
    type: "debit",
    description: "Pago con tarjeta de débito",
    iconUrl: "/icons/payment-methods/debit-card.svg",
  },
  {
    id: 4,
    name: "Transferencia Bancaria",
    type: "transfer",
    description: "Pago por transferencia bancaria",
    iconUrl: "/icons/payment-methods/bank-transfer.svg",
  },
  {
    id: 5,
    name: "Cheque",
    type: "check",
    description: "Pago con cheque",
    iconUrl: "/icons/payment-methods/check.svg",
  },
  {
    id: 6,
    name: "Depósito Bancario",
    type: "deposit",
    description: "Pago por depósito bancario",
    iconUrl: "/icons/payment-methods/bank-deposit.svg",
  },
  {
    id: 7,
    name: "Código QR",
    type: "qr",
    description: "Pago mediante escaneo de código QR",
    iconUrl: "/icons/payment-methods/qr-code.svg",
  },
];

// Get all global payment methods (for admin selection)
export async function getAllPaymentMethods() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { name: "asc" },
    });

    return paymentMethods;
  } catch (error) {
    console.error("Error fetching payment methods, using defaults:", error);
    return DEFAULT_PAYMENT_METHODS;
  }
}

// Get payment methods associated with an organization
export async function getOrganizationPaymentMethods(
  organizationId: string,
): Promise<OrganizationPaymentMethodDisplay[]> {
  try {
    const organizationMethods = await prisma.organizationPaymentMethod.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
      include: {
        method: true,
      },
    });

    const formattedMethods: OrganizationPaymentMethodDisplay[] = organizationMethods.map(
      (orgMethod) => ({
        id: orgMethod.id,
        order: orgMethod.order,
        isEnabled: orgMethod.isEnabled,
        card: {
          id: orgMethod.method.id,
          name: orgMethod.method.name,
          type: orgMethod.method.type,
          description: orgMethod.method.description,
          iconUrl: orgMethod.method.iconUrl,
        },
      }),
    );

    return formattedMethods;
  } catch (error) {
    console.error("Error fetching organization payment methods:", error);
    return [];
  }
}

// Get available payment methods (those not associated with the organization)
export async function getAvailablePaymentMethods(organizationId: string) {
  try {
    // First get IDs of methods already associated with the organization
    const orgMethodIds = await prisma.organizationPaymentMethod.findMany({
      where: { organizationId },
      select: { methodId: true },
    });

    const existingMethodIds = orgMethodIds.map((item: { methodId: number }) => item.methodId);

    // Now get all methods that are not in the existing list
    const availableMethods = await prisma.paymentMethod.findMany({
      where: {
        id: {
          notIn: existingMethodIds.length > 0 ? existingMethodIds : [-1], // Use [-1] when array is empty to avoid Prisma error
        },
      },
      orderBy: { name: "asc" },
    });

    return availableMethods;
  } catch (error) {
    console.error("Error fetching available payment methods, using defaults:", error);
    return DEFAULT_PAYMENT_METHODS;
  }
}

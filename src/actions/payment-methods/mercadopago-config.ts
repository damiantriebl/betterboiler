import prisma from "@/lib/prisma";
import type { MercadoPagoConfiguration } from "@/types/payment-methods";

export async function getMercadoPagoConfiguration(
  organizationId: string,
): Promise<MercadoPagoConfiguration | null> {
  try {
    // Buscar el método de pago de Mercado Pago
    const mercadoPagoMethod = await prisma.paymentMethod.findUnique({
      where: { type: "mercadopago" },
    });

    if (!mercadoPagoMethod) {
      return null;
    }

    // Buscar la configuración de la organización
    const orgPaymentMethod = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId: mercadoPagoMethod.id,
        },
      },
      include: {
        configurations: true,
      },
    });

    if (!orgPaymentMethod || !orgPaymentMethod.configurations) {
      return null;
    }

    // Construir el objeto de configuración
    const config: Partial<MercadoPagoConfiguration> = {};

    for (const configItem of orgPaymentMethod.configurations) {
      (config as any)[configItem.configKey] = configItem.configValue;
    }

    return config as MercadoPagoConfiguration;
  } catch (error) {
    console.error("Error obteniendo configuración de Mercado Pago:", error);
    return null;
  }
}

export async function updateMercadoPagoConfiguration(
  organizationId: string,
  configuration: Partial<MercadoPagoConfiguration>,
): Promise<boolean> {
  try {
    // Buscar el método de pago de Mercado Pago
    const mercadoPagoMethod = await prisma.paymentMethod.findUnique({
      where: { type: "mercadopago" },
    });

    if (!mercadoPagoMethod) {
      throw new Error("Método de pago Mercado Pago no encontrado");
    }

    // Buscar o crear la relación organización-método de pago
    let orgPaymentMethod = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId: mercadoPagoMethod.id,
        },
      },
    });

    if (!orgPaymentMethod) {
      // Obtener el orden más alto actual
      const highestOrder = await prisma.organizationPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      orgPaymentMethod = await prisma.organizationPaymentMethod.create({
        data: {
          organizationId,
          methodId: mercadoPagoMethod.id,
          isEnabled: true,
          order: (highestOrder?.order || -1) + 1,
        },
      });
    }

    // Actualizar cada configuración
    for (const [key, value] of Object.entries(configuration)) {
      if (value !== undefined) {
        await prisma.paymentMethodConfiguration.upsert({
          where: {
            organizationPaymentMethodId_configKey: {
              organizationPaymentMethodId: orgPaymentMethod.id,
              configKey: key,
            },
          },
          update: {
            configValue: value as string,
          },
          create: {
            organizationPaymentMethodId: orgPaymentMethod.id,
            configKey: key,
            configValue: value as string,
            isEncrypted: key === "access_token", // Solo el access_token es sensitivo
          },
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error actualizando configuración de Mercado Pago:", error);
    return false;
  }
}

export async function validateMercadoPagoConfiguration(
  configuration: Partial<MercadoPagoConfiguration>,
): Promise<boolean> {
  const requiredFields = ["access_token", "public_key"];

  for (const field of requiredFields) {
    if (!configuration[field as keyof MercadoPagoConfiguration]) {
      return false;
    }
  }

  // TODO: Aquí podrías agregar validación real contra la API de Mercado Pago
  // Por ejemplo, hacer una llamada de prueba para verificar que las credenciales son válidas

  return true;
}

export async function isMercadoPagoAvailable(organizationId: string): Promise<boolean> {
  const config = await getMercadoPagoConfiguration(organizationId);
  return config !== null && validateMercadoPagoConfiguration(config);
}

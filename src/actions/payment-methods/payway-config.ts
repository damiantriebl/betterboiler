"use server";

import prisma from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";
import type { PayWayConfiguration } from "@/types/payment-methods";
import { revalidatePath } from "next/cache";

// Obtener la configuración de PayWay para una organización
export async function getPayWayConfiguration(
  organizationId: string,
): Promise<PayWayConfiguration | null> {
  try {
    // Buscar el método de pago PayWay
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { type: "payway" },
    });

    if (!paymentMethod) {
      return null;
    }

    // Buscar la asociación con la organización
    const orgPaymentMethod = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId: paymentMethod.id,
        },
      },
      include: {
        configurations: true,
      },
    });

    if (!orgPaymentMethod || !orgPaymentMethod.configurations) {
      return null;
    }

    // Convertir las configuraciones a un objeto
    const config: Partial<PayWayConfiguration> = {};
    for (const configItem of orgPaymentMethod.configurations) {
      (config as any)[configItem.configKey] = configItem.configValue;
    }

    return config as PayWayConfiguration;
  } catch (error) {
    console.error("Error obteniendo configuración de PayWay:", error);
    return null;
  }
}

// Actualizar la configuración de PayWay
export async function updatePayWayConfiguration(
  organizationId: string,
  configuration: Partial<PayWayConfiguration>,
): Promise<ActionState> {
  try {
    // Buscar el método de pago PayWay
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { type: "payway" },
    });

    if (!paymentMethod) {
      return {
        success: false,
        error: "Método de pago PayWay no encontrado. Ejecuta el script de configuración primero.",
      };
    }

    // Buscar la asociación con la organización
    const orgPaymentMethod = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId: paymentMethod.id,
        },
      },
    });

    if (!orgPaymentMethod) {
      return {
        success: false,
        error:
          "PayWay no está asociado a esta organización. Ejecuta el script de configuración primero.",
      };
    }

    // Configuraciones que deben estar encriptadas
    const encryptedKeys = new Set(["api_key", "secret_key"]);

    // Actualizar cada configuración
    const updatePromises = Object.entries(configuration).map(([key, value]) => {
      if (value === undefined || value === null) return Promise.resolve();

      return prisma.paymentMethodConfiguration.upsert({
        where: {
          organizationPaymentMethodId_configKey: {
            organizationPaymentMethodId: orgPaymentMethod.id,
            configKey: key,
          },
        },
        update: {
          configValue: String(value),
          isEncrypted: encryptedKeys.has(key),
        },
        create: {
          organizationPaymentMethodId: orgPaymentMethod.id,
          configKey: key,
          configValue: String(value),
          isEncrypted: encryptedKeys.has(key),
        },
      });
    });

    await Promise.all(updatePromises);

    revalidatePath("/configuration");
    return {
      success: true,
      message: "Configuración de PayWay actualizada correctamente.",
    };
  } catch (error) {
    console.error("Error actualizando configuración de PayWay:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al actualizar la configuración de PayWay.",
    };
  }
}

// Validar la configuración de PayWay
export async function validatePayWayConfiguration(organizationId: string): Promise<ActionState> {
  try {
    const config = await getPayWayConfiguration(organizationId);

    if (!config) {
      return {
        success: false,
        error: "No se encontró configuración de PayWay para esta organización.",
      };
    }

    // Validar campos requeridos
    const requiredFields = ["merchant_id", "api_key", "secret_key", "environment"];
    const missingFields = requiredFields.filter(
      (field) =>
        !config[field as keyof PayWayConfiguration] ||
        config[field as keyof PayWayConfiguration]?.startsWith("YOUR_"),
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Faltan configurar los siguientes campos: ${missingFields.join(", ")}`,
      };
    }

    // Aquí podrías agregar una validación real con la API de PayWay
    // Por ahora solo validamos que los campos estén presentes

    return {
      success: true,
      message: "Configuración de PayWay válida.",
    };
  } catch (error) {
    console.error("Error validando configuración de PayWay:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al validar la configuración de PayWay.",
    };
  }
}

// Comprobar si PayWay está disponible para una organización
export async function isPayWayAvailable(organizationId: string): Promise<boolean> {
  try {
    const config = await getPayWayConfiguration(organizationId);
    if (!config) return false;

    const requiredFields = ["merchant_id", "api_key", "secret_key"];
    return requiredFields.every(
      (field) =>
        config[field as keyof PayWayConfiguration] &&
        !config[field as keyof PayWayConfiguration]?.startsWith("YOUR_"),
    );
  } catch (error) {
    console.error("Error verificando disponibilidad de PayWay:", error);
    return false;
  }
}

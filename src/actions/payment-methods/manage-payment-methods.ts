"use server";

import prisma from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";
import { toggleMethodSchema } from "@/zod/payment-method-schemas";
import { revalidatePath } from "next/cache";

// Toggle a payment method's enabled status for an organization
export async function togglePaymentMethod(
  organizationId: string,
  formData: FormData,
): Promise<ActionState> {
  const rawFormData = {
    methodId: Number(formData.get("methodId")),
    isEnabled: formData.get("isEnabled") === "true",
  };

  const validatedFields = toggleMethodSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      success: false,
      error:
        "Error de validación: " +
        Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", "),
    };
  }

  const { methodId, isEnabled } = validatedFields.data;

  try {
    // This will throw an error if the table doesn't exist yet
    await prisma.organizationPaymentMethod.update({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId,
        },
      },
      data: { isEnabled },
    });

    revalidatePath("/configuration");
    return {
      success: true,
      message: `Método de pago ${isEnabled ? "habilitado" : "deshabilitado"} correctamente.`,
    };
  } catch (error: any) {
    console.error("Error updating payment method status:", error);
    return {
      success: false,
      error:
        "No se pudo actualizar el método de pago. Es posible que la tabla no exista todavía o que haya un problema con la conexión.",
    };
  }
}

// Associate a payment method with an organization
export async function associatePaymentMethod(
  organizationId: string,
  methodId: number,
): Promise<ActionState> {
  try {
    // Check if association already exists
    // This will throw an error if the table doesn't exist yet
    const existingAssociation = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId,
        },
      },
    });

    if (existingAssociation) {
      return { success: false, error: "Este método de pago ya está asociado a la organización." };
    }

    // Get the highest current order for this organization
    const highestOrder = await prisma.organizationPaymentMethod.findFirst({
      where: { organizationId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    // Create the association
    await prisma.organizationPaymentMethod.create({
      data: {
        organizationId,
        methodId,
        isEnabled: true,
        order: (highestOrder?.order || -1) + 1,
      },
    });

    revalidatePath("/configuration");
    return { success: true, message: "Método de pago asociado correctamente." };
  } catch (error: any) {
    console.error("Error associating payment method:", error);
    return {
      success: false,
      error:
        "No se pudo asociar el método de pago. Es posible que la tabla no exista todavía o que haya un problema con la conexión.",
    };
  }
}

// Remove a payment method from an organization
export async function removePaymentMethod(
  organizationId: string,
  organizationMethodId: number,
): Promise<ActionState> {
  try {
    // This will throw an error if the table doesn't exist yet
    await prisma.organizationPaymentMethod.delete({
      where: { id: organizationMethodId },
    });

    revalidatePath("/configuration");
    return { success: true, message: "Método de pago desasociado correctamente." };
  } catch (error: any) {
    console.error("Error removing payment method:", error);
    return {
      success: false,
      error:
        "No se pudo eliminar el método de pago. Es posible que la tabla no exista todavía o que haya un problema con la conexión.",
    };
  }
}

// Update the order of payment methods for an organization
export async function updatePaymentMethodsOrder(
  organizationId: string,
  orderData: { id: number; order: number }[],
): Promise<ActionState> {
  try {
    // This will throw an error if the table doesn't exist yet
    await prisma.$transaction(
      orderData.map((method) =>
        prisma.organizationPaymentMethod.update({
          where: { id: method.id },
          data: { order: method.order },
        }),
      ),
    );

    revalidatePath("/configuration");
    return { success: true, message: "Orden de métodos de pago actualizado correctamente." };
  } catch (error: any) {
    console.error("Error updating payment methods order:", error);
    return {
      success: false,
      error:
        "No se pudo actualizar el orden de los métodos de pago. Es posible que la tabla no exista todavía o que haya un problema con la conexión.",
    };
  }
}

"use server";

import { PrismaClient } from "@prisma/client";
// import { getOrganizationIdFromSession } from './getOrganizationIdFromSession'; // No longer needed here if passed in input
import {
  type CreateCurrentAccountInput,
  createCurrentAccountSchema,
} from "../zod/current-account-schemas";

const prisma = new PrismaClient();

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ path: string; message: string }>;
}

export async function createCurrentAccountAction(
  input: CreateCurrentAccountInput,
): Promise<ActionResult<import("@prisma/client").CurrentAccount>> {
  console.log(
    "🔍 [createCurrentAccountAction] Iniciando creación con datos:",
    JSON.stringify(input, null, 2),
  );

  try {
    // organizationId is now part of the input and validated by createCurrentAccountSchema
    const validatedData = createCurrentAccountSchema.safeParse(input);

    if (!validatedData.success) {
      console.error(
        "❌ [createCurrentAccountAction] Error en la validación del esquema:",
        validatedData.error,
      );
      return {
        success: false,
        error: "Validation failed.",
        errors: validatedData.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      };
    }

    console.log("✅ [createCurrentAccountAction] Validación de esquema exitosa");

    // validatedData.data now contains organizationId as per the schema
    const {
      clientId,
      motorcycleId, // Changed from modelId
      totalAmount,
      downPayment,
      numberOfInstallments,
      installmentAmount,
      paymentFrequency,
      startDate,
      reminderLeadTimeDays,
      status,
      notes,
      organizationId,
    } = validatedData.data;

    console.log("🔍 [createCurrentAccountAction] Datos extraídos:", {
      clientId,
      motorcycleId,
      organizationId,
      totalAmount,
      downPayment,
    });

    // Calculate remainingAmount
    const remainingAmount = totalAmount - downPayment;
    if (remainingAmount < 0) {
      console.error(
        "❌ [createCurrentAccountAction] Error: el pago inicial es mayor que el monto total",
      );
      return { success: false, error: "El pago inicial no puede ser mayor que el monto total." };
    }

    // The helper function calculatePaymentDates might need to be reviewed if it was using modelId indirectly
    // For now, assuming it's okay or will be handled.
    const parsedStartDate = new Date(startDate);
    // const { nextDueDate, finalPaymentDate } = calculatePaymentDates(parsedStartDate, numberOfInstallments, paymentFrequency);
    // We are now setting nextDueDate and endDate directly in the schema or later logic, ensure this is consistent.

    const dataForPrisma = {
      clientId,
      motorcycleId,
      totalAmount,
      downPayment,
      remainingAmount, // Added remainingAmount
      numberOfInstallments,
      installmentAmount,
      paymentFrequency,
      startDate: parsedStartDate,
      // nextDueDate, // Let Prisma handle default or set explicitly if calculated
      // finalPaymentDate, // Let Prisma handle default or set explicitly if calculated
      reminderLeadTimeDays,
      status: status || "ACTIVE",
      notes,
      organizationId,
    };

    console.log("🔍 [createCurrentAccountAction] Datos preparados para Prisma:", dataForPrisma);

    // The client and motorcycle existence checks should be here before calling create.
    console.log("🔍 [createCurrentAccountAction] Verificando existencia del cliente:", clientId);
    const clientExists = await prisma.client.findUnique({ where: { id: clientId } });
    if (!clientExists) {
      console.error("❌ [createCurrentAccountAction] Cliente no encontrado:", clientId);
      return { success: false, error: "El cliente especificado no existe." };
    }
    console.log(
      "✅ [createCurrentAccountAction] Cliente encontrado:",
      clientExists.firstName,
      clientExists.lastName,
    );

    console.log(
      "🔍 [createCurrentAccountAction] Verificando existencia de la motocicleta:",
      motorcycleId,
    );
    const motorcycleExists = await prisma.motorcycle.findUnique({ where: { id: motorcycleId } });
    if (!motorcycleExists) {
      console.error("❌ [createCurrentAccountAction] Motocicleta no encontrada:", motorcycleId);
      return { success: false, error: "La motocicleta especificada no existe." };
    }
    console.log(
      "✅ [createCurrentAccountAction] Motocicleta encontrada:",
      motorcycleExists.id,
      motorcycleExists.chassisNumber,
    );

    console.log(
      "🔍 [createCurrentAccountAction] Intentando crear cuenta corriente en la base de datos",
    );
    const currentAccount = await prisma.currentAccount.create({
      data: dataForPrisma,
    });

    console.log(
      "✅ [createCurrentAccountAction] Cuenta corriente creada exitosamente:",
      currentAccount.id,
    );
    return {
      success: true,
      data: currentAccount,
    };
  } catch (error) {
    console.error("❌ [createCurrentAccountAction] Error creating current account:", error);

    if (error instanceof Error) {
      console.error("❌ [createCurrentAccountAction] Error detallado:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    let errorMessage = "Failed to create current account due to an unexpected error.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

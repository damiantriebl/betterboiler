"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { PettyCashWithdrawal, PettyCashDepositStatus } from "@prisma/client";
import { z } from "zod";
import type { CreatePettyCashWithdrawalState } from "@/types/action-states"; // Importar el tipo de estado global
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";

// Esquema Zod para la validación de FormData
const formDataWithdrawalSchema = z.object({
  depositId: z.string().cuid("ID de depósito inválido.").optional(), // Opcional, la lógica puede buscar un depósito activo
  userId: z.string().min(1, "El ID de usuario es requerido."), // Asumo que esto vendrá de algún lugar (ej. usuario logueado o selección)
  userName: z.string().min(1, "El nombre de usuario es requerido."), // Asumo que esto vendrá de algún lugar
  amountGiven: z.preprocess(
    (a) => Number.parseFloat(z.string().parse(a)),
    z.number().positive("El monto entregado debe ser positivo."),
  ),
  date: z.preprocess(
    (d) => new Date(z.string().parse(d)), // Asumimos que la fecha vendrá como string YYYY-MM-DD
    z.date(),
  ),
  description: z.string().optional().nullable(), // Añadido para consistencia, puede que no se use directamente pero es común
  organizationId: z.string().cuid("ID de organización desde formulario inválido.").optional(),
});

const initialState: CreatePettyCashWithdrawalState = {
  status: "idle",
  message: "",
  errors: {},
};

export async function createPettyCashWithdrawal(
  prevState: CreatePettyCashWithdrawalState,
  formData: FormData,
): Promise<CreatePettyCashWithdrawalState> {
  const organizationIdFromForm = formData.get("organizationId") as string | null;
  const org = await getOrganizationIdFromSession();
  const organizationIdFromSession = org.organizationId;

  let effectiveOrganizationId: string | null = null;

  if (organizationIdFromForm) {
    effectiveOrganizationId = organizationIdFromForm;
    // Opcional: advertir si hay discrepancia con la sesión
    if (organizationIdFromSession && organizationIdFromForm !== organizationIdFromSession) {
        console.warn("Discrepancia de Organization ID en createPettyCashWithdrawal: Formulario vs Sesión", {form: organizationIdFromForm, session: organizationIdFromSession });
    }
  } else if (organizationIdFromSession) {
    effectiveOrganizationId = organizationIdFromSession;
  }

  if (!effectiveOrganizationId) {
    return {
      ...initialState,
      status: "error",
      message: "ID de Organización no encontrado (ni en formulario ni en sesión).",
      errors: { _form: ["ID de Organización no encontrado."] },
    };
  }
  
  const finalOrganizationId = effectiveOrganizationId;

  const validatedFields = formDataWithdrawalSchema.safeParse({
    depositId: formData.get("depositId") || undefined, // Zod trata null y undefined diferente para .optional()
    userId: formData.get("userId"), // Estos vendrán del formulario
    userName: formData.get("userName"), // Estos vendrán del formulario
    amountGiven: formData.get("amountGiven"),
    date: formData.get("date"),
    description: formData.get("description"),
    organizationId: finalOrganizationId,
  });

  if (!validatedFields.success) {
    return {
      ...initialState,
      status: "error",
      message: "Validación fallida. Por favor revisa los campos.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { depositId, userId, userName, amountGiven, date, description } = validatedFields.data;

  try {
    let targetDeposit = null;
    if (depositId) {
      targetDeposit = await prisma.pettyCashDeposit.findFirst({
        where: { id: depositId, organizationId: finalOrganizationId },
      });
    } else {
      targetDeposit = await prisma.pettyCashDeposit.findFirst({
        where: { organizationId: finalOrganizationId, status: "OPEN" },
        orderBy: { date: "desc" },
      });
    }

    if (!targetDeposit) {
      return {
        ...initialState,
        status: "error",
        message: "No se encontró un depósito activo o válido para este retiro.",
        errors: { depositId: ["Depósito no encontrado o no válido."] },
      };
    }

    if (targetDeposit.status !== "OPEN") {
      return {
        ...initialState,
        status: "error",
        message: "El depósito seleccionado no está abierto.",
        errors: { depositId: ["El depósito no está abierto."] },
      };
    }

    const existingWithdrawals = await prisma.pettyCashWithdrawal.aggregate({
      where: { depositId: targetDeposit.id },
      _sum: { amountGiven: true },
    });
    const totalPreviouslyWithdrawn = existingWithdrawals._sum.amountGiven || 0;
    const availableAmount = targetDeposit.amount - totalPreviouslyWithdrawn;

    if (availableAmount < amountGiven) {
      return {
        ...initialState,
        status: "error",
        message: `Fondos insuficientes en el depósito. Disponible: ${availableAmount.toFixed(2)}. Solicitado: ${amountGiven.toFixed(2)}`,
        errors: { amountGiven: [`Fondos insuficientes. Disponible: ${availableAmount.toFixed(2)}`] },
      };
    }

    const newWithdrawal = await prisma.$transaction(async (tx) => {
      const createdWithdrawal = await tx.pettyCashWithdrawal.create({
        data: {
          organizationId: finalOrganizationId,
          depositId: targetDeposit?.id,
          userId,
          userName,
          amountGiven,
          date,
          status: "PENDING_JUSTIFICATION",
        },
      });

      const totalWithdrawalsAfterCurrent = await tx.pettyCashWithdrawal.aggregate({
        where: { depositId: targetDeposit?.id },
        _sum: { amountGiven: true },
      });
      const newTotalWithdrawn = totalWithdrawalsAfterCurrent._sum.amountGiven || 0;
      
      let newDepositStatus: PettyCashDepositStatus = targetDeposit?.status as PettyCashDepositStatus;
      if (newTotalWithdrawn >= (targetDeposit?.amount ?? Number.POSITIVE_INFINITY)) {
        newDepositStatus = "CLOSED";
      }

      if (newDepositStatus !== targetDeposit?.status) {
        await tx.pettyCashDeposit.update({
          where: { id: targetDeposit?.id },
          data: { status: newDepositStatus },
        });
      }
      
      return createdWithdrawal;
    });

    revalidatePath("/(app)/petty-cash", "page");
    return {
      ...initialState,
      status: "success",
      message: "Retiro creado exitosamente.",
      // data: newWithdrawal, // El tipo CreatePettyCashWithdrawalState no define data
    };

  } catch (error) {
    console.error("Error creating petty cash withdrawal:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al crear el retiro.";
    return {
      ...initialState,
      status: "error",
      message: errorMessage,
      errors: { _form: [errorMessage] },
    };
  }
} 
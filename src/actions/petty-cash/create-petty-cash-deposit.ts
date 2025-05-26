"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CreatePettyCashDepositState } from "@/types/action-states";
import { getOrganizationIdFromSession } from "../util";

const initialState: CreatePettyCashDepositState = {
  status: "idle",
  message: "",
  errors: {},
};

const GENERAL_ACCOUNT_VALUE = "__general__"; // Make sure this is defined or imported if used

const formDataSchema = z.object({
  description: z.string().min(1, "La descripción es requerida."),
  amount: z.preprocess(
    (a) =>
      Number.parseFloat(z.string({ required_error: "El monto es requerido." }).trim().parse(a)),
    z
      .number({ invalid_type_error: "El monto debe ser un número." })
      .positive("El monto debe ser positivo."),
  ),
  date: z.preprocess(
    (d) => {
      const parsedDate = new Date(
        z.string({ required_error: "La fecha es requerida." }).trim().parse(d),
      );
      // Check if the date is valid after parsing
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Fecha inválida.");
      }
      return parsedDate;
    },
    z.date({ invalid_type_error: "Formato de fecha inválido." }),
  ),
  reference: z.string().optional().nullable(),
  organizationId: z
    .string({ required_error: "ID de organización es requerido." })
    .cuid("ID de organización inválido."),
  branchId: z.string().optional().nullable(), // Added branchId to formData schema
});

export async function createPettyCashDeposit(
  prevState: CreatePettyCashDepositState,
  formData: FormData,
): Promise<CreatePettyCashDepositState> {
  const organizationIdFromForm = formData.get("organizationId") as string | null;
  const org = await getOrganizationIdFromSession();
  const organizationIdFromSession = org.organizationId;

  const effectiveOrganizationId: string | null =
    organizationIdFromForm || organizationIdFromSession;

  if (!effectiveOrganizationId) {
    return {
      ...initialState,
      status: "error",
      message: "ID de Organización no encontrado.",
      errors: { _form: ["ID de Organización no encontrado."] },
    };
  }

  const finalOrganizationId = effectiveOrganizationId;

  const rawFormData = {
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    reference: formData.get("reference"),
    organizationId: finalOrganizationId,
    branchId: formData.get("branchId"), // Get branchId from FormData
  };

  const validatedFields = formDataSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      ...initialState,
      status: "error",
      message: "Validación fallida. Por favor revisa los campos.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { description, amount, date, reference, branchId: rawBranchId } = validatedFields.data; // Destructure rawBranchId

  let branchIdForDb: number | null = null;
  if (rawBranchId && rawBranchId !== GENERAL_ACCOUNT_VALUE) {
    const parsedBranchId = Number.parseInt(rawBranchId, 10);
    if (!Number.isNaN(parsedBranchId)) {
      branchIdForDb = parsedBranchId;
    } else {
      // Handle error: branchId is present but not a valid number and not GENERAL_ACCOUNT_VALUE
      return {
        ...initialState,
        status: "error",
        message: "ID de sucursal inválido.",
        errors: { branchId: ["ID de sucursal inválido."] },
      };
    }
  } // If rawBranchId is GENERAL_ACCOUNT_VALUE or null/undefined, branchIdForDb remains null

  try {
    await prisma.pettyCashDeposit.create({
      data: {
        organizationId: finalOrganizationId,
        description,
        amount,
        date,
        reference: reference ?? undefined,
        status: "OPEN",
        branchId: branchIdForDb, // Use processed branchIdForDb
      },
    });

    revalidatePath("/(app)/petty-cash", "page");
    return {
      ...initialState,
      status: "success",
      message: "Depósito creado exitosamente.",
    };
  } catch (error: unknown) {
    console.error("Error creating petty cash deposit:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido al crear el depósito.";
    return {
      ...initialState,
      status: "error",
      message: errorMessage,
      errors: { _form: [errorMessage] },
    };
  }
}

// Función para generar color pastel (la moveremos luego a utils)
// Esta función la tenías en tu page.tsx original.
// Si la quieres usar, asegúrate que esté disponible o impórtala de un utils.
// const getRandomPastelColor = (): string => {
//     const h = Math.floor(Math.random() * 360);
//     const s = Math.floor(Math.random() * 20) + 70; // Saturación entre 70-90%
//     const l = Math.floor(Math.random() * 10) + 85; // Luminosidad entre 85-95%
//     return `hsl(${h}, ${s}%, ${l}%)`;
// };

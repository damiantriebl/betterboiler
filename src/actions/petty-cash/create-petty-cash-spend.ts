"use server";

import prisma from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3-unified"; // Usar la nueva función
import type { CreatePettyCashSpendState } from "@/types/action-states"; // Import global state type
import type { CreatePettyCashSpendInput } from "@/zod/PettyCashZod";
import type {
  PettyCashDepositStatus,
  PettyCashSpend,
  PettyCashWithdrawal,
  PettyCashWithdrawalStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizationIdFromSession } from "../util";

interface CreatePettyCashSpendResult {
  data?: PettyCashSpend;
  error?: string;
  fieldErrors?: Partial<Record<keyof CreatePettyCashSpendInput, string[]>>;
}

// Define initial state according to the global type
const initialStateGlobal: CreatePettyCashSpendState = {
  status: "idle",
  message: "",
  errors: {},
};

const formDataSchema = z.object({
  withdrawalId: z.string().cuid("ID de retiro inválido."),
  organizationId: z.string().cuid("ID de organización inválido."), // Added organizationId
  motive: z.string().min(1, "El motivo es requerido."), // Added motive
  description: z.string().max(255).optional().nullable(), // Description can be optional now
  amount: z.preprocess(
    (a) =>
      Number.parseFloat(z.string({ required_error: "El monto es requerido." }).trim().parse(a)),
    z
      .number({ invalid_type_error: "El monto debe ser un número." })
      .positive("El monto del gasto debe ser positivo."),
  ),
  date: z.preprocess(
    (d) => {
      const parsedDate = new Date(
        z.string({ required_error: "La fecha es requerida." }).trim().parse(d),
      );
      if (Number.isNaN(parsedDate.getTime())) throw new Error("Fecha inválida.");
      return parsedDate;
    },
    z.date({ invalid_type_error: "Formato de fecha inválido." }),
  ),
  // ticketFile is handled separately from FormData, not in this schema for Zod direct parse
});

export async function createPettyCashSpendWithTicket(
  prevState: CreatePettyCashSpendState, // Use global state type
  formData: FormData,
): Promise<CreatePettyCashSpendState> {
  // Use global state type

  const organizationIdFromForm = formData.get("organizationId") as string | null;

  const org = await getOrganizationIdFromSession();
  const organizationIdFromSession = org.organizationId;

  const effectiveOrganizationId: string | null =
    organizationIdFromForm || organizationIdFromSession;

  if (!effectiveOrganizationId) {
    return {
      ...initialStateGlobal,
      status: "error",
      message: "ID de Organización no encontrado.",
      errors: { _form: ["ID de Organización no encontrado."] },
    };
  }
  const finalOrganizationId = effectiveOrganizationId;

  const rawFormData = {
    withdrawalId: formData.get("withdrawalId"),
    organizationId: finalOrganizationId, // Use effective/final ID for validation
    motive: formData.get("motive"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  };

  const validatedFields = formDataSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      ...initialStateGlobal,
      status: "error",
      message: "Validación fallida. Por favor revisa los campos.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // If motive is 'otros', description becomes mandatory at this stage if not handled by client Zod refine
  if (
    validatedFields.data.motive === "otros" &&
    (!validatedFields.data.description || validatedFields.data.description.trim() === "")
  ) {
    return {
      ...initialStateGlobal,
      status: "error",
      message: "La descripción es requerida cuando el motivo es 'Otros'.",
      errors: { description: ["La descripción es requerida cuando el motivo es 'Otros'."] },
    };
  }

  const { withdrawalId, motive, description, amount, date } = validatedFields.data;
  const ticketFile = formData.get("ticketFile") as File | null;

  let ticketUrl: string | undefined = undefined;
  if (ticketFile && ticketFile.size > 0) {
    if (!["image/jpeg", "image/png", "application/pdf"].includes(ticketFile.type)) {
      return {
        ...initialStateGlobal,
        status: "error",
        message: "Tipo de archivo no soportado.",
        errors: { ticketFile: ["Solo se permiten JPG, PNG o PDF."] },
      };
    }

    try {
      const s3Key = `uploads/tickets/petty-cash/${finalOrganizationId}/${withdrawalId}/${Date.now()}-${ticketFile.name.replace(/\s+/g, "_")}`;
      const arrayBuffer = await ticketFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await uploadToS3(buffer, s3Key, ticketFile.type);
      if (uploadResult.success) {
        ticketUrl = uploadResult.url;
      } else {
        throw new Error(uploadResult.error);
      }
    } catch (error) {
      console.error("Error al procesar o subir archivo a S3:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido al subir el archivo.";
      return {
        ...initialStateGlobal,
        status: "error",
        message: `Error al subir el comprobante: ${errorMessage}`,
        errors: { ticketFile: [`Error al subir el comprobante: ${errorMessage}`] },
      };
    }
  } else {
    // Example: If ticket is mandatory unless motive is 'combustible'
    // if (motive !== 'combustible') {
    //   return {
    //     ...initialStateGlobal,
    //     status: "error",
    //     message: "El comprobante es obligatorio para este motivo.",
    //     errors: { ticketFile: ["Por favor, sube un comprobante."] },
    //   };
    // }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const targetWithdrawal = await tx.pettyCashWithdrawal.findUnique({
        where: { id: withdrawalId, organizationId: finalOrganizationId }, // Ensure spend is for the correct org
        include: { deposit: true },
      });

      if (!targetWithdrawal) {
        throw new Error("Retiro no encontrado o no pertenece a la organización.");
      }
      if (targetWithdrawal.status === "JUSTIFIED") {
        throw new Error("Este retiro ya ha sido completamente justificado.");
      }

      await tx.pettyCashSpend.create({
        data: {
          organizationId: finalOrganizationId,
          withdrawalId,
          motive, // Added motive
          description: description || (motive !== "otros" ? motive : "Otros"), // Use motive as desc if desc is empty and motive is not 'otros'
          amount,
          date,
          ticketUrl,
        },
      });

      const newAmountJustified = targetWithdrawal.amountJustified + amount;
      let newWithdrawalStatus: PettyCashWithdrawalStatus = targetWithdrawal.status;

      if (newAmountJustified > targetWithdrawal.amountGiven) {
        throw new Error("El monto justificado excede el monto entregado en el retiro.");
      }

      if (newAmountJustified === targetWithdrawal.amountGiven) {
        newWithdrawalStatus = "JUSTIFIED";
      } else if (newAmountJustified > 0) {
        newWithdrawalStatus = "PARTIALLY_JUSTIFIED";
      }

      await tx.pettyCashWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          amountJustified: newAmountJustified,
          status: newWithdrawalStatus,
        },
      });

      const deposit = targetWithdrawal.deposit;
      if (newWithdrawalStatus === "JUSTIFIED" && deposit.status === "OPEN") {
        const withdrawalsOfDeposit = await tx.pettyCashWithdrawal.findMany({
          where: { depositId: deposit.id },
        });

        const allWithdrawalsJustified = withdrawalsOfDeposit.every((w) => w.status === "JUSTIFIED");
        const totalWithdrawnFromDeposit = withdrawalsOfDeposit.reduce(
          (sum, w) => sum + w.amountGiven,
          0,
        );

        if (allWithdrawalsJustified && totalWithdrawnFromDeposit >= deposit.amount) {
          await tx.pettyCashDeposit.update({
            where: { id: deposit.id },
            data: { status: "CLOSED" },
          });
        }
      }
      // Removed return newSpend; as it's not used with this state structure
    });

    revalidatePath("/(app)/petty-cash", "page");
    return {
      ...initialStateGlobal,
      status: "success",
      message: "Gasto creado exitosamente.",
    };
  } catch (error: unknown) {
    console.error("Error creating petty cash spend:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido al crear el gasto.";
    return {
      ...initialStateGlobal,
      status: "error",
      message: errorMessage,
      errors: { _form: [errorMessage] },
    };
  }
}

// Eliminar o comentar la función original si esta la reemplaza completamente
/*
export async function createPettyCashSpend(
  input: CreatePettyCashSpendInput,
): Promise<CreatePettyCashSpendResult> {
  // ...código original...
}
*/

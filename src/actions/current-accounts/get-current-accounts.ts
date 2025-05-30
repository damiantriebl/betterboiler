"use server";

import db from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";
// Import Prisma namespace along with types
import {
  type Brand,
  type Client,
  type CurrentAccount,
  type Model,
  type Motorcycle,
  type Payment,
  Prisma,
  type CurrentAccountStatus as PrismaCurrentAccountStatus,
  type PaymentFrequency as PrismaPaymentFrequency,
} from "@prisma/client";

// Define a more specific type for the returned accounts, including relations
export type CurrentAccountWithDetails = CurrentAccount & {
  client: Pick<Client, "id" | "firstName" | "lastName">;
  motorcycle?: Motorcycle & {
    // Motorcycle is now optional if relation can be null
    model: Pick<Model, "id" | "name">; // Model is nested within Motorcycle
    brand: Pick<Brand, "id" | "name">; // Brand is nested within Motorcycle
  };
  // Include payments to show paid installments
  payments: Payment[];
};

interface GetCurrentAccountsOptions {
  page?: number;
  pageSize?: number;
  status?: PrismaCurrentAccountStatus; // Use imported Prisma enum
  clientId?: string;
}

// Define the return type using ActionState's generic parameter
type GetCurrentAccountsResult = ActionState<CurrentAccountWithDetails[]> & {
  totalCount?: number;
};

// We use Prisma's enum directly, so local enum definition is not needed if Prisma types are imported.
// enum CurrentAccountStatus {
//   ACTIVE = 'ACTIVE',
//   PAID_OFF = 'PAID_OFF',
//   OVERDUE = 'OVERDUE',
//   DEFAULTED = 'DEFAULTED',
//   CANCELLED = 'CANCELLED',
// }

export async function getCurrentAccounts(
  options: GetCurrentAccountsOptions = {},
): Promise<GetCurrentAccountsResult> {
  const { page = 1, pageSize = 10, status, clientId } = options;

  try {
    const whereClause: Prisma.CurrentAccountWhereInput = {}; // Use Prisma type for whereClause
    if (status) {
      whereClause.status = status;
    }
    if (clientId) {
      whereClause.clientId = clientId;
    }

    const totalCount = await db.currentAccount.count({
      where: whereClause,
    });

    const accounts = await db.currentAccount.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        motorcycle: {
          // Changed from model to motorcycle
          include: {
            model: {
              // Include the model related to the motorcycle
              select: { id: true, name: true },
            },
            brand: {
              select: { id: true, name: true },
            },
          },
        },
        payments: true, // Include payments to track which installments are paid
        // organization: true, // Optionally include organization if needed
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: accounts,
      totalCount,
    };
  } catch (error) {
    console.error("Error fetching current accounts:", error);
    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        success: false,
        error: `Error de validación de Prisma al obtener cuentas corrientes: ${error.message}`,
      };
    }
    // Handle generic errors
    let errorMessage = "Error desconocido al obtener las cuentas corrientes.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

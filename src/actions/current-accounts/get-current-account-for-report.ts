"use server";

import db from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Define a comprehensive type for the report data based on Prisma query
export type CurrentAccountForReport = Prisma.CurrentAccountGetPayload<{
  include: {
    client: true;
    motorcycle: {
      include: {
        model: true;
        brand: true;
        color: true;
        branch: true;
        seller: true; // Include seller details
      };
    };
    payments: {
      orderBy: {
        paymentDate: "asc"; // Order payments, might be useful for display
      };
    };
    organization: true; // Might be useful for report headers
  };
}>;

export async function getCurrentAccountForReport(
  accountId: string,
): Promise<CurrentAccountForReport | null> {
  if (!accountId) {
    console.error("[getCurrentAccountForReport] Account ID is required.");
    return null;
  }

  try {
    const account = await db.currentAccount.findUnique({
      where: { id: accountId },
      include: {
        client: true,
        motorcycle: {
          include: {
            model: true,
            brand: true,
            color: true,
            branch: true,
            seller: true, // Fetch seller
          },
        },
        payments: {
          orderBy: {
            // It's good practice to order related records
            paymentDate: "asc",
          },
        },
        organization: true,
      },
    });

    if (!account) {
      console.warn(`[getCurrentAccountForReport] Account not found for ID: ${accountId}`);
      return null;
    }

    return account;
  } catch (error) {
    console.error(
      `[getCurrentAccountForReport] Error fetching account for ID ${accountId}:`,
      error,
    );
    return null;
  }
}

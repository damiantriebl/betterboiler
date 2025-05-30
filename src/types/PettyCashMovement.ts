import type { Decimal } from "@prisma/client/runtime/library";

export interface PettyCashMovement {
  id: string;
  accountId: string;
  userId: string;
  type: "DEBE" | "HABER";
  amount: Decimal;
  description: string;
  ticketNumber?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

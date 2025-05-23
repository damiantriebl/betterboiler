export interface PettyCashAccount {
  id: string;
  organizationId: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashMovement {
  id: string;
  accountId: string;
  userId: string;
  type: "DEBE" | "HABER";
  amount: number;
  description?: string;
  ticketNumber?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  profileOriginal?: string | null;
  profileCrop?: string | null;
}

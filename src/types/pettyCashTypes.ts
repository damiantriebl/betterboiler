export interface Spend {
  id: string;
  description: string;
  amount: number;
  ticketUrl?: string;
  createdAt: Date;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  amountGiven: number;
  amountJustified: number;
  status: "pending" | "justified" | "partially_justified" | "not_closed";
  spends: Spend[];
  createdAt: Date;
}

export interface Deposit {
  id: string;
  depositAmount: number;
  remainingAmount: number;
  status: "open" | "closed" | "pending_funding";
  createdAt: Date;
  color: string;
  withdrawals: Withdrawal[];
} 
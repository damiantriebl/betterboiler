// src/types/action-states.ts
import type { Brand, Model } from "@prisma/client";

// General state for actions that might return data or just success/error
export type ActionState<TData = null> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: TData;
};

// Specific state for creating a brand (might not need extra data)
export type CreateBrandState = ActionState;

// State for updating a brand (might return the updated brand)
export type UpdateBrandState = ActionState<Brand>;

// State for creating a model (might return the new model)
export type CreateModelState = ActionState<Model>;

// State for updating a model (might return the updated model)
export type UpdateModelState = ActionState<Model>;

// State for actions operating on multiple items (like reordering)
export type BatchActionState = ActionState;

export type CreatePettyCashDepositState = {
  message?: string;
  errors?: {
    amount?: string[];
    description?: string[];
    organizationId?: string[];
    branchId?: string[];
    date?: string[];
    reference?: string[];
    _form?: string[];
  };
  status: "success" | "error" | "idle";
};

export type CreatePettyCashWithdrawalState = {
  message?: string;
  errors?: {
    depositId?: string[];
    amountGiven?: string[];
    description?: string[];
    organizationId?: string[];
    _form?: string[];
  };
  status: "success" | "error" | "idle";
};

export type CreatePettyCashSpendState = {
  message?: string;
  errors?: {
    withdrawalId?: string[];
    amount?: string[];
    description?: string[];
    ticketFile?: string[];
    organizationId?: string[];
    _form?: string[];
  };
  status: "success" | "error" | "idle";
};

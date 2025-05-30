import type { MotorcycleTransferWithRelations } from "@/types/logistics";
import { useState } from "react";

export function useTransferUpdates(initialTransfers: MotorcycleTransferWithRelations[]) {
  const [transfers, setTransfers] = useState(initialTransfers);

  const removeTransfer = (transferId: number) => {
    setTransfers((prev) => prev.filter((transfer) => transfer.id !== transferId));
  };

  const addTransfer = (transfer: MotorcycleTransferWithRelations) => {
    setTransfers((prev) => [...prev, transfer]);
  };

  const updateTransfer = (
    transferId: number,
    updates: Partial<MotorcycleTransferWithRelations>,
  ) => {
    setTransfers((prev) =>
      prev.map((transfer) => (transfer.id === transferId ? { ...transfer, ...updates } : transfer)),
    );
  };

  const refreshTransfers = (newTransfers: MotorcycleTransferWithRelations[]) => {
    setTransfers(newTransfers);
  };

  return {
    transfers,
    removeTransfer,
    addTransfer,
    updateTransfer,
    refreshTransfers,
  };
}

import type { MotorcycleForTransfer } from "@/types/logistics";
import { useState } from "react";

export function useMotorcycleUpdates(initialMotorcycles: MotorcycleForTransfer[]) {
  const [motorcycles, setMotorcycles] = useState(initialMotorcycles);

  const removeMotorcycle = (motorcycleId: number) => {
    setMotorcycles((prev) => prev.filter((motorcycle) => motorcycle.id !== motorcycleId));
  };

  const addMotorcycle = (motorcycle: MotorcycleForTransfer) => {
    setMotorcycles((prev) => [...prev, motorcycle]);
  };

  const updateMotorcycle = (motorcycleId: number, updates: Partial<MotorcycleForTransfer>) => {
    setMotorcycles((prev) =>
      prev.map((motorcycle) =>
        motorcycle.id === motorcycleId ? { ...motorcycle, ...updates } : motorcycle,
      ),
    );
  };

  const refreshMotorcycles = (newMotorcycles: MotorcycleForTransfer[]) => {
    setMotorcycles(newMotorcycles);
  };

  const removeMultipleMotorcycles = (motorcycleIds: number[]) => {
    setMotorcycles((prev) => prev.filter((motorcycle) => !motorcycleIds.includes(motorcycle.id)));
  };

  return {
    motorcycles,
    removeMotorcycle,
    addMotorcycle,
    updateMotorcycle,
    refreshMotorcycles,
    removeMultipleMotorcycles,
  };
}

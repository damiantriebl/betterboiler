import type { PettyCashMovement } from "@/types/pettyCash";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface PettyCashState {
  movements: PettyCashMovement[];
  balance: number;
  setMovements: (data: PettyCashMovement[]) => void;
  setBalance: (balance: number) => void;
}

export const usePettyCash = create<PettyCashState>()(
  devtools(
    persist(
      (set) => ({
        movements: [],
        balance: 0,
        setMovements: (data) => set({ movements: data }),
        setBalance: (balance) => set({ balance }),
      }),
      { name: "petty-cash" },
    ),
  ),
);

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { PettyCashMovement } from "@/types/pettyCash";

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
      { name: "petty-cash" }
    )
  )
);
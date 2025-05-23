"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface SessionState {
  // Datos de organización
  organizationName: string | null;
  organizationLogo: string | null;
  organizationId: string | null;

  // Datos de usuario
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  userRole: string | null;

  // Acciones
  setSession: (data: Partial<Omit<SessionState, "setSession" | "clearSession">>) => void;
  clearSession: () => void;
}

// Estado inicial sin las funciones
const initialState = {
  // Datos de organización
  organizationName: null,
  organizationLogo: null,
  organizationId: null,

  // Datos de usuario
  userId: null,
  userName: null,
  userEmail: null,
  userImage: null,
  userRole: null,
};

export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setSession: (data) => set((state) => ({ ...state, ...data }), false, "setSession"),
        clearSession: () => set(() => ({ ...initialState }), false, "clearSession"),
      }),
      { name: "session-store" },
    ),
    { name: "SessionStore" },
  ),
);

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface SessionState {
  organizationName: string | null;
  organizationLogo: string | null;
  organizationThumbnail: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  setSession: (data: Partial<SessionState>) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set) => ({
        organizationName: null,
        organizationLogo: null,
        organizationThumbnail: null,
        userName: null,
        userEmail: null,
        userImage: null,
        setSession: (data) => set((state) => ({ ...state, ...data }), false, "setSession"),
        clearSession: () =>
          set(
            {
              organizationName: null,
              organizationLogo: null,
              organizationThumbnail: null,
              userName: null,
              userEmail: null,
              userImage: null,
            },
            false,
            "clearSession",
          ),
      }),
      { name: "session-store" },
    ),
    { name: "SessionStore" },
  ),
);

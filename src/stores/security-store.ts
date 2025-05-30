import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface SecurityState {
  // Estado del modo seguro
  secureMode: boolean;

  // Acciones
  setSecureMode: (enabled: boolean) => void;
  toggleSecureMode: () => void;

  // Helper para verificar si una acción requiere OTP
  requiresOtp: (action: string) => boolean;
}

// Lista de acciones que requieren OTP en modo seguro
const OTP_REQUIRED_ACTIONS = [
  "VENDIDO_TO_STOCK", // Transición crítica de vendido a stock
  "ELIMINADO_TO_STOCK", // Transición crítica de eliminado a stock
  "DELETE_MOTORCYCLE", // Eliminar motocicleta permanentemente (si implementas esta funcionalidad)
  "BULK_DELETE", // Eliminación masiva
  "UNDO_PAYMENT", // Anulación de pagos en cuentas corrientes
  // Puedes agregar más acciones críticas aquí
];

export const useSecurityStore = create<SecurityState>()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        secureMode: false,

        // Acciones
        setSecureMode: (enabled: boolean) => {
          console.log("[SecurityStore] Actualizando modo seguro a:", enabled);
          set({ secureMode: enabled });
        },

        toggleSecureMode: () => {
          const currentMode = get().secureMode;
          const newMode = !currentMode;
          console.log("[SecurityStore] Alternando modo seguro de", currentMode, "a", newMode);
          set({ secureMode: newMode });
        },

        // Helper para verificar si una acción requiere OTP
        requiresOtp: (action: string) => {
          const secureMode = get().secureMode;
          const actionRequiresOtp = OTP_REQUIRED_ACTIONS.includes(action);
          return secureMode && actionRequiresOtp;
        },
      }),
      {
        name: "security-settings", // Nombre en localStorage
        partialize: (state) => ({ secureMode: state.secureMode }), // Solo persistir el modo seguro
      },
    ),
    { name: "SecurityStore" },
  ),
);

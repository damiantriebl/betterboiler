import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Definir los modos de visualización
export type PriceDisplayMode = 'all' | 'retail-wholesale' | 'retail-only';

// Crear el store de precios
interface PriceDisplayState {
  // Estado
  mode: PriceDisplayMode;
  
  // Acciones
  setMode: (mode: PriceDisplayMode) => void;
  
  // Helpers para verificar el modo actual
  showCost: () => boolean;
  showWholesale: () => boolean;
  showRetail: () => boolean;
}

export const usePriceDisplayStore = create<PriceDisplayState>()(
  persist(
    (set, get) => ({
      // Estado inicial: mostrar todos los precios
      mode: 'all',
      
      // Acción para cambiar el modo
      setMode: (mode: PriceDisplayMode) => {
      //  console.log("[Store] Actualizando modo a:", mode);
        set({ mode });
      },
      
      // Helpers
      showCost: () => {
        const mode = get().mode;
        const shouldShow = mode === 'all';
      //  console.log("[Store] showCost:", shouldShow, "Modo:", mode);
        return shouldShow;
      },
      
      showWholesale: () => {
        const mode = get().mode;
        const shouldShow = mode === 'all' || mode === 'retail-wholesale';
       // console.log("[Store] showWholesale:", shouldShow, "Modo:", mode);
        return shouldShow;
      },
      
      showRetail: () => {
     //   console.log("[Store] showRetail: true (siempre)");
        return true; // Siempre se muestra el precio minorista
      },
    }),
    {
      name: 'price-display-settings', // Nombre en localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ mode: state.mode }), // Solo guardar el modo en localStorage
      onRehydrateStorage: () => (state) => {
    //    console.log("[Store] Estado rehidratado:", state?.mode);
      },
    }
  )
); 
import { MotorcycleState } from "@prisma/client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Estados disponibles por defecto (motos que se pueden vender/gestionar)
// RESERVADO no se considera disponible para venta
export const estadosDisponibles: MotorcycleState[] = [
  MotorcycleState.STOCK,
  MotorcycleState.PAUSADO,
];

export const estadosVentaPrisma = Object.values(MotorcycleState);

// Tipo para los filtros
export interface MotorcycleFilters {
  search: string;
  marca: string;
  tipo: string;
  ubicacion: string;
  estadosVenta: MotorcycleState[];
  years: number[];
}

// Tipo para el store
interface MotorcycleFiltersStore {
  // Estado
  filters: MotorcycleFilters;

  // Datos auxiliares para los filtros
  availableYears: number[];
  availableBrands: string[];
  availableModels: string[];
  availableBranches: string[];

  // Estado de paginación
  currentPage: number;
  pageSize: number;

  // Estado de ordenamiento
  sortConfig: {
    key: string | null;
    direction: "asc" | "desc" | null;
  };

  // Acciones para filtros
  setSearch: (search: string) => void;
  setMarca: (marca: string) => void;
  setTipo: (tipo: string) => void;
  setUbicacion: (ubicacion: string) => void;
  setEstadosVenta: (estados: MotorcycleState[]) => void;
  setYears: (years: number[]) => void;

  // Acciones para datos auxiliares
  setAvailableYears: (years: number[]) => void;
  setAvailableBrands: (brands: string[]) => void;
  setAvailableModels: (models: string[]) => void;
  setAvailableBranches: (branches: string[]) => void;

  // Acciones para paginación
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Acciones para ordenamiento
  setSortConfig: (config: { key: string | null; direction: "asc" | "desc" | null }) => void;

  // Acciones de utilidad
  resetFilters: (initialStates?: MotorcycleState[]) => void;
  resetPagination: () => void;
  updateAuxiliaryData: (data: any[]) => void;
  initializeFromData: (data: any[]) => void;

  // Función para determinar texto del botón de estados
  getEstadoVentaButtonText: () => string;

  // Función para verificar si coincide con filtros predefinidos
  isAllAvailableStates: () => boolean;
  isAllStates: () => boolean;
}

// Filtros por defecto
const defaultFilters: MotorcycleFilters = {
  search: "",
  marca: "todas",
  tipo: "todos",
  ubicacion: "todas",
  estadosVenta: [...estadosDisponibles],
  years: [],
};

export const useMotorcycleFiltersStore = create<MotorcycleFiltersStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      filters: { ...defaultFilters },
      availableYears: [],
      availableBrands: [],
      availableModels: [],
      availableBranches: [],
      currentPage: 1,
      pageSize: 10,
      sortConfig: { key: null, direction: null },

      // Acciones para filtros
      setSearch: (search) => {
        set((state) => ({
          filters: { ...state.filters, search },
          currentPage: 1, // Reset página al filtrar
        }));
      },

      setMarca: (marca) => {
        set((state) => ({
          filters: { ...state.filters, marca },
          currentPage: 1,
        }));
      },

      setTipo: (tipo) => {
        set((state) => ({
          filters: { ...state.filters, tipo },
          currentPage: 1,
        }));
      },

      setUbicacion: (ubicacion) => {
        set((state) => ({
          filters: { ...state.filters, ubicacion },
          currentPage: 1,
        }));
      },

      setEstadosVenta: (estadosVenta) => {
        set((state) => ({
          filters: { ...state.filters, estadosVenta },
          currentPage: 1,
        }));
      },

      setYears: (years) => {
        set((state) => ({
          filters: { ...state.filters, years },
          currentPage: 1,
        }));
      },

      // Acciones para datos auxiliares
      setAvailableYears: (availableYears) => {
        set({ availableYears });
      },

      setAvailableBrands: (availableBrands) => {
        set({ availableBrands });
      },

      setAvailableModels: (availableModels) => {
        set({ availableModels });
      },

      setAvailableBranches: (availableBranches) => {
        set({ availableBranches });
      },

      // Acciones para paginación
      setCurrentPage: (currentPage) => {
        set({ currentPage });
      },

      setPageSize: (pageSize) => {
        set({ pageSize, currentPage: 1 });
      },

      // Acciones para ordenamiento
      setSortConfig: (sortConfig) => {
        set({ sortConfig, currentPage: 1 });
      },

      // Acciones de utilidad
      resetFilters: (initialStates = estadosDisponibles) => {
        set({
          filters: {
            ...defaultFilters,
            estadosVenta: [...initialStates],
          },
          currentPage: 1,
        });
      },

      resetPagination: () => {
        set({ currentPage: 1 });
      },

      // Función para actualizar solo datos auxiliares sin tocar filtros
      updateAuxiliaryData: (data) => {
        // Extraer datos únicos para los filtros
        const brands = [...new Set(data.map((m) => m.brand?.name).filter(Boolean))].sort();
        const models = [...new Set(data.map((m) => m.model?.name).filter(Boolean))].sort();
        const branches = [...new Set(data.map((m) => m.branch?.name).filter(Boolean))].sort();
        const years = [
          ...new Set(data.map((m) => m.year).filter((y) => typeof y === "number")),
        ].sort((a, b) => b - a);

        set({
          availableBrands: brands,
          availableModels: models,
          availableBranches: branches,
          availableYears: years,
        });
      },

      initializeFromData: (data) => {
        // Extraer datos únicos para los filtros
        const brands = [...new Set(data.map((m) => m.brand?.name).filter(Boolean))].sort();
        const models = [...new Set(data.map((m) => m.model?.name).filter(Boolean))].sort();
        const branches = [...new Set(data.map((m) => m.branch?.name).filter(Boolean))].sort();
        const years = [
          ...new Set(data.map((m) => m.year).filter((y) => typeof y === "number")),
        ].sort((a, b) => b - a);

        // Solo detectar estados iniciales si los filtros están en su estado por defecto
        const currentState = get();
        const isDefaultState =
          currentState.filters.search === "" &&
          currentState.filters.marca === "todas" &&
          currentState.filters.tipo === "todos" &&
          currentState.filters.ubicacion === "todas" &&
          currentState.filters.years.length === 0;

        let shouldUpdateStates = false;
        let initialStates = currentState.filters.estadosVenta;

        // Solo actualizar estados si estamos en estado por defecto Y los estados actuales coinciden con estadosDisponibles
        if (
          isDefaultState &&
          currentState.filters.estadosVenta.length === estadosDisponibles.length &&
          estadosDisponibles.every((estado) => currentState.filters.estadosVenta.includes(estado))
        ) {
          const uniqueStates = new Set(data.map((moto) => moto.state));

          if (
            uniqueStates.size <= estadosDisponibles.length &&
            Array.from(uniqueStates).every((state) => estadosDisponibles.includes(state))
          ) {
            initialStates = [...estadosDisponibles];
            shouldUpdateStates = true;
          } else {
            initialStates = Array.from(uniqueStates);
            shouldUpdateStates = true;
          }
        }

        set((state) => ({
          availableBrands: brands,
          availableModels: models,
          availableBranches: branches,
          availableYears: years,
          ...(shouldUpdateStates && {
            filters: {
              ...state.filters,
              estadosVenta: initialStates,
              years: [], // Reset años solo si estamos realmente inicializando
            },
          }),
        }));
      },

      // Función para determinar texto del botón de estados
      getEstadoVentaButtonText: () => {
        const { filters } = get();
        const selectedCount = filters.estadosVenta.length;
        const totalCount = estadosVentaPrisma.length;
        const availableCount = estadosDisponibles.length;

        // Verificar si coincide exactamente con "todos disponibles"
        const isAllAvailable =
          selectedCount === availableCount &&
          estadosDisponibles.every((estado) => filters.estadosVenta.includes(estado)) &&
          filters.estadosVenta.every((estado) => estadosDisponibles.includes(estado));

        // Verificar si coincide exactamente con "ver todo"
        const isAllStates = selectedCount === totalCount;

        if (isAllAvailable) {
          return "Ver todos disponibles";
        }

        if (isAllStates || selectedCount === 0) {
          return "Ver todo";
        }

        if (selectedCount === 1) {
          const estado = filters.estadosVenta[0];
          return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
        }

        return `${selectedCount} seleccionados`;
      },

      // Funciones de verificación
      isAllAvailableStates: () => {
        const { filters } = get();
        const selectedCount = filters.estadosVenta.length;
        const availableCount = estadosDisponibles.length;

        return (
          selectedCount === availableCount &&
          estadosDisponibles.every((estado) => filters.estadosVenta.includes(estado)) &&
          filters.estadosVenta.every((estado) => estadosDisponibles.includes(estado))
        );
      },

      isAllStates: () => {
        const { filters } = get();
        return filters.estadosVenta.length === estadosVentaPrisma.length;
      },
    }),
    {
      name: "motorcycle-filters-store",
    },
  ),
);

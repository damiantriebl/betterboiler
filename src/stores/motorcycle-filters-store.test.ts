import { MotorcycleState } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import {
  estadosDisponibles,
  estadosVentaPrisma,
  useMotorcycleFiltersStore,
} from "./motorcycle-filters-store";

// Mock data para pruebas
const mockMotorcycles = [
  {
    id: 1,
    state: MotorcycleState.STOCK,
    year: 2020,
    brand: { name: "Honda" },
    model: { name: "CBR600" },
    branch: { name: "Sucursal Central" },
  },
  {
    id: 2,
    state: MotorcycleState.RESERVADO,
    year: 2021,
    brand: { name: "Yamaha" },
    model: { name: "R1" },
    branch: { name: "Sucursal Norte" },
  },
  {
    id: 3,
    state: MotorcycleState.ELIMINADO,
    year: 2022,
    brand: { name: "Kawasaki" },
    model: { name: "Ninja" },
    branch: { name: "Sucursal Sur" },
  },
];

describe("MotorcycleFiltersStore", () => {
  beforeEach(() => {
    // Resetear el store antes de cada test
    const store = useMotorcycleFiltersStore.getState();
    store.resetFilters();

    // Limpiar también los datos auxiliares
    const { setState } = useMotorcycleFiltersStore;
    setState((prevState) => ({
      ...prevState,
      availableYears: [],
      availableBrands: [],
      availableModels: [],
      availableBranches: [],
      currentPage: 1,
      pageSize: 10,
      sortConfig: { key: null, direction: null },
    }));
  });

  it("should initialize with default filters", () => {
    const { filters, currentPage, pageSize } = useMotorcycleFiltersStore.getState();

    expect(filters.search).toBe("");
    expect(filters.marca).toBe("todas");
    expect(filters.tipo).toBe("todos");
    expect(filters.ubicacion).toBe("todas");
    expect(filters.estadosVenta).toEqual(estadosDisponibles);
    expect(filters.years).toEqual([]);
    expect(currentPage).toBe(1);
    expect(pageSize).toBe(10);
  });

  it("should update search filter and reset page", () => {
    const { setCurrentPage, setSearch } = useMotorcycleFiltersStore.getState();

    setCurrentPage(3);
    setSearch("Honda");

    const { filters, currentPage } = useMotorcycleFiltersStore.getState();
    expect(filters.search).toBe("Honda");
    expect(currentPage).toBe(1);
  });

  it("should update estados venta filter", () => {
    const { setEstadosVenta } = useMotorcycleFiltersStore.getState();
    const newStates = [MotorcycleState.STOCK, MotorcycleState.VENDIDO];

    setEstadosVenta(newStates);

    const { filters } = useMotorcycleFiltersStore.getState();
    expect(filters.estadosVenta).toEqual(newStates);
  });

  it("should initialize from data correctly", () => {
    const { initializeFromData } = useMotorcycleFiltersStore.getState();

    initializeFromData(mockMotorcycles);

    const { availableBrands, availableModels, availableBranches, availableYears } =
      useMotorcycleFiltersStore.getState();
    expect(availableBrands).toEqual(["Honda", "Kawasaki", "Yamaha"]);
    expect(availableModels).toEqual(["CBR600", "Ninja", "R1"]);
    expect(availableBranches).toEqual(["Sucursal Central", "Sucursal Norte", "Sucursal Sur"]);
    expect(availableYears).toEqual([2022, 2021, 2020]);
  });

  it("should determine correct button text for estados venta", () => {
    const { setEstadosVenta, getEstadoVentaButtonText } = useMotorcycleFiltersStore.getState();

    // Test "Ver todos disponibles"
    setEstadosVenta(estadosDisponibles);
    expect(getEstadoVentaButtonText()).toBe("Ver todos disponibles");

    // Test "Ver todo"
    setEstadosVenta(estadosVentaPrisma);
    expect(getEstadoVentaButtonText()).toBe("Ver todo");

    // Test single selection
    setEstadosVenta([MotorcycleState.STOCK]);
    expect(getEstadoVentaButtonText()).toBe("Stock");

    // Test multiple selection
    setEstadosVenta([MotorcycleState.STOCK, MotorcycleState.VENDIDO]);
    expect(getEstadoVentaButtonText()).toBe("2 seleccionados");
  });

  it("should check if all available states are selected", () => {
    const { setEstadosVenta, isAllAvailableStates } = useMotorcycleFiltersStore.getState();

    setEstadosVenta(estadosDisponibles);
    expect(isAllAvailableStates()).toBe(true);

    setEstadosVenta([MotorcycleState.STOCK]);
    expect(isAllAvailableStates()).toBe(false);
  });

  it("should check if all states are selected", () => {
    const { setEstadosVenta, isAllStates } = useMotorcycleFiltersStore.getState();

    setEstadosVenta(estadosVentaPrisma);
    expect(isAllStates()).toBe(true);

    setEstadosVenta(estadosDisponibles);
    expect(isAllStates()).toBe(false);
  });

  it("should update page size and reset page", () => {
    const { setCurrentPage, setPageSize } = useMotorcycleFiltersStore.getState();

    setCurrentPage(3);
    setPageSize(25);

    const { pageSize, currentPage } = useMotorcycleFiltersStore.getState();
    expect(pageSize).toBe(25);
    expect(currentPage).toBe(1);
  });

  it("should update sort config and reset page", () => {
    const { setCurrentPage, setSortConfig } = useMotorcycleFiltersStore.getState();

    setCurrentPage(3);
    setSortConfig({ key: "year", direction: "asc" });

    const { sortConfig, currentPage } = useMotorcycleFiltersStore.getState();
    expect(sortConfig.key).toBe("year");
    expect(sortConfig.direction).toBe("asc");
    expect(currentPage).toBe(1);
  });

  it("should reset filters to default state", () => {
    const { setSearch, setMarca, setCurrentPage, setEstadosVenta, resetFilters } =
      useMotorcycleFiltersStore.getState();

    // Modify some filters
    setSearch("Honda");
    setMarca("Yamaha");
    setCurrentPage(3);
    setEstadosVenta([MotorcycleState.VENDIDO]);

    // Reset
    resetFilters();

    const { filters, currentPage } = useMotorcycleFiltersStore.getState();
    expect(filters.search).toBe("");
    expect(filters.marca).toBe("todas");
    expect(currentPage).toBe(1);
    expect(filters.estadosVenta).toEqual(estadosDisponibles);
  });

  it("should reset filters with custom initial states", () => {
    const { resetFilters } = useMotorcycleFiltersStore.getState();
    const customStates = [MotorcycleState.VENDIDO, MotorcycleState.ELIMINADO];

    resetFilters(customStates);

    const { filters } = useMotorcycleFiltersStore.getState();
    expect(filters.estadosVenta).toEqual(customStates);
  });

  it("should update auxiliary data without affecting filters", () => {
    const { setSearch, setMarca, updateAuxiliaryData } = useMotorcycleFiltersStore.getState();

    // Establecer algunos filtros
    setSearch("Honda");
    setMarca("Yamaha");

    // Actualizar datos auxiliares
    updateAuxiliaryData(mockMotorcycles);

    const { filters, availableBrands, availableModels } = useMotorcycleFiltersStore.getState();

    // Los filtros no deberían cambiar
    expect(filters.search).toBe("Honda");
    expect(filters.marca).toBe("Yamaha");

    // Pero los datos auxiliares sí
    expect(availableBrands).toEqual(["Honda", "Kawasaki", "Yamaha"]);
    expect(availableModels).toEqual(["CBR600", "Ninja", "R1"]);
  });

  it("should only update states in initializeFromData when in default state", () => {
    const { setSearch, initializeFromData } = useMotorcycleFiltersStore.getState();

    // Cambiar un filtro para que no esté en estado por defecto
    setSearch("Honda");

    // Inicializar con datos que tendrían diferentes estados
    initializeFromData(mockMotorcycles);

    const { filters } = useMotorcycleFiltersStore.getState();

    // Los estados de venta no deberían cambiar porque no estamos en estado por defecto
    expect(filters.estadosVenta).toEqual(estadosDisponibles);
    expect(filters.search).toBe("Honda"); // Este filtro tampoco debería cambiar
  });
});

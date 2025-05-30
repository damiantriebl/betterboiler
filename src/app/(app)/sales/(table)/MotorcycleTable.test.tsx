import { updateMotorcycleStatus } from "@/actions/stock";
import { useToast } from "@/hooks/use-toast";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import { MotorcycleState } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { vi } from "vitest";
import MotorcycleTable from "./MotorcycleTable";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/actions/stock", () => ({
  updateMotorcycleStatus: vi.fn(),
}));

// Mock del store de filtros
vi.mock("@/stores/motorcycle-filters-store", () => ({
  useMotorcycleFiltersStore: vi.fn(() => ({
    filters: {
      search: "",
      marca: "todas",
      tipo: "todos",
      ubicacion: "todas",
      estadosVenta: [MotorcycleState.STOCK, MotorcycleState.RESERVADO, MotorcycleState.PAUSADO],
      years: [],
    },
    currentPage: 1,
    pageSize: 10,
    sortConfig: { key: null, direction: null },
    setCurrentPage: vi.fn(),
    setPageSize: vi.fn(),
    setSortConfig: vi.fn(),
    initializeFromData: vi.fn(),
  })),
  estadosDisponibles: [MotorcycleState.STOCK, MotorcycleState.RESERVADO, MotorcycleState.PAUSADO],
  estadosVentaPrisma: Object.values(MotorcycleState),
}));

// Mock del store de seguridad
vi.mock("@/stores/security-store", () => ({
  useSecurityStore: vi.fn(() => ({
    secureMode: false,
  })),
}));

// Mock de componentes de shadcn/ui
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

// Mock de componentes internos
vi.mock("../DeleteDialog", () => ({
  __esModule: true,
  default: ({ showDeleteDialog }: any) =>
    showDeleteDialog ? <div data-testid="delete-dialog">Delete Dialog</div> : null,
}));

vi.mock("../MotorcycleDetailModal", () => ({
  MotorcycleDetailModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="motorcycle-detail-modal">Motorcycle Detail Modal</div> : null,
}));

vi.mock("./FilterSection", () => ({
  __esModule: true,
  default: ({ onFilterChange }: any) => (
    <div data-testid="filter-section">
      <input
        data-testid="search-input"
        placeholder="Buscar por modelo, marca..."
        onChange={(e) => onFilterChange?.("search", e.target.value)}
      />
    </div>
  ),
}));

// Mock data
const mockMotorcycles: MotorcycleWithFullDetails[] = Array.from(
  { length: 25 },
  (_, i) =>
    ({
      id: i + 1,
      chassisNumber: `CHASSIS${String(i + 1).padStart(3, "0")}`,
      engineNumber: `ENGINE${String(i + 1).padStart(3, "0")}`,
      year: 2020 + (i % 5),
      mileage: 0,
      color: `Color${i + 1}`,
      retailPrice: 50000 + i * 1000,
      wholesalePrice: 45000 + i * 1000,
      costPrice: 40000 + i * 1000,
      currency: "USD",
      state: MotorcycleState.STOCK,
      displacement: 150 + (i % 4) * 50,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId: "org1",
      brandId: 1,
      modelId: 1 + (i % 3),
      branchId: 1 + (i % 2),
      images: [],
      brand: {
        id: 1,
        name: `Marca${(i % 3) + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId: "org1",
      },
      model: {
        id: 1 + (i % 3),
        name: `Modelo${(i % 3) + 1}`,
        brandId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId: "org1",
      },
      branch: {
        id: 1 + (i % 2),
        name: `Sucursal${(i % 2) + 1}`,
        address: `Dirección ${i + 1}`,
        phone: null,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId: "org1",
      },
      reservation: null,
    }) as any,
);

const mockClients = [
  {
    id: "1",
    type: "individual",
    firstName: "Juan",
    lastName: "Pérez",
    companyName: null,
    taxId: "12345678",
    email: "juan@test.com",
    phone: "123456789",
    mobile: null,
    address: "Calle 123",
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: "org1",
    notes: null,
  },
] as any;

const mockPromotions: any[] = [];

describe("MotorcycleTable - Paginación", () => {
  const mockPush = vi.fn();
  const mockToast = vi.fn();
  const mockSetCurrentPage = vi.fn();
  const mockSetPageSize = vi.fn();
  const mockInitializeFromData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    (useToast as any).mockReturnValue({
      toast: mockToast,
    });

    (updateMotorcycleStatus as any).mockResolvedValue({
      success: true,
    });

    // Mock del store con funciones mockeadas
    const { useMotorcycleFiltersStore } = require("@/stores/motorcycle-filters-store");
    useMotorcycleFiltersStore.mockReturnValue({
      filters: {
        search: "",
        marca: "todas",
        tipo: "todos",
        ubicacion: "todas",
        estadosVenta: [MotorcycleState.STOCK, MotorcycleState.RESERVADO, MotorcycleState.PAUSADO],
        years: [],
      },
      currentPage: 1,
      pageSize: 10,
      sortConfig: { key: null, direction: null },
      setCurrentPage: mockSetCurrentPage,
      setPageSize: mockSetPageSize,
      setSortConfig: vi.fn(),
      initializeFromData: mockInitializeFromData,
    });
  });

  it("renderiza la tabla con paginación por defecto (10 elementos)", async () => {
    render(
      <MotorcycleTable
        initialData={mockMotorcycles}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Verificar que se inicializa el store con los datos
      expect(mockInitializeFromData).toHaveBeenCalledWith(mockMotorcycles);

      // Verificar que solo se muestran 10 elementos en la primera página
      const motorcycleRows = screen.getAllByText(/CHASSIS\d{3}/);
      expect(motorcycleRows).toHaveLength(10);

      // Verificar que se muestra el primer elemento
      expect(screen.getByText("CHASSIS001")).toBeInTheDocument();

      // Verificar que no se muestra el elemento 11
      expect(screen.queryByText("CHASSIS011")).not.toBeInTheDocument();
    });
  });

  it("permite cambiar el tamaño de página", async () => {
    // Mockear store con pageSize 25
    const { useMotorcycleFiltersStore } = require("@/stores/motorcycle-filters-store");
    useMotorcycleFiltersStore.mockReturnValue({
      filters: {
        search: "",
        marca: "todas",
        tipo: "todos",
        ubicacion: "todas",
        estadosVenta: [MotorcycleState.STOCK, MotorcycleState.RESERVADO, MotorcycleState.PAUSADO],
        years: [],
      },
      currentPage: 1,
      pageSize: 25, // Cambiar a 25
      sortConfig: { key: null, direction: null },
      setCurrentPage: mockSetCurrentPage,
      setPageSize: mockSetPageSize,
      setSortConfig: vi.fn(),
      initializeFromData: mockInitializeFromData,
    });

    render(
      <MotorcycleTable
        initialData={mockMotorcycles}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Buscar el selector de tamaño de página
      const pageSizeSelects = screen.getAllByRole("combobox");
      const pageSizeSelect = pageSizeSelects.find((select) =>
        select.closest("div")?.textContent?.includes("Motos por página"),
      );
      expect(pageSizeSelect).toBeTruthy();
      if (pageSizeSelect) {
        fireEvent.click(pageSizeSelect);
      }
    });

    await waitFor(() => {
      const option25 = screen.getByRole("option", { name: "25" });
      fireEvent.click(option25);
    });

    await waitFor(() => {
      // Verificar que se llamó setPageSize
      expect(mockSetPageSize).toHaveBeenCalledWith(25);
    });
  });

  it("permite navegar entre páginas", async () => {
    // Mockear store en página 2
    const { useMotorcycleFiltersStore } = require("@/stores/motorcycle-filters-store");
    useMotorcycleFiltersStore.mockReturnValue({
      filters: {
        search: "",
        marca: "todas",
        tipo: "todos",
        ubicacion: "todas",
        estadosVenta: [MotorcycleState.STOCK, MotorcycleState.RESERVADO, MotorcycleState.PAUSADO],
        years: [],
      },
      currentPage: 2, // Cambiar a página 2
      pageSize: 10,
      sortConfig: { key: null, direction: null },
      setCurrentPage: mockSetCurrentPage,
      setPageSize: mockSetPageSize,
      setSortConfig: vi.fn(),
      initializeFromData: mockInitializeFromData,
    });

    render(
      <MotorcycleTable
        initialData={mockMotorcycles}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Verificar que se muestran los elementos de la página 2
      expect(screen.getByText("CHASSIS011")).toBeInTheDocument();
      expect(screen.getByText("CHASSIS020")).toBeInTheDocument();

      // Verificar que no se muestra el primer elemento de la página 1
      expect(screen.queryByText("CHASSIS001")).not.toBeInTheDocument();
    });
  });

  it("muestra la información correcta de paginación", async () => {
    render(
      <MotorcycleTable
        initialData={mockMotorcycles}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Verificar información de la primera página
      expect(screen.getByText(/Mostrando 1 a 10 de 25 motos/)).toBeInTheDocument();
    });
  });

  it("resetea a la página 1 cuando se aplican filtros a través del store", async () => {
    // Mockear filtros cambiados
    const { useMotorcycleFiltersStore } = require("@/stores/motorcycle-filters-store");
    useMotorcycleFiltersStore.mockReturnValue({
      filters: {
        search: "Marca1", // Filtro aplicado
        marca: "todas",
        tipo: "todos",
        ubicacion: "todas",
        estadosVenta: [MotorcycleState.STOCK, MotorcycleState.RESERVADO, MotorcycleState.PAUSADO],
        years: [],
      },
      currentPage: 1, // Store maneja el reset automáticamente
      pageSize: 10,
      sortConfig: { key: null, direction: null },
      setCurrentPage: mockSetCurrentPage,
      setPageSize: mockSetPageSize,
      setSortConfig: vi.fn(),
      initializeFromData: mockInitializeFromData,
    });

    render(
      <MotorcycleTable
        initialData={mockMotorcycles}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Verificar que se muestran solo elementos filtrados
      const filteredRows = screen.getAllByText(/CHASSIS\d{3}/);
      // Solo deberían aparecer las motocicletas de Marca1 (cada 3 elementos)
      expect(filteredRows.length).toBeLessThan(10);
    });
  });

  it("mantiene la paginación cuando se cambian los datos", async () => {
    const { rerender } = render(
      <MotorcycleTable
        initialData={mockMotorcycles.slice(0, 15)}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    // Simular actualización de datos
    rerender(
      <MotorcycleTable
        initialData={mockMotorcycles.slice(0, 20)}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Verificar que se reinicializa el store con nuevos datos
      expect(mockInitializeFromData).toHaveBeenCalledWith(mockMotorcycles.slice(0, 20));
    });
  });

  it("inicializa correctamente el store al montar", async () => {
    render(
      <MotorcycleTable
        initialData={mockMotorcycles}
        clients={mockClients}
        activePromotions={mockPromotions}
      />,
    );

    await waitFor(() => {
      // Verificar que se llama initializeFromData con los datos iniciales
      expect(mockInitializeFromData).toHaveBeenCalledWith(mockMotorcycles);
    });
  });
});

import { confirmTransferArrival } from "@/actions/logistics/motorcycle-transfers";
import { useToast } from "@/hooks/use-toast";
import { useTransferUpdates } from "@/hooks/use-transfer-updates";
import type { MotorcycleTransferWithRelations } from "@/types/logistics";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import TransfersInTransitTable from "./TransfersInTransitTable";

// Mock dependencies
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/hooks/use-transfer-updates", () => ({
  useTransferUpdates: vi.fn(),
}));

vi.mock("@/actions/logistics/motorcycle-transfers", () => ({
  confirmTransferArrival: vi.fn(),
}));

// Mock del modal de detalles
vi.mock("./MotorcycleDetailsModal", () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="motorcycle-details-modal">
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    ) : null,
}));

const mockTransfers = [
  {
    id: 1,
    motorcycleId: 1,
    fromBranchId: 1,
    toBranchId: 2,
    logisticProviderId: 1,
    status: "IN_TRANSIT",
    requestedDate: new Date(),
    notes: "Test transfer",
    scheduledPickupDate: new Date("2024-02-15"),
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
    requesterId: "user1",
    confirmerId: null,
    motorcycle: {
      chassisNumber: "ABC123456789",
      brand: {
        name: "Honda",
      },
      model: {
        name: "CG 150",
      },
    },
    fromBranch: {
      name: "Sucursal Centro",
    },
    toBranch: {
      name: "Sucursal Norte",
    },
    logisticProvider: {
      name: "Transportes Express",
    },
  },
  {
    id: 2,
    motorcycleId: 2,
    fromBranchId: 2,
    toBranchId: 3,
    logisticProviderId: 2,
    status: "IN_TRANSIT",
    requestedDate: new Date(),
    notes: "Test transfer 2",
    scheduledPickupDate: new Date("2024-02-20"),
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
    requesterId: "user1",
    confirmerId: null,
    motorcycle: {
      chassisNumber: "XYZ987654321",
      brand: {
        name: "Yamaha",
      },
      model: {
        name: "YBR 125",
      },
    },
    fromBranch: {
      name: "Sucursal Norte",
    },
    toBranch: {
      name: "Sucursal Sur",
    },
    logisticProvider: {
      name: "Logística Rápida",
    },
  },
] as any;

describe("TransfersInTransitTable", () => {
  const mockToast = vi.fn();
  const mockRemoveTransfer = vi.fn();
  const mockRefreshTransfers = vi.fn();
  const mockOnTransferUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useToast as any).mockReturnValue({
      toast: mockToast,
    });

    (useTransferUpdates as any).mockReturnValue({
      transfers: mockTransfers,
      removeTransfer: mockRemoveTransfer,
      refreshTransfers: mockRefreshTransfers,
    });
  });

  it("renderiza la tabla con datos de transferencias", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.getByText("Yamaha YBR 125")).toBeInTheDocument();
      expect(screen.getByText("ABC123456789")).toBeInTheDocument();
      expect(screen.getByText("XYZ987654321")).toBeInTheDocument();
      expect(screen.getByText("Sucursal Centro")).toBeInTheDocument();
      expect(screen.getByText("Transportes Express")).toBeInTheDocument();
    });
  });

  it("muestra mensaje cuando no hay transferencias", async () => {
    (useTransferUpdates as any).mockReturnValue({
      transfers: [],
      removeTransfer: mockRemoveTransfer,
      refreshTransfers: mockRefreshTransfers,
    });

    render(<TransfersInTransitTable transfers={[]} onTransferUpdate={mockOnTransferUpdate} />);

    await waitFor(() => {
      expect(screen.getByText("No hay transferencias en tránsito")).toBeInTheDocument();
    });
  });

  it("permite buscar transferencias", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Buscar transferencias...");
      fireEvent.change(searchInput, { target: { value: "Honda" } });
    });

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.queryByText("Yamaha YBR 125")).not.toBeInTheDocument();
    });
  });

  it("permite ordenar por columnas", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const motorcycleHeader = screen.getByRole("button", { name: /motocicleta/i });
      fireEvent.click(motorcycleHeader);
      expect(motorcycleHeader).toBeInTheDocument();
    });
  });

  it("maneja la confirmación de llegada exitosa", async () => {
    (confirmTransferArrival as any).mockResolvedValue({
      success: true,
    });

    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const confirmButtons = screen.getAllByText(/confirmar llegada/i);
      fireEvent.click(confirmButtons[0]);
    });

    await waitFor(() => {
      expect(confirmTransferArrival).toHaveBeenCalledWith(1);
      expect(mockToast).toHaveBeenCalledWith({
        title: "Llegada confirmada",
        description: "La motocicleta ha llegado a su destino y está disponible en stock.",
      });
      expect(mockRemoveTransfer).toHaveBeenCalledWith(1);
      expect(mockOnTransferUpdate).toHaveBeenCalled();
    });
  });

  it("maneja errores en la confirmación de llegada", async () => {
    (confirmTransferArrival as any).mockResolvedValue({
      success: false,
      error: "Error de prueba",
    });

    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const confirmButtons = screen.getAllByText(/confirmar llegada/i);
      fireEvent.click(confirmButtons[0]);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Error de prueba",
        variant: "destructive",
      });
    });
  });

  it("abre modal de detalles al hacer clic en Ver", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const viewButtons = screen.getAllByText("Ver");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("motorcycle-details-modal")).toBeInTheDocument();
    });
  });

  it("cierra modal de detalles", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const viewButtons = screen.getAllByText("Ver");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      const closeButton = screen.getByText("Cerrar");
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("motorcycle-details-modal")).not.toBeInTheDocument();
    });
  });

  it("muestra el contador correcto de transferencias", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      expect(screen.getByText("2 transferencias")).toBeInTheDocument();
    });
  });

  it("muestra fechas de las transferencias", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      // Verificar que hay elementos de fecha
      const dateElements = screen.getAllByText(/2024/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it("muestra estado En Tránsito para todas las transferencias", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const badges = screen.getAllByText("En Tránsito");
      expect(badges).toHaveLength(2);
    });
  });

  it("filtra por nombre de sucursal de origen", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Buscar transferencias...");
      fireEvent.change(searchInput, { target: { value: "Centro" } });
    });

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.queryByText("Yamaha YBR 125")).not.toBeInTheDocument();
    });
  });

  it("filtra por proveedor logístico", async () => {
    render(
      <TransfersInTransitTable transfers={mockTransfers} onTransferUpdate={mockOnTransferUpdate} />,
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Buscar transferencias...");
      fireEvent.change(searchInput, { target: { value: "Express" } });
    });

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.queryByText("Yamaha YBR 125")).not.toBeInTheDocument();
    });
  });

  it("maneja transferencias sin proveedor logístico", async () => {
    const transfersWithoutProvider = [
      {
        ...mockTransfers[0],
        logisticProvider: null,
      },
    ];

    (useTransferUpdates as any).mockReturnValue({
      transfers: transfersWithoutProvider,
      removeTransfer: mockRemoveTransfer,
      refreshTransfers: mockRefreshTransfers,
    });

    render(
      <TransfersInTransitTable
        transfers={transfersWithoutProvider}
        onTransferUpdate={mockOnTransferUpdate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sin proveedor")).toBeInTheDocument();
    });
  });
});

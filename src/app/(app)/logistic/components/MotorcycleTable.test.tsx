import type { MotorcycleForTransfer } from "@/types/logistics";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import MotorcycleTable from "./MotorcycleTable";

// Mock de Next.js Image - ya no se usa en este componente pero mantenemos el mock por compatibilidad
vi.mock("next/image", () => ({
  // biome-ignore lint/a11y/useAltText: Mock de test para Next.js Image
  default: ({ src, alt = "Imagen de motocicleta", ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

const mockMotorcycles: MotorcycleForTransfer[] = [
  {
    id: 1,
    chassisNumber: "ABC123456789",
    year: 2023,
    retailPrice: 1500000,
    currency: "ARS",
    state: "STOCK",
    imageUrl: "https://example.com/image1.jpg",
    brand: {
      name: "Honda",
    },
    model: {
      name: "CG 150",
    },
    color: {
      name: "Rojo",
    },
    branch: {
      id: 1,
      name: "Sucursal Centro",
    },
  },
  {
    id: 2,
    chassisNumber: "XYZ987654321",
    year: 2022,
    retailPrice: 2000000,
    currency: "ARS",
    state: "STOCK",
    imageUrl: null,
    brand: {
      name: "Yamaha",
    },
    model: {
      name: "YBR 125",
    },
    color: {
      name: "Azul",
    },
    branch: {
      id: 2,
      name: "Sucursal Norte",
    },
  },
];

describe("MotorcycleTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza la tabla con datos de motocicletas", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
    expect(screen.getByText("Yamaha YBR 125")).toBeInTheDocument();
    expect(screen.getByText(/ABC123456789/)).toBeInTheDocument();
    expect(screen.getByText(/XYZ987654321/)).toBeInTheDocument();
    expect(screen.getByText("Sucursal Centro")).toBeInTheDocument();
    expect(screen.getByText("Sucursal Norte")).toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay motocicletas", () => {
    render(<MotorcycleTable motorcycles={[]} />);
    expect(screen.getByText("No hay motocicletas disponibles.")).toBeInTheDocument();
  });

  it("permite buscar motocicletas", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const searchInput = screen.getByPlaceholderText("Buscar motocicletas...");
    fireEvent.change(searchInput, { target: { value: "Honda" } });

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.queryByText("Yamaha YBR 125")).not.toBeInTheDocument();
    });
  });

  it("muestra mensaje cuando la búsqueda no encuentra resultados", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const searchInput = screen.getByPlaceholderText("Buscar motocicletas...");
    fireEvent.change(searchInput, { target: { value: "motocicleta inexistente" } });

    await waitFor(() => {
      expect(
        screen.getByText("No se encontraron motocicletas que coincidan con la búsqueda."),
      ).toBeInTheDocument();
    });
  });

  it("permite ordenar por columnas", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const brandHeader = screen.getByRole("button", { name: /marca\/modelo/i });
    fireEvent.click(brandHeader);

    await waitFor(() => {
      expect(brandHeader).toBeInTheDocument();
    });
  });

  it("muestra checkboxes cuando showSelection es true", () => {
    render(
      <MotorcycleTable
        motorcycles={mockMotorcycles}
        showSelection={true}
        selectedMotorcycles={[]}
        onMotorcycleSelect={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(2);
  });

  it("maneja la selección de motocicletas", async () => {
    const onMotorcycleSelect = vi.fn();
    render(
      <MotorcycleTable
        motorcycles={mockMotorcycles}
        showSelection={true}
        selectedMotorcycles={[]}
        onMotorcycleSelect={onMotorcycleSelect}
      />,
    );

    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstCheckbox);

    expect(onMotorcycleSelect).toHaveBeenCalledWith(1, true);
  });

  it("muestra motocicletas seleccionadas correctamente", () => {
    render(
      <MotorcycleTable
        motorcycles={mockMotorcycles}
        showSelection={true}
        selectedMotorcycles={[1]}
        onMotorcycleSelect={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("muestra información de marca y modelo correctamente", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
    expect(screen.getByText("Yamaha YBR 125")).toBeInTheDocument();
  });

  it("muestra información de chasis", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    expect(screen.getByText(/Chasis: ABC123456789/)).toBeInTheDocument();
    expect(screen.getByText(/Chasis: XYZ987654321/)).toBeInTheDocument();
  });

  it("abre modal de detalles al hacer clic en 'Ver detalles'", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const detailButtons = screen.getAllByText("Ver detalles");
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Detalles de la Motocicleta")).toBeInTheDocument();
    });
  });

  it("muestra detalles correctos en el modal", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const detailButtons = screen.getAllByText("Ver detalles");
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Información General")).toBeInTheDocument();
      expect(screen.getByText("Ubicación y Precio")).toBeInTheDocument();
    });
  });

  it("formatea precios correctamente", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    // Verifica que los precios se muestren formateados
    expect(screen.getByText(/\$\s*1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*2\.000\.000/)).toBeInTheDocument();
  });

  it("muestra el año de las motocicletas", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("2022")).toBeInTheDocument();
  });

  it("muestra los colores como badges", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    expect(screen.getByText("Rojo")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
  });

  it("filtra por número de chasis", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const searchInput = screen.getByPlaceholderText("Buscar motocicletas...");
    fireEvent.change(searchInput, { target: { value: "ABC123" } });

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.queryByText("Yamaha YBR 125")).not.toBeInTheDocument();
    });
  });

  it("filtra por nombre de sucursal", async () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    const searchInput = screen.getByPlaceholderText("Buscar motocicletas...");
    fireEvent.change(searchInput, { target: { value: "Centro" } });

    await waitFor(() => {
      expect(screen.getByText("Honda CG 150")).toBeInTheDocument();
      expect(screen.queryByText("Yamaha YBR 125")).not.toBeInTheDocument();
    });
  });

  it("muestra el contador correcto de motocicletas", () => {
    render(<MotorcycleTable motorcycles={mockMotorcycles} />);

    expect(screen.getByText("2 motocicletas")).toBeInTheDocument();
  });

  it("maneja motocicletas sin color", () => {
    const motorcyclesWithoutColor = [
      {
        ...mockMotorcycles[0],
        color: null,
      },
    ];

    render(<MotorcycleTable motorcycles={motorcyclesWithoutColor} />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});

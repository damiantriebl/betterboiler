import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientTable from "./ClientTable";
import type { Client } from "./columns";
import { vi } from "vitest";
import { deleteClient } from "@/actions/clients/manage-clients";
import { MotorcycleState } from "@prisma/client";

// Mockear la función deleteClient que se usa internamente
vi.mock("@/actions/clients/manage-clients", () => ({
  deleteClient: vi.fn().mockResolvedValue({ id: "1" }),
}));

describe("ClientTable", () => {
  const mockClients: Client[] = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      companyName: "",
      taxId: "123456789",
      email: "john@example.com",
      phone: "1234567890",
      mobile: "0987654321",
      address: "123 Main St",
      vatStatus: "monotributo",
      type: "Individual",
      status: "active",
      notes: "Some notes",
      createdAt: new Date(),
      updatedAt: new Date(),
      motorcycles: [],
    },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      companyName: "",
      taxId: "987654321",
      email: "jane@example.com",
      phone: "9876543210",
      mobile: "1234567890",
      address: "456 Oak St",
      vatStatus: "responsable_inscripto",
      type: "LegalEntity",
      status: "active",
      notes: "More notes",
      createdAt: new Date(),
      updatedAt: new Date(),
      motorcycles: [],
    },
  ];

  it("renderiza la tabla con clientes", () => {
    render(<ClientTable initialData={mockClients} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("muestra mensaje de vacío si no hay clientes", () => {
    render(<ClientTable initialData={[]} />);
    expect(screen.getByText("No se encontraron clientes.")).toBeInTheDocument();
  });

  it("ordena por nombre al hacer click en el botón de Nombre", async () => {
    render(<ClientTable initialData={mockClients} />);
    const user = userEvent.setup();
    const nombreBtn = screen.getByRole("button", { name: /nombre/i });
    await user.click(nombreBtn);

    // Busca todas las celdas de la primera columna (nombre)
    const nombreCeldas = screen
      .getAllByRole("cell")
      .filter((cell) => cell.className.includes("font-medium"));
    // Al ordenar por firstName, Jane debe aparecer primero (ascendente)
    expect(nombreCeldas[0]).toHaveTextContent("Jane Smith");
    expect(nombreCeldas[1]).toHaveTextContent("John Doe");

    await user.click(nombreBtn);
    const nombreCeldasDesc = screen
      .getAllByRole("cell")
      .filter((cell) => cell.className.includes("font-medium"));
    // En orden descendente, John debe aparecer primero
    expect(nombreCeldasDesc[0]).toHaveTextContent("John Doe");
    expect(nombreCeldasDesc[1]).toHaveTextContent("Jane Smith");
  });

  it("llama a onEdit cuando se hace click en Editar", async () => {
    const onEdit = vi.fn();
    render(<ClientTable initialData={mockClients} onEdit={onEdit} />);
    const user = userEvent.setup();

    // Abrir menú de acciones del primer cliente
    const menuBtns = screen.getAllByRole("button", { name: /abrir menú/i });
    await user.click(menuBtns[0]);

    // Esperar a que aparezca el menú y buscar el botón Editar por rol y texto
    const editarBtn = await screen.findByRole("menuitem", { name: /editar/i });
    await user.click(editarBtn);

    expect(onEdit).toHaveBeenCalledWith(mockClients[0]);
  });

  it("llama a onDelete cuando se hace click en Eliminar y se confirma", async () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockImplementation(() => true);

    // Renderizar el componente
    render(<ClientTable initialData={mockClients} onDelete={onDelete} />);
    const user = userEvent.setup();

    // Abrir el menú
    const menuBtns = screen.getAllByRole("button", { name: /abrir menú/i });
    await user.click(menuBtns[0]);

    // Buscar y hacer click en Eliminar
    const eliminarBtn = await screen.findByRole("menuitem", { name: /eliminar/i });
    await user.click(eliminarBtn);

    // Verificar que se llamó a deleteClient
    expect(deleteClient).toHaveBeenCalledWith(mockClients[0].id);

    // Esperar a que se complete el proceso de eliminación
    await waitFor(
      () => {
        expect(onDelete).toHaveBeenCalledWith(mockClients[0].id);
      },
      { timeout: 3000 },
    ); // Aumentar el timeout para dar más tiempo
  });
});

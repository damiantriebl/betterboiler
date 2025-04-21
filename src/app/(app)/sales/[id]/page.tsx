"use client";

import { useEffect, useState, useTransition, useOptimistic } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Loader2, UserPlus, X, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getClients } from "@/actions/clients/get-clients";
import { Client, MotorcycleState, Motorcycle as PrismaMotorcycle } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import AddClientModal from "@/components/client/AddClientModal";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { updateMotorcycleStatus } from "@/actions/stock/update-motorcycle-status";
import { useToast } from "@/hooks/use-toast";
import { getMotorcycleById, type MotorcycleWithRelations as ServerMotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id";

// Definir nuestro tipo local compatible con el servidor
type MotorcycleWithRelations = ServerMotorcycleWithRelations & {
  estadoVenta?: string;
};

interface StepperProps {
  currentStep: number;
  steps: string[];
}

function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                        ${index < currentStep
                ? "bg-green-500 border-green-500 text-white"
                : index === currentStep
                  ? "border-blue-500 text-blue-500"
                  : "border-gray-300 text-gray-300"
              }`}
          >
            {index < currentStep ? "✓" : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-20 h-1 mx-2 
                            ${index < currentStep ? "bg-green-500" : "bg-gray-300"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface BuyerFormData {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
}

interface PaymentFormData {
  metodoPago: string;
  cuotas: number;
  banco: string;
}

// --- Definir la estructura del estado para Local Storage ---
interface SaleProcessState {
  currentStep: number;
  selectedClientId: string | null;
  buyerData: BuyerFormData;
  paymentData: PaymentFormData;
  showClientTable: boolean;
}
// --- Fin definición estructura ---

export default function VentaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const isReserved = searchParams.get('reserved') === 'true';
  const reservationAmount = searchParams.get('amount') ? Number(searchParams.get('amount')) : 0;
  const initialClientIdFromReservation = searchParams.get('clientId') || null; // Obtener ID inicial si viene de reserva

  // --- Estado Local (no persistente o cargado después) ---
  const [moto, setMoto] = useState<MotorcycleWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMoto, setLoadingMoto] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  // Sort state for client table
  const [sortConfig, setSortConfig] = useState<{ key: keyof Client | null; direction: "asc" | "desc" | null }>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  // --- Fin Estado Local ---

  const { toast } = useToast();

  // --- Estado Persistente con Local Storage ---
  const localStorageKey = `saleProcess-${params.id}`;

  const initialSaleState: SaleProcessState = {
    currentStep: 0,
    // Establecer cliente inicial SOLO si viene de una reserva, sino null
    selectedClientId: isReserved ? initialClientIdFromReservation : null,
    buyerData: {
      nombre: "", apellido: "", dni: "", telefono: "", email: "", direccion: "",
    },
    paymentData: {
      metodoPago: "", cuotas: 1, banco: "",
    },
    // Mostrar tabla por defecto, excepto si viene de reserva con cliente
    showClientTable: !(isReserved && initialClientIdFromReservation),
  };

  const [saleState, setSaleState] = useLocalStorage<SaleProcessState>(
    localStorageKey,
    initialSaleState
  );
  // --- Fin Estado Persistente ---

  // --- useOptimistic --- 
  const [optimisticMotoState, addOptimisticUpdate] = useOptimistic(
    saleState,
    (currentState: SaleProcessState, optimisticValue: { motorcycleId: number; newStatus: MotorcycleState }) => {
      console.warn("Lógica optimista necesita implementación correcta");
      return currentState;
    }
  );
  // --- Fin useOptimistic ---

  // --- Derivar selectedClient del estado persistente --- 
  const selectedClient = clients.find(c => c.id === saleState.selectedClientId) || null;
  // --- Fin Derivación ---

  // --- Hook useTransition ---
  const [isTransitionPending, startTransition] = useTransition();

  const steps = ["Confirmar Moto", "Datos del Comprador", "Método de Pago", "Confirmación"];

  // Efecto para cargar moto y clientes
  useEffect(() => {
    const loadMotorcycle = async () => {
      try {
        setLoadingMoto(true);
        // Cargamos la moto usando la acción del servidor
        const motorcycle = await getMotorcycleById(params.id);
        if (motorcycle) {
          setMoto(motorcycle);
        } else {
          // Si no se encuentra, mostrar mensaje de error
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo encontrar la moto seleccionada."
          });
        }
      } catch (error) {
        console.error("Error al cargar la moto:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error al cargar los datos de la moto."
        });
      } finally {
        setLoadingMoto(false);
      }
    };

    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const clientsList = await getClients();
        setClients(clientsList);

        // Si viene de reserva y tenemos el ID del cliente, 
        // asegurar que los datos del comprador en el estado persistente se actualicen
        if (isReserved && saleState.selectedClientId) {
          const reservedClientData = clientsList.find(c => c.id === saleState.selectedClientId);
          if (reservedClientData) {
            // Solo actualiza buyerData si está vacío, para no sobrescribir datos ya ingresados 
            // si el usuario navegó atrás y adelante.
            if (!saleState.buyerData.nombre && !saleState.buyerData.email) {
              setSaleState(prevState => ({
                ...prevState,
                buyerData: {
                  nombre: reservedClientData.firstName,
                  apellido: reservedClientData.lastName || "",
                  dni: reservedClientData.taxId || "",
                  telefono: reservedClientData.phone || reservedClientData.mobile || "",
                  email: reservedClientData.email,
                  direccion: reservedClientData.address || "",
                }
              }));
            }
          }
        }

      } catch (error) { console.error("Error al cargar clientes:", error); }
      finally { setLoadingClients(false); }
    };

    loadMotorcycle();
    loadClients();
  }, [params.id, isReserved, toast]);

  // --- FUNCIONES RESTAURADAS/ADAPTADAS --- 

  // Función placeholder para Editar Info
  const handleEditInfo = () => {
    console.log("Editar información de la moto");
    // Aquí podrías, por ejemplo, navegar a una página de edición o abrir un modal
  };

  // Funciones para ordenar la tabla de clientes
  const handleSort = (key: keyof Client) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
    setCurrentPage(1); // Resetear paginación al ordenar
  };

  const getSortedClients = () => {
    if (!sortConfig.key || !sortConfig.direction) return clients;
    return [...clients].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Client] || "";
      const bValue = b[sortConfig.key as keyof Client] || "";
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      // Añadir comparación numérica si es necesario para otros campos
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0; // Fallback
    });
  };

  const getSortIcon = (key: keyof Client) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  // Variables derivadas para paginación
  const sortedClients = getSortedClients();
  const totalPages = Math.ceil(sortedClients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedClients = sortedClients.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
    setCurrentPage(1); // Resetear a la primera página
  };

  // --- FIN FUNCIONES RESTAURADAS/ADAPTADAS ---

  // --- Actualizar funciones para usar saleState y setSaleState --- 

  const handleSelectClient = (client: Client) => {
    setSaleState(prevState => ({
      ...prevState,
      selectedClientId: client.id,
      showClientTable: false, // Ocultar tabla al seleccionar
      // Actualizar buyerData al seleccionar
      buyerData: {
        nombre: client.firstName,
        apellido: client.lastName || "",
        dni: client.taxId || "",
        telefono: client.phone || client.mobile || "",
        email: client.email,
        direccion: client.address || "",
      }
    }));
  };

  const handleCancelClientSelection = () => {
    setSaleState(prevState => ({
      ...prevState,
      selectedClientId: null,
      showClientTable: true, // Mostrar tabla de nuevo
      // Limpiar buyerData al cancelar selección
      buyerData: initialSaleState.buyerData
    }));
  };

  const handleBuyerDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSaleState(prevState => ({
      ...prevState,
      buyerData: { ...prevState.buyerData, [name]: value },
    }));
  };

  const handlePaymentDataChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSaleState(prevState => ({
      ...prevState,
      paymentData: { ...prevState.paymentData, [name]: name === "cuotas" ? Number.parseInt(value) : value },
    }));
  };

  const handleNext = async () => {
    if (saleState.currentStep === steps.length - 1) return;
    if (saleState.currentStep === 2) {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setLoading(false);
      console.log("Venta completada:", {
        moto: {
          marca: moto?.brand?.name,
          modelo: moto?.model?.name,
          año: moto?.year,
          precio: moto?.retailPrice,
          id: moto?.id,
        },
        comprador: saleState.buyerData,
        pago: saleState.paymentData,
      });
    }
    setSaleState(prevState => ({ ...prevState, currentStep: prevState.currentStep + 1 }));
  };

  const handleBack = () => {
    if (saleState.currentStep === 0) return;
    setSaleState(prevState => ({ ...prevState, currentStep: prevState.currentStep - 1 }));
  };

  // Callback para el modal AddClientModal (ya existente y correcto)
  const handleClientAdded = (newClient: Client) => {
    setClients(prevClients => [newClient, ...prevClients].sort((a, b) => a.firstName.localeCompare(b.firstName)));
    handleSelectClient(newClient); // Esta función ya actualiza saleState
  };

  const handleCancelProcess = (motoId: number) => {
    const newStatus = MotorcycleState.STOCK;
    startTransition(async () => {
      addOptimisticUpdate({ motorcycleId: motoId, newStatus: newStatus });
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);
        if (result.success) {
          setClients((current) =>
            current.map((moto) =>
              moto.id === motoId.toString() ? { ...moto, estadoVenta: newStatus } : moto,
            )
          );
          toast({ title: "Proceso Cancelado", /*...*/ });
        } else {
          toast({ variant: "destructive", title: "Error al Cancelar", /*...*/ });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error Inesperado", /*...*/ });
        console.error("Error cancelando proceso:", error);
      }
    });
  };

  // ... (resto de funciones como handleSort, getSortIcon, etc., que no necesitan cambiar) ...

  // --- Actualizar renderStepContent para mostrar datos reales de la moto --- 
  const renderStepContent = () => {
    switch (saleState.currentStep) { // <-- Usar saleState.currentStep
      case 0:
        return (
          <div className="space-y-6">
            {isReserved && (
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mb-4">
                <h3 className="text-lg font-semibold text-blue-700 mb-2">
                  Moto Reservada
                </h3>
                <p>Esta moto tiene una reserva de <span className="font-bold">{formatPrice(reservationAmount)}</span>.</p>
                <p className="text-sm text-blue-600">El monto de la reserva será descontado del precio final.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Detalles de la Moto</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Marca:</span> {moto?.brand?.name || 'No disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Modelo:</span> {moto?.model?.name || 'No disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Año:</span> {moto?.year || 'No disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Cilindrada:</span> {moto?.displacement || 'No disponible'}cc
                  </p>
                  <p>
                    <span className="font-medium">Número de Chasis:</span> {moto?.chassisNumber || 'No disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Color:</span> {moto?.color?.name || 'No disponible'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Estado y Ubicación</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Estado:</span> {moto?.state === MotorcycleState.STOCK ? 'Disponible' : moto?.state}
                  </p>
                  <p>
                    <span className="font-medium">Kilometraje:</span> {moto?.mileage || 0}km
                  </p>
                  <p>
                    <span className="font-medium">Estado de Venta:</span> {moto?.estadoVenta || moto?.state || 'No disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Ubicación:</span> {moto?.branch?.name || 'No disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Precio:</span> {formatPrice(moto?.retailPrice ?? 0)}
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleEditInfo} variant="outline" className="mt-4">
              Editar Información
            </Button>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datos del Comprador</h3>

            {/* Si tiene cliente reservado o seleccionado */}
            {selectedClient && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-700">Cliente seleccionado:</p>
                  <p className="text-lg font-bold">{selectedClient.firstName} {selectedClient.lastName}</p>
                  <p>{selectedClient.email}</p>
                </div>
                {!isReserved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelClientSelection}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cambiar cliente
                  </Button>
                )}
              </div>
            )}

            {/* Si no está reservada y no hay cliente seleccionado, mostrar tabla o formulario */}
            {!isReserved && saleState.showClientTable ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium">Seleccionar un cliente existente</h4>
                  <AddClientModal
                    onClientAdded={handleClientAdded}
                    triggerButton={
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Nuevo cliente
                      </Button>
                    }
                  />
                </div>

                {/* Tabla de clientes */}
                {loadingClients ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("firstName")} className="p-0 font-medium">
                                Nombre
                                {getSortIcon("firstName")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("email")} className="p-0 font-medium">
                                Email
                                {getSortIcon("email")}
                              </Button>
                            </TableHead>
                            <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                            <TableHead className="hidden md:table-cell">CUIT/CUIL</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedClients.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No hay clientes disponibles.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedClients.map((client) => (
                              <TableRow key={client.id}>
                                <TableCell className="font-medium">
                                  {client.firstName} {client.lastName}
                                </TableCell>
                                <TableCell>{client.email}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {client.phone || client.mobile || "-"}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {client.taxId || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSelectClient(client)}
                                  >
                                    Seleccionar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginación */}
                    {paginatedClients.length > 0 && (
                      <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Clientes por página:</span>
                          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="w-[70px] h-8">
                              <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent>
                              {[5, 10, 20].map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <PaginationItem key={i}>
                                <PaginationLink
                                  isActive={currentPage === i + 1}
                                  onClick={() => handlePageChange(i + 1)}
                                >
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                                className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nombre" className="block">Nombre</label>
                  <input
                    id="nombre"
                    type="text"
                    name="nombre"
                    value={saleState.buyerData.nombre}
                    onChange={handleBuyerDataChange}
                    className="w-full p-2 border rounded"
                    placeholder="Nombre"
                    disabled={isReserved}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="apellido" className="block">Apellido</label>
                  <input
                    id="apellido"
                    type="text"
                    name="apellido"
                    value={saleState.buyerData.apellido}
                    onChange={handleBuyerDataChange}
                    className="w-full p-2 border rounded"
                    placeholder="Apellido"
                    disabled={isReserved}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="dni" className="block">DNI</label>
                  <input
                    id="dni"
                    type="text"
                    name="dni"
                    value={saleState.buyerData.dni}
                    onChange={handleBuyerDataChange}
                    className="w-full p-2 border rounded"
                    placeholder="DNI"
                    disabled={isReserved}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="telefono" className="block">Teléfono</label>
                  <input
                    id="telefono"
                    type="tel"
                    name="telefono"
                    value={saleState.buyerData.telefono}
                    onChange={handleBuyerDataChange}
                    className="w-full p-2 border rounded"
                    placeholder="Teléfono"
                    disabled={isReserved}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={saleState.buyerData.email}
                    onChange={handleBuyerDataChange}
                    className="w-full p-2 border rounded"
                    placeholder="Email"
                    disabled={isReserved}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="direccion" className="block">Dirección</label>
                  <input
                    id="direccion"
                    type="text"
                    name="direccion"
                    value={saleState.buyerData.direccion}
                    onChange={handleBuyerDataChange}
                    className="w-full p-2 border rounded"
                    placeholder="Dirección"
                    disabled={isReserved}
                  />
                </div>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Método de Pago</h3>

            {isReserved && (
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="font-medium">
                  Monto de reserva: <span className="text-blue-700 font-bold">{formatPrice(reservationAmount)}</span>
                </p>
                <p className="font-medium">
                  Monto restante: <span className="text-green-700 font-bold">{formatPrice((moto?.retailPrice ?? 0) - reservationAmount)}</span>
                </p>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Resumen de la moto:</h4>
              <p>
                <span className="font-medium">Moto:</span> {moto?.brand?.name} {moto?.model?.name} ({moto?.year})
              </p>
              <p>
                <span className="font-medium">Precio Total:</span> {formatPrice(moto?.retailPrice ?? 0)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="metodoPago" className="block" id="metodo-pago-label">
                  Método de Pago
                </label>
                <select
                  id="metodoPago"
                  name="metodoPago"
                  value={saleState.paymentData.metodoPago}
                  onChange={handlePaymentDataChange}
                  className="w-full p-2 border rounded"
                  aria-labelledby="metodo-pago-label"
                >
                  <option value="">Seleccionar método</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="financiacion">Financiación</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="cuotas" className="block" id="cuotas-label">
                  Cuotas
                </label>
                <select
                  id="cuotas"
                  name="cuotas"
                  value={saleState.paymentData.cuotas.toString()}
                  onChange={handlePaymentDataChange}
                  className="w-full p-2 border rounded"
                  aria-labelledby="cuotas-label"
                >
                  <option value="1">1 cuota</option>
                  <option value="6">6 cuotas</option>
                  <option value="12">12 cuotas</option>
                  <option value="24">24 cuotas</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="banco" className="block" id="banco-label">
                  Banco
                </label>
                <select
                  id="banco"
                  name="banco"
                  value={saleState.paymentData.banco}
                  onChange={handlePaymentDataChange}
                  className="w-full p-2 border rounded"
                  aria-labelledby="banco-label"
                >
                  <option value="">Seleccionar banco</option>
                  <option value="santander">Santander</option>
                  <option value="bbva">BBVA</option>
                  <option value="galicia">Galicia</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="text-center space-y-4">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Procesando la venta con la API del gobierno...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-green-600">¡Felicitaciones!</h3>
                <p className="text-lg">
                  La moto {moto?.brand?.name} {moto?.model?.name} fue vendida exitosamente.
                </p>
                {isReserved && (
                  <div className="p-4 bg-blue-50 rounded-lg mb-4">
                    <p>Se aplicó un monto de reserva de <span className="font-bold">{formatPrice(reservationAmount)}</span>.</p>
                  </div>
                )}
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="font-medium mb-2">Resumen de la venta:</p>
                  <p><span className="font-medium">Cliente:</span> {saleState.buyerData.nombre} {saleState.buyerData.apellido}</p>
                  <p><span className="font-medium">Moto:</span> {moto?.brand?.name} {moto?.model?.name} ({moto?.year})</p>
                  <p><span className="font-medium">Precio:</span> {formatPrice(moto?.retailPrice ?? 0)}</p>
                  <p><span className="font-medium">Método de pago:</span> {saleState.paymentData.metodoPago}</p>
                  {saleState.paymentData.metodoPago === 'financiacion' && (
                    <p><span className="font-medium">Cuotas:</span> {saleState.paymentData.cuotas}</p>
                  )}
                  <p className="mt-2">Los documentos de la venta serán enviados al email registrado.</p>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Para guardar temporalmente valores modificados localmente
  const saveReservationToLocalStorage = (motorcycleId: number, amount: number) => {
    const key = `reservation-${motorcycleId}`;
    localStorage.setItem(key, amount.toString());
  };

  // Para recuperar valores
  const getReservationFromLocalStorage = (motorcycleId: number) => {
    const key = `reservation-${motorcycleId}`;
    return parseFloat(localStorage.getItem(key) || "0");
  };

  // Al cambiar el valor de reserva
  const handleReservationChange = (motorcycleId: number, amount: number) => {
    startTransition(() => {
      // Actualiza el estado optimista
      // Guarda en localStorage si es necesario
      // Envía la actualización a la base de datos
    });
  };

  if (!moto) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Proceso de Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <Stepper currentStep={saleState.currentStep} steps={steps} />
          <div className="min-h-[400px]">{renderStepContent()}</div>
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={saleState.currentStep === 0}>
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              disabled={saleState.currentStep === steps.length - 1}
              className={saleState.currentStep === 2 ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {saleState.currentStep === 2 ? "Confirmar Venta" : "Siguiente"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

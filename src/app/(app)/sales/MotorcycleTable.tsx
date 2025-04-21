"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Motorcycle, MotorcycleState, Prisma, Brand, Model, Sucursal, Reservation } from "@prisma/client";
import { formatPrice, cn } from "@/lib/utils";
import { useState, useTransition, useOptimistic } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Trash2,
  Pause,
  Play,
  DollarSign,
  BookmarkPlus,
  MoreHorizontal,
  RotateCcw,
  Search,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DeleteConfirmationDialog from "./DeleteDialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { updateMotorcycleStatus } from "@/actions/stock/update-motorcycle-status";
import { ReserveModal } from "./ReserveModal";
import { type Client } from "@/app/(app)/clients/columns";
import { MotorcycleDetailModal, MotorcycleWithReservation } from "./MotorcycleDetailModal";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Extender la interfaz MotorcycleWithReservation para incluir estadoVenta
declare module "./MotorcycleDetailModal" {
  interface MotorcycleWithReservation {
    estadoVenta?: string;
    reservation?: Reservation | null;
  }
}

// Tipo extendido para incluir relaciones
type MotorcycleWithRelations = Motorcycle & {
  brand?: Brand | null;
  model?: Model | null;
  branch?: Sucursal | null;
  estadoVenta?: string;
  reservation?: Reservation | null;
};

interface MotorcycleTableProps {
  initialData: MotorcycleWithRelations[];
  clients: any; // Assuming clients is of type any
}

type SortConfig = {
  key: keyof Pick<Motorcycle, 'id' | 'year' | 'mileage' | 'retailPrice' | 'state' | 'chassisNumber' | 'createdAt' | 'updatedAt'> | null;
  direction: "asc" | "desc" | null;
};

const estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }> = {
  [MotorcycleState.STOCK]: {
    label: "En Stock",
    className: "border-green-500 text-green-500 bg-transparent hover:bg-green-100",
  },
  [MotorcycleState.VENDIDO]: {
    label: "Vendido",
    className: "border-violet-500 text-violet-500 bg-transparent hover:bg-violet-100",
  },
  [MotorcycleState.PAUSADO]: {
    label: "Pausado",
    className: "border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-100",
  },
  [MotorcycleState.RESERVADO]: {
    label: "Reservado",
    className: "border-blue-500 text-blue-500 bg-transparent hover:bg-blue-100",
  },
  [MotorcycleState.PROCESANDO]: {
    label: "Procesando",
    className: "border-orange-500 text-orange-500 bg-transparent hover:bg-orange-100",
  },
  [MotorcycleState.ELIMINADO]: {
    label: "Eliminado",
    className: "border-red-500 text-red-500 bg-transparent hover:bg-red-100",
  },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const actionConfig = {
  vender: {
    label: "Vender",
    icon: DollarSign,
    className: "text-green-600 border-green-600 hover:bg-green-100",
  },
  eliminar: {
    label: "Eliminar",
    icon: Trash2,
    className: "text-red-600 border-red-600 hover:bg-red-100",
  },
  reservar: {
    label: "Reservar",
    icon: BookmarkPlus,
    className: "text-blue-600 border-blue-600 hover:bg-blue-100",
  },
} as const;

// Tipo para la moto actualizada en la reserva
interface ReservationUpdate {
  motorcycleId: number;
  reservationId: number;
  amount: number;
  clientId: string;
}

// Definición de las columnas disponibles en la tabla
type ColumnId = 'chassisId' | 'year' | 'brandModel' | 'displacement' | 'branch' | 'state' | 'price' | 'actions';

interface ColumnDefinition {
  id: ColumnId;
  label: string;
  defaultVisible: boolean;
}

export default function MotorcycleTable({ initialData, clients }: MotorcycleTableProps) {
  console.log("MotorcycleTable initialData:", initialData, "Cantidad:", initialData?.length || 0);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedMoto, setSelectedMoto] = useState<MotorcycleWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [motorcycles, setMotorcycles] = useState<MotorcycleWithRelations[]>(initialData);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedReserveMoto, setSelectedReserveMoto] = useState<MotorcycleWithRelations | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMotoForModal, setSelectedMotoForModal] = useState<MotorcycleWithReservation | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>("todas");
  const [modelFilter, setModelFilter] = useState<string>("todos");
  const [stateFilter, setStateFilter] = useState<MotorcycleState | string>("todos");

  // Definir columnas disponibles y su visibilidad por defecto
  const availableColumns: ColumnDefinition[] = [
    { id: 'brandModel', label: 'Marca / Modelo', defaultVisible: true },
    { id: 'chassisId', label: 'Chasis / ID', defaultVisible: true },
    { id: 'year', label: 'Año', defaultVisible: true },
    { id: 'displacement', label: 'Cilindrada', defaultVisible: true },
    { id: 'branch', label: 'Ubicación', defaultVisible: true },
    { id: 'state', label: 'Estado Venta', defaultVisible: true },
    { id: 'price', label: 'Precio', defaultVisible: true },
    { id: 'actions', label: 'Acciones', defaultVisible: true },
  ];

  // Estado para controlar visibilidad de columnas
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(
    availableColumns.filter(col => col.defaultVisible).map(col => col.id)
  );

  const toggleColumnVisibility = (columnId: ColumnId) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const isColumnVisible = (columnId: ColumnId) => visibleColumns.includes(columnId);

  const [optimisticMotorcycles, addOptimisticUpdate] = useOptimistic(
    motorcycles,
    (state: MotorcycleWithRelations[], optimisticValue: { motorcycleId: number; newStatus: MotorcycleState; reservation?: Reservation | null }) => {
      return state.map((moto) =>
        moto.id === optimisticValue.motorcycleId
          ? {
            ...moto,
            state: optimisticValue.newStatus,
            estadoVenta: optimisticValue.newStatus,
            reservation: optimisticValue.reservation
          }
          : moto,
      );
    },
  );

  const handleSort = (key: NonNullable<SortConfig['key']>) => {
    let direction: "asc" | "desc" | null = "asc";

    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }

    setSortConfig({ key: direction ? key : null, direction });
    setCurrentPage(1); // Resetear a la primera página al ordenar
  };

  const getFilteredData = () => {
    let filtered = [...optimisticMotorcycles];

    // Aplicar filtro por marca
    if (brandFilter && brandFilter !== "todas") {
      filtered = filtered.filter(moto =>
        moto.brand?.name?.toLowerCase().includes(brandFilter.toLowerCase())
      );
    }

    // Aplicar filtro por modelo
    if (modelFilter && modelFilter !== "todos") {
      filtered = filtered.filter(moto =>
        moto.model?.name?.toLowerCase().includes(modelFilter.toLowerCase())
      );
    }

    // Aplicar filtro por estado
    if (stateFilter && stateFilter !== "todos") {
      filtered = filtered.filter(moto => moto.state === stateFilter);
    }

    return filtered;
  };

  const getSortedData = () => {
    const filteredData = getFilteredData();

    if (!sortConfig.key || !sortConfig.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const key = sortConfig.key as NonNullable<SortConfig['key']>;
      const aValue = a[key] ?? (typeof a[key] === 'number' ? 0 : "");
      const bValue = b[key] ?? (typeof b[key] === 'number' ? 0 : "");

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
      }
      return 0;
    });
  };

  const getSortIcon = (key: NonNullable<SortConfig['key']>) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const sortedData = getSortedData();
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    const totalPages = Math.ceil((getSortedData() ?? []).length / pageSize);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
    setCurrentPage(1); // Resetear a la primera página al cambiar el tamaño
  };

  const handleToggleStatus = (motoId: number, currentStatus: MotorcycleState) => {
    let newStatus: MotorcycleState;
    let actionLabel: string;

    if (currentStatus === MotorcycleState.ELIMINADO) {
      newStatus = MotorcycleState.STOCK;
      actionLabel = "restaurando";
    } else if (currentStatus === MotorcycleState.STOCK) {
      newStatus = MotorcycleState.PAUSADO;
      actionLabel = "pausando";
    } else {
      newStatus = MotorcycleState.STOCK;
      actionLabel = "activando";
    }

    startTransition(async () => {
      addOptimisticUpdate({ motorcycleId: motoId, newStatus, reservation: null });
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);

        if (result.success) {
          setMotorcycles((current) =>
            current.map((moto) =>
              moto.id === motoId ? { ...moto, state: newStatus, estadoVenta: newStatus, reservation: null } : moto,
            ),
          );

          toast({
            title: "Estado Actualizado",
            description: `Moto ${actionLabel === "restaurando" ? "restaurada a stock" : (actionLabel === "pausando" ? "pausada" : "activada")} correctamente.`,
          });
        } else {
          setMotorcycles((current) => [...current]);

          toast({
            variant: "destructive",
            title: "Error al actualizar",
            description: result.error || "No se pudo cambiar el estado.",
          });
        }
      } catch (error) {
        setMotorcycles((current) => [...current]);

        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Ocurrió un error al actualizar el estado.",
        });
      }
    });
  };

  const handleSetEliminado = (motoId: number) => {
    const newStatus = MotorcycleState.ELIMINADO;
    startTransition(async () => {
      addOptimisticUpdate({ motorcycleId: motoId, newStatus, reservation: null });
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);
        if (result.success) {
          setMotorcycles((current) =>
            current.map((moto) =>
              moto.id === motoId ? { ...moto, state: newStatus, estadoVenta: newStatus, reservation: null } : moto,
            ),
          );
          toast({ title: "Moto Eliminada", description: "La moto ha sido marcada como eliminada (lógicamente)." });
        } else {
          setMotorcycles((current) => [...current]);

          toast({
            variant: "destructive",
            title: "Error al actualizar",
            description: result.error || "No se pudo cambiar el estado.",
          });
        }
      } catch (error) {
        setMotorcycles((current) => [...current]);

        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Ocurrió un error al actualizar el estado.",
        });
      }
    });
  };

  const handleAction = (action: 'vender' | 'reservar' | 'eliminarLogico', moto: MotorcycleWithReservation) => {
    // Determinar el estado real (estadoVenta tiene prioridad sobre state)
    const estado = moto.estadoVenta as MotorcycleState || moto.state;

    if (action === 'eliminarLogico') {
      setSelectedMoto(moto as MotorcycleWithRelations);
      setShowDeleteDialog(true);
    } else if (action === "vender") {
      const newStatus = MotorcycleState.PROCESANDO;

      addOptimisticUpdate({ motorcycleId: moto.id, newStatus, reservation: null });

      startTransition(async () => {
        try {
          const result = await updateMotorcycleStatus(moto.id, newStatus);

          if (result.success) {
            setMotorcycles((current) =>
              current.map((m) => (m.id === moto.id ? { ...m, state: newStatus } : m)),
            );

            router.push(`/sales/${moto.id}`);
          } else {
            setMotorcycles((current) => [...current]);

            toast({
              variant: "destructive",
              title: "Error al actualizar estado",
              description: result.error || "No se pudo cambiar el estado a PROCESANDO.",
            });
          }
        } catch (error) {
          setMotorcycles((current) => [...current]);

          toast({
            variant: "destructive",
            title: "Error inesperado",
            description: "Ocurrió un error al preparar la moto para venta.",
          });
        }
      });
    } else if (action === "reservar") {
      setSelectedReserveMoto(moto);
      setShowReserveModal(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedMoto) {
      handleSetEliminado(Number(selectedMoto.id));
      setShowDeleteDialog(false);
      setSelectedMoto(null);
    }
  };

  const handleReserved = (updatedMoto: ReservationUpdate) => {
    // Usar startTransition para envolver todas las actualizaciones de estado
    startTransition(() => {
      // Actualizar estado local con la moto reservada
      setMotorcycles((prev) =>
        prev.map((m) =>
          m.id === updatedMoto.motorcycleId
            ? {
              ...m,
              state: MotorcycleState.RESERVADO,
              estadoVenta: MotorcycleState.RESERVADO,
              reservation: {
                id: updatedMoto.reservationId,
                amount: updatedMoto.amount,
                motorcycleId: updatedMoto.motorcycleId,
                clientId: updatedMoto.clientId,
                expirationDate: null,
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                organizationId: m.organizationId,
                notes: null,
                paymentMethod: null
              }
            }
            : m
        )
      );

      // Actualizar UI de forma optimista
      addOptimisticUpdate({
        motorcycleId: updatedMoto.motorcycleId,
        newStatus: MotorcycleState.RESERVADO,
        reservation: {
          id: updatedMoto.reservationId,
          amount: updatedMoto.amount,
          motorcycleId: updatedMoto.motorcycleId,
          clientId: updatedMoto.clientId,
          expirationDate: null,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: motorcycles.find(m => m.id === updatedMoto.motorcycleId)?.organizationId || "",
          notes: null,
          paymentMethod: null
        }
      });

      toast({
        title: "Moto reservada",
        description: "La moto ha sido reservada correctamente.",
      });
    });
  };

  const handleCancelProcess = (motoId: number) => {
    // Cambiar a STOCK al cancelar
    const newStatus = MotorcycleState.STOCK;

    // Actualización optimista
    addOptimisticUpdate({ motorcycleId: motoId, newStatus: newStatus, reservation: null });

    startTransition(async () => {
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);

        if (result.success) {
          // Confirmar la actualización en el estado real
          setMotorcycles((current) =>
            current.map((moto) =>
              moto.id === motoId ? {
                ...moto,
                state: newStatus,
                estadoVenta: newStatus,
                reservation: null
              } : moto,
            ),
          );
          toast({
            title: "Proceso Cancelado",
            description: `El proceso de venta para la moto ha sido cancelado.`,
          });
        } else {
          // Error devuelto por la acción del servidor
          toast({
            variant: "destructive",
            title: "Error al Cancelar",
            description: result.error || "No se pudo cancelar el proceso de la moto.",
          });
        }
      } catch (error) {
        // Error inesperado durante la transición
        toast({
          variant: "destructive",
          title: "Error Inesperado",
          description: "Ocurrió un error al intentar cancelar el proceso.",
        });
        console.error("Error cancelando proceso:", error);
      }
    });
  };

  const handleOpenDetailModal = (moto: MotorcycleWithReservation) => {
    setSelectedMotoForModal(moto);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMotoForModal(null);
  };

  const ActionButtons = ({ moto }: { moto: MotorcycleWithReservation }) => {
    // Usar estadoVenta si está disponible, sino usar state
    const estado = moto.estadoVenta as MotorcycleState || moto.state;

    const isEliminado = estado === MotorcycleState.ELIMINADO;
    const canToggleStatus =
      estado === MotorcycleState.STOCK || estado === MotorcycleState.PAUSADO;
    const isPaused = estado === MotorcycleState.PAUSADO;
    const canSell = estado === MotorcycleState.STOCK;
    const isReserved = estado === MotorcycleState.RESERVADO;
    const isProcessing = estado === MotorcycleState.PROCESANDO;

    // --- ESTADO ELIMINADO --- 
    if (isEliminado) {
      return (
        <div className="hidden xl:flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-100"
            onClick={() => handleToggleStatus(Number(moto.id), estado)}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
          </Button>
        </div>
      );
    }

    // --- ESTADO RESERVADO --- 
    if (isReserved) {
      return (
        <div className="hidden xl:flex flex-col gap-2">
          <div className="font-bold text-blue-600 mb-1">
            Reserva: ${moto.reservation?.amount || 0}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-100"
              onClick={() => router.push(`/sales/${moto.id}?reserved=true&amount=${moto.reservation?.amount || 0}&clientId=${moto.reservation?.clientId || ''}`)}
            >
              <DollarSign className="h-4 w-4" />
              Continuar compra
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-100"
              onClick={() => handleToggleStatus(Number(moto.id), estado)}
            >
              <Trash2 className="h-4 w-4" />
              Cancelar reserva
            </Button>
          </div>
        </div>
      );
    }

    // --- ESTADO PROCESANDO --- 
    if (isProcessing) {
      return (
        <div className="hidden xl:flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-1 text-blue-600 border-blue-600 hover:bg-blue-100"
            onClick={() => router.push(`/sales/${moto.id}`)}
          >
            <Play className="mr-2 h-4 w-4" /> Continuar proceso
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-100"
            onClick={() => handleCancelProcess(Number(moto.id))}
          >
            <Trash2 className="h-4 w-4" /> Cancelar proceso
          </Button>
        </div>
      );
    }

    // --- ESTADOS NORMALES (STOCK, PAUSADO) --- 
    return (
      <div className="hidden xl:flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full flex items-center gap-1", actionConfig.vender.className)}
            onClick={() => handleAction("vender", moto)}
            disabled={(moto.estadoVenta || moto.state) !== MotorcycleState.STOCK || isPending}
          >
            <actionConfig.vender.icon className="h-4 w-4" />
            {actionConfig.vender.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full flex items-center gap-1", actionConfig.eliminar.className)}
            onClick={() => handleAction("eliminarLogico", moto)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full flex items-center gap-1",
              isPaused
                ? "text-green-600 border-green-600 hover:bg-green-100"
                : "text-yellow-600 border-yellow-600 hover:bg-yellow-100",
            )}
            onClick={() => handleToggleStatus(Number(moto.id), estado)}
            disabled={!canToggleStatus || isPending}
          >
            {isPaused ? (
              <>
                <Play className="mr-2 h-4 w-4" /> Activar
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" /> Pausar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full flex items-center gap-1", actionConfig.reservar.className)}
            onClick={() => handleAction("reservar", moto)}
            disabled={isPaused || isPending}
          >
            <actionConfig.reservar.icon className="h-4 w-4" />
            {actionConfig.reservar.label}
          </Button>
        </div>
      </div>
    );
  };

  const ActionMenu = ({ moto }: { moto: MotorcycleWithReservation }) => {
    // Usar estadoVenta si está disponible, sino usar state
    const estado = moto.estadoVenta as MotorcycleState || moto.state;

    const isEliminado = estado === MotorcycleState.ELIMINADO;
    const canBePausedOrActivated =
      estado === MotorcycleState.STOCK || estado === MotorcycleState.PAUSADO;
    const isPaused = estado === MotorcycleState.PAUSADO;
    const canSell = estado === MotorcycleState.STOCK;
    const isReserved = estado === MotorcycleState.RESERVADO;
    const isProcessing = estado === MotorcycleState.PROCESANDO;

    return (
      <div className="xl:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {isEliminado ? (
              <DropdownMenuItem
                onClick={() => handleToggleStatus(Number(moto.id), estado)}
                className="text-green-600 focus:text-green-700 focus:bg-green-100"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
              </DropdownMenuItem>
            ) : isProcessing ? (
              <>
                <DropdownMenuItem
                  onClick={() => router.push(`/sales/${moto.id}`)}
                  className="text-blue-600 focus:text-blue-700 focus:bg-blue-100"
                >
                  Continuar proceso
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCancelProcess(Number(moto.id))}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  Cancelar
                </DropdownMenuItem>
              </>
            ) : isReserved ? (
              <>
                <DropdownMenuItem
                  onClick={() => handleCancelProcess(Number(moto.id))}
                  className="text-yellow-600 focus:text-yellow-700 focus:bg-yellow-100"
                >
                  Quitar Reserva
                </DropdownMenuItem>
              </>
            ) : (
              <>
                {canBePausedOrActivated && (
                  <DropdownMenuItem
                    onClick={() => handleToggleStatus(Number(moto.id), estado)}
                    className={cn(
                      isPaused
                        ? "text-green-600 focus:text-green-700 focus:bg-green-100"
                        : "text-yellow-600 focus:text-yellow-700 focus:bg-yellow-100",
                    )}
                  >
                    {isPaused ? (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Activar
                      </>
                    ) : (
                      <>
                        <Pause className="mr-2 h-4 w-4" /> Pausar
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {!isReserved && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedReserveMoto(moto);
                      setShowReserveModal(true);
                    }}
                    className="text-blue-600 focus:text-blue-700 focus:bg-blue-100"
                  >
                    <BookmarkPlus className="mr-2 h-4 w-4" /> Reservar
                  </DropdownMenuItem>
                )}
                {canSell && (
                  <DropdownMenuItem
                    onClick={() => handleAction("vender", moto)}
                    className="text-green-600 focus:text-green-700 focus:bg-green-100"
                  >
                    <DollarSign className="mr-2 h-4 w-4" /> Vender
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleAction("eliminarLogico", moto)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // Lista de marcas disponibles (únicas)
  const availableBrands = [...new Set(optimisticMotorcycles
    .filter(moto => moto.brand?.name)
    .map(moto => moto.brand?.name))]
    .filter((name): name is string => name !== undefined && name !== "")
    .sort();

  // Lista de modelos disponibles (únicos)
  const availableModels = [...new Set(optimisticMotorcycles
    .filter(moto => moto.model?.name)
    .map(moto => moto.model?.name))]
    .filter((name): name is string => name !== undefined && name !== "")
    .sort();

  return (
    <div>
      <DeleteConfirmationDialog
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        selectedMoto={selectedMoto}
        handleDelete={handleDeleteConfirm}
      />
      <ReserveModal
        open={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        motorcycleId={selectedReserveMoto?.id ? Number(selectedReserveMoto.id) : 0}
        clients={clients}
        onReserved={handleReserved}
      />
      <MotorcycleDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        motorcycle={selectedMotoForModal}
        onToggleStatus={handleToggleStatus}
        onSetEliminado={handleSetEliminado}
        onAction={handleAction}
        onCancelProcess={handleCancelProcess}
        onNavigateToSale={(id) => router.push(`/sales/${id}`)}
        estadoVentaConfig={estadoVentaConfig}
      />
      <div className="flex flex-wrap gap-3 mb-4 items-center bg-muted/20 p-3 rounded-md">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Marca:</label>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las marcas</SelectItem>
              {availableBrands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Modelo:</label>
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los modelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los modelos</SelectItem>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Estado:</label>
          <Select value={stateFilter} onValueChange={(value) => setStateFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {Object.values(MotorcycleState).map((state) => (
                <SelectItem key={state} value={state}>
                  {estadoVentaConfig[state]?.label || state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto mr-2">
              <Settings className="h-4 w-4 mr-2" />
              Columnas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Mostrar/Ocultar Columnas</h4>
                <p className="text-sm text-muted-foreground">
                  Selecciona las columnas que deseas ver
                </p>
              </div>
              <div className="grid gap-2">
                {availableColumns.map((column) => (
                  <div key={column.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column.id}`}
                      checked={isColumnVisible(column.id)}
                      onCheckedChange={() => toggleColumnVisibility(column.id)}
                    />
                    <Label htmlFor={`column-${column.id}`}>{column.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setBrandFilter("todas");
            setModelFilter("todos");
            setStateFilter("todos");
          }}
        >
          Limpiar filtros
        </Button>
      </div>
      <div className="flex items-center justify-between p-4 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Motos por página:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
            <SelectContent>{PAGE_SIZE_OPTIONS.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de{" "}
          {sortedData.length} motos
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {isColumnVisible('brandModel') && (
              <TableHead>Marca / Modelo</TableHead>
            )}
            {isColumnVisible('chassisId') && (
              <TableHead>Chasis / ID</TableHead>
            )}
            {isColumnVisible('year') && (
              <TableHead className="w-[100px]">
                <Button variant="ghost" onClick={() => handleSort("year")} className="p-0 hover:bg-muted">
                  Año {getSortIcon("year")}
                </Button>
              </TableHead>
            )}
            {isColumnVisible('displacement') && (
              <TableHead>Cilindrada</TableHead>
            )}
            {isColumnVisible('branch') && (
              <TableHead>Ubicación</TableHead>
            )}
            {isColumnVisible('state') && (
              <TableHead className="w-[130px] text-center">
                <Button variant="ghost" onClick={() => handleSort("state")} className="flex items-center justify-center w-full p-0 hover:bg-muted">
                  Estado Venta {getSortIcon("state")}
                </Button>
              </TableHead>
            )}
            {isColumnVisible('price') && (
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => handleSort("retailPrice")} className="flex items-center justify-end w-full p-0 hover:bg-muted">
                  Precio {getSortIcon("retailPrice")}
                </Button>
              </TableHead>
            )}
            {isColumnVisible('actions') && (
              <TableHead>Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                No se encontraron motocicletas con los filtros actuales.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((moto) => (
              <TableRow key={moto.id} className="cursor-pointer hover:bg-muted/50 relative" onDoubleClick={() => handleOpenDetailModal(moto as MotorcycleWithReservation)}>
                {isColumnVisible('brandModel') && (
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-base font-bold uppercase">{moto.brand?.name || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground">{moto.model?.name || 'N/A'}</span>
                    </div>
                  </TableCell>
                )}
                {isColumnVisible('chassisId') && (
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{moto.chassisNumber}</span>
                      <span className="text-xs text-muted-foreground">ID: {moto.id}</span>
                    </div>
                  </TableCell>
                )}
                {isColumnVisible('year') && (
                  <TableCell className="w-[100px]">{moto.year}</TableCell>
                )}
                {isColumnVisible('displacement') && (
                  <TableCell>{moto.displacement ?? 'N/A'} cc</TableCell>
                )}
                {isColumnVisible('branch') && (
                  <TableCell className="text-muted-foreground">
                    {moto.branch?.name || 'N/A'}
                  </TableCell>
                )}
                {isColumnVisible('state') && (
                  <TableCell className="w-[130px] text-center">
                    {(() => {
                      // Verificar si es un objeto completo con estadoVenta
                      if (moto.estadoVenta && typeof moto.estadoVenta === 'string') {
                        // Usar estadoVenta como estado
                        const stateKey = moto.estadoVenta as MotorcycleState;

                        return (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal whitespace-nowrap",
                              estadoVentaConfig[stateKey]?.className || "border-gray-500 text-gray-500"
                            )}
                          >
                            {estadoVentaConfig[stateKey]?.label || stateKey || "Desconocido"}
                          </Badge>
                        );
                      }
                      // Fallback al estado tradicional
                      else if (moto.state && typeof moto.state === 'string') {
                        const stateKey = moto.state as MotorcycleState;

                        return (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal whitespace-nowrap",
                              estadoVentaConfig[stateKey]?.className || "border-gray-500 text-gray-500"
                            )}
                          >
                            {estadoVentaConfig[stateKey]?.label || stateKey || "Desconocido"}
                          </Badge>
                        );
                      }

                      return <Badge variant="outline" className="border-gray-500 text-gray-500">Desconocido</Badge>;
                    })()}
                  </TableCell>
                )}
                {isColumnVisible('price') && (
                  <TableCell className="text-right font-medium">{formatPrice(moto.retailPrice)}</TableCell>
                )}
                {isColumnVisible('actions') && (
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <ActionButtons moto={moto as MotorcycleWithReservation} />
                      <ActionMenu moto={moto as MotorcycleWithReservation} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="p-4 border-t">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>

            {Array.from({ length: Math.min(5, Math.ceil(sortedData.length / pageSize)) }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={currentPage === pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {Math.ceil(sortedData.length / pageSize) > 5 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext onClick={() => handlePageChange(currentPage + 1)} className={currentPage === Math.ceil(sortedData.length / pageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

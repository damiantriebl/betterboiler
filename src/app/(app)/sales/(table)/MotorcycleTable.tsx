"use client";

import type { MotorcycleTableData } from "@/actions/sales/get-motorcycles-unified";
import { updateMotorcycleStatus } from "@/actions/stock";
import { OtpDialog } from "@/components/custom/OtpDialog";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/ui/price-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMotorcycleFiltersStore } from "@/stores/motorcycle-filters-store";
import { useSecurityStore } from "@/stores/security-store";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import { estadoVentaConfig } from "@/types/motorcycle";
import type { MotorcycleWithFullDetails, ReservationWithDetails } from "@/types/motorcycle";
import { type Client, type CurrentAccount, type Motorcycle, MotorcycleState } from "@prisma/client";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import DeleteConfirmationDialog from "../DeleteDialog";
import { MotorcycleDetailModal } from "../MotorcycleDetailModal";
import { ColumnSelector } from "./ColumnSelector";
import FilterSection from "./FilterSection";
import { ActionButtons, ActionMenu } from "./MotorcycleActions";
import MotorcycleRow from "./MotorcycleRow";
import MotorcycleStatusBadge from "./MotorcycleStatusBadge";
import PaginationControl from "./PaginationControl";

// Definición de Props para MotorcycleTable
interface MotorcycleTableProps {
  initialData: MotorcycleWithFullDetails[];
  clients: Client[];
  activePromotions: BankingPromotionDisplay[];
  onInitiateSale?: (motorcycle: MotorcycleWithFullDetails) => void;
  onInitiateReservation?: (motorcycle: MotorcycleWithFullDetails) => void;
  onMotorcycleUpdate?: (motorcycleId: number, newState: MotorcycleState) => void;
  onFilterChange?: (selectedStates: MotorcycleState[]) => Promise<void>;
  onCurrentStatesChange?: (currentStates: MotorcycleState[]) => void;
  isLoading?: boolean;
}

type SortableKey = keyof Pick<
  Motorcycle,
  "id" | "year" | "mileage" | "retailPrice" | "state" | "chassisNumber" | "createdAt" | "updatedAt"
>;

type ManualColumnId =
  | "brandModel"
  | "chassisId"
  | "year"
  | "displacement"
  | "branch"
  | "state"
  | "price"
  | "actions";
interface ManualColumnDefinition {
  id: ManualColumnId;
  label: string;
  isSortable?: boolean;
  sortKey?: SortableKey;
}

const AVAILABLE_COLUMNS: ManualColumnDefinition[] = [
  { id: "brandModel", label: "Marca / Modelo" },
  { id: "chassisId", label: "Chasis / ID" },
  { id: "year", label: "Año", isSortable: true, sortKey: "year" },
  { id: "displacement", label: "Cilindrada" },
  { id: "branch", label: "Ubicación" },
  { id: "state", label: "Estado Venta", isSortable: true, sortKey: "state" },
  { id: "price", label: "Precio", isSortable: true, sortKey: "retailPrice" },
  { id: "actions", label: "Acciones" },
];

const DEFAULT_VISIBLE_COLUMNS: ManualColumnId[] = AVAILABLE_COLUMNS.map((col) => col.id);
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function MotorcycleTable({
  initialData,
  clients,
  activePromotions,
  onInitiateSale,
  onInitiateReservation,
  onMotorcycleUpdate,
  onFilterChange,
  onCurrentStatesChange,
  isLoading,
}: MotorcycleTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Usar el store de filtros
  const {
    filters,
    currentPage,
    pageSize,
    sortConfig,
    setCurrentPage,
    setPageSize,
    setSortConfig,
    initializeFromData,
  } = useMotorcycleFiltersStore();

  const [motorcycles, setMotorcycles] = useState<MotorcycleWithFullDetails[]>(initialData);
  const [selectedMotoToDelete, setSelectedMotoToDelete] =
    useState<MotorcycleWithFullDetails | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMotoForModal, setSelectedMotoForModal] =
    useState<MotorcycleWithFullDetails | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ManualColumnId[]>(DEFAULT_VISIBLE_COLUMNS);

  // Estados para OTP y seguridad
  const { secureMode } = useSecurityStore();
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    motorcycleId: number;
    newStatus: MotorcycleState;
    currentStatus: MotorcycleState;
  } | null>(null);

  const [optimisticMotorcycles, addOptimisticUpdate] = useOptimistic(
    motorcycles,
    (
      state: MotorcycleWithFullDetails[],
      optimisticValue: { motorcycleId: number; newStatus: MotorcycleState },
    ) => {
      return state.map((moto) =>
        moto.id === optimisticValue.motorcycleId
          ? { ...moto, state: optimisticValue.newStatus }
          : moto,
      );
    },
  );

  // Inicializar el store con los datos cuando cambien
  useEffect(() => {
    console.log("[DEBUG] initialData changed, initializing store");
    initializeFromData(initialData);
    setMotorcycles(initialData);
  }, [initialData, initializeFromData]);

  // Notificar al padre sobre los estados del filtro cuando cambien
  useEffect(() => {
    if (onCurrentStatesChange) {
      console.log("[DEBUG] Notificando estados del filtro al padre:", filters.estadosVenta);
      onCurrentStatesChange(filters.estadosVenta);
    }
  }, [filters.estadosVenta, onCurrentStatesChange]);

  // 🚀 OPTIMIZACIÓN: Memoizar filtrado de datos
  const filteredData = useMemo(() => {
    let filtered = [...optimisticMotorcycles];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (moto) =>
          moto.brand?.name?.toLowerCase().includes(search) ||
          moto.model?.name?.toLowerCase().includes(search) ||
          moto.chassisNumber?.toLowerCase().includes(search),
      );
    }
    if (filters.marca !== "todas") {
      filtered = filtered.filter((moto) => moto.brand?.name === filters.marca);
    }
    if (filters.tipo !== "todos") {
      filtered = filtered.filter((moto) => moto.model?.name === filters.tipo);
    }
    if (filters.ubicacion !== "todas") {
      filtered = filtered.filter((moto) => moto.branch?.name === filters.ubicacion);
    }
    if (
      filters.estadosVenta.length > 0 &&
      filters.estadosVenta.length < Object.values(MotorcycleState).length
    ) {
      filtered = filtered.filter((moto) => filters.estadosVenta.includes(moto.state));
    }
    if (filters.years.length > 0) {
      filtered = filtered.filter((moto) => filters.years.includes(moto.year));
    }

    return filtered;
  }, [optimisticMotorcycles, filters]);

  // 🚀 OPTIMIZACIÓN: Memoizar ordenamiento
  const sortedData = useMemo(() => {
    const { key, direction } = sortConfig;

    if (!key || !direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[key as keyof MotorcycleWithFullDetails];
      const bValue = b[key as keyof MotorcycleWithFullDetails];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === "asc" ? -1 : 1;
      if (bValue == null) return direction === "asc" ? 1 : -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredData, sortConfig]);

  // 🚀 OPTIMIZACIÓN: Paginación eficiente
  const { paginatedData, totalPages, totalItems } = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = sortedData.slice(startIndex, endIndex);
    const pages = Math.ceil(sortedData.length / pageSize);

    return {
      paginatedData: paginated,
      totalPages: pages,
      totalItems: sortedData.length,
    };
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (column: ManualColumnDefinition) => {
    if (!column.isSortable || !column.sortKey) return;
    const key = column.sortKey;

    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }

    setSortConfig({ key: direction ? key : null, direction });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
  };

  const handleFilterChange = async (
    filterType: string,
    value: string | MotorcycleState[] | number[],
  ) => {
    // Si es un cambio en estadosVenta, notificar al componente padre
    if (filterType === "estadosVenta" && Array.isArray(value)) {
      const statesValue = value as MotorcycleState[];

      // Si tenemos un callback de recarga, usarlo
      if (onFilterChange) {
        try {
          await onFilterChange(statesValue);
        } catch (error) {
          console.error("Error en recarga de datos:", error);
        }
      }
    }
  };

  const handleColumnToggle = (columnId: ManualColumnId) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId) ? prev.filter((col) => col !== columnId) : [...prev, columnId],
    );
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

    // Verificar si es una transición crítica que requiere OTP
    const requiresOtp =
      secureMode &&
      ((currentStatus === MotorcycleState.VENDIDO && newStatus === MotorcycleState.STOCK) ||
        (currentStatus === MotorcycleState.ELIMINADO && newStatus === MotorcycleState.STOCK));

    console.log("[DEBUG] OTP verification:", {
      secureMode,
      currentStatus,
      newStatus,
      requiresOtp,
    });

    if (requiresOtp) {
      console.log(
        "[DEBUG] Showing OTP dialog for critical transition:",
        currentStatus,
        "→",
        newStatus,
      );
      setPendingStatusChange({
        motorcycleId: motoId,
        newStatus,
        currentStatus: currentStatus,
      });
      setShowOtpDialog(true);
      setOtpError("");
      return;
    }

    // Ejecutar la transición directamente si no requiere OTP
    executeStatusChange(motoId, newStatus, currentStatus, actionLabel);
  };

  // Nueva función para ejecutar el cambio de estado
  const executeStatusChange = (
    motoId: number,
    newStatus: MotorcycleState,
    currentStatus: MotorcycleState,
    actionLabel: string,
    otp?: string,
  ) => {
    startTransition(async () => {
      addOptimisticUpdate({ motorcycleId: motoId, newStatus });
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus, {
          secureMode,
          otp,
        });

        if (result.success) {
          // Usar el callback del componente padre si está disponible
          if (onMotorcycleUpdate) {
            onMotorcycleUpdate(motoId, newStatus);
          } else {
            // Fallback al estado local si no hay callback
            setMotorcycles((current) =>
              current.map((moto) => (moto.id === motoId ? { ...moto, state: newStatus } : moto)),
            );
          }

          toast({
            title: "Estado Actualizado",
            description: `Moto ${actionLabel === "restaurando" ? "restaurada a stock" : actionLabel === "pausando" ? "pausada" : "activada"} correctamente.`,
          });
        } else {
          // Si requiere OTP y no se proporcionó, mostrar el modal
          if (result.requiresOtp && !otp) {
            setPendingStatusChange({
              motorcycleId: motoId,
              newStatus,
              currentStatus,
            });
            setShowOtpDialog(true);
            setOtpError("");
            return;
          }

          // En caso de error, revertir el cambio optimistic al estado original
          if (!onMotorcycleUpdate) {
            setMotorcycles((current) =>
              current.map((moto) =>
                moto.id === motoId ? { ...moto, state: currentStatus } : moto,
              ),
            );
          }

          toast({
            variant: "destructive",
            title: "Error al actualizar",
            description: result.error || "No se pudo cambiar el estado.",
          });
        }
      } catch (error) {
        // En caso de error, revertir el cambio optimistic al estado original
        if (!onMotorcycleUpdate) {
          setMotorcycles((current) =>
            current.map((moto) => (moto.id === motoId ? { ...moto, state: currentStatus } : moto)),
          );
        }

        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Ocurrió un error al actualizar el estado.",
        });
      }
    });
  };

  // Handler para confirmar OTP
  const handleOtpConfirm = async (otp: string) => {
    if (!pendingStatusChange) return;

    setOtpLoading(true);
    setOtpError("");

    try {
      const { motorcycleId, newStatus, currentStatus } = pendingStatusChange;

      let actionLabel: string;
      if (currentStatus === MotorcycleState.ELIMINADO) {
        actionLabel = "restaurando";
      } else if (currentStatus === MotorcycleState.STOCK) {
        actionLabel = "pausando";
      } else {
        actionLabel = "activando";
      }

      // Ejecutar la transición con OTP
      await executeStatusChange(motorcycleId, newStatus, currentStatus, actionLabel, otp);

      // Cerrar el modal OTP
      setShowOtpDialog(false);
      setPendingStatusChange(null);
    } catch (error) {
      setOtpError("Error al validar el código OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSetEliminado = (motoId: number) => {
    const newStatus = MotorcycleState.ELIMINADO;
    const originalState = motorcycles.find((m) => m.id === motoId)?.state;

    startTransition(async () => {
      addOptimisticUpdate({ motorcycleId: motoId, newStatus });
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);
        if (result.success) {
          // Usar el callback del componente padre si está disponible
          if (onMotorcycleUpdate) {
            onMotorcycleUpdate(motoId, newStatus);
          } else {
            // Fallback al estado local si no hay callback
            setMotorcycles((current) =>
              current.map((moto) => (moto.id === motoId ? { ...moto, state: newStatus } : moto)),
            );
          }
          toast({
            title: "Moto Eliminada",
            description: "La moto ha sido marcada como eliminada (lógicamente).",
          });
        } else {
          // En caso de error, revertir el cambio optimistic al estado original
          if (!onMotorcycleUpdate && originalState) {
            setMotorcycles((current) =>
              current.map((moto) =>
                moto.id === motoId ? { ...moto, state: originalState } : moto,
              ),
            );
          }

          toast({
            variant: "destructive",
            title: "Error al actualizar",
            description: result.error || "No se pudo cambiar el estado.",
          });
        }
      } catch (error) {
        // En caso de error, revertir el cambio optimistic al estado original
        if (!onMotorcycleUpdate && originalState) {
          setMotorcycles((current) =>
            current.map((moto) => (moto.id === motoId ? { ...moto, state: originalState } : moto)),
          );
        }

        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Ocurrió un error al actualizar el estado.",
        });
      }
    });
  };

  const handleAction = (
    action: "vender" | "reservar" | "eliminarLogico",
    moto: MotorcycleWithFullDetails,
  ) => {
    if (action === "eliminarLogico") {
      setSelectedMotoToDelete(moto as MotorcycleWithFullDetails);
      setShowDeleteDialog(true);
    } else if (action === "vender") {
      if (onInitiateSale) {
        onInitiateSale(moto as MotorcycleWithFullDetails);
      } else {
        router.push(`/sales/${moto.id}`);
      }
    } else if (action === "reservar") {
      if (onInitiateReservation) {
        onInitiateReservation(moto as MotorcycleWithFullDetails);
      } else {
        console.warn("No se ha proporcionado onInitiateReservation callback");
        router.push(`/reservations/new?motorcycleId=${moto.id}`);
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedMotoToDelete) {
      handleSetEliminado(Number(selectedMotoToDelete.id));
      setShowDeleteDialog(false);
      setSelectedMotoToDelete(null);
    }
  };

  const handleCancelProcess = (motoId: number) => {
    const newStatus = MotorcycleState.STOCK;

    startTransition(async () => {
      addOptimisticUpdate({ motorcycleId: motoId, newStatus });
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);
        if (result.success) {
          setMotorcycles((current) =>
            current.map((moto) =>
              moto.id === motoId
                ? {
                    ...moto,
                    state: newStatus,
                  }
                : moto,
            ),
          );
          toast({
            title: "Proceso Cancelado",
            description: "El proceso de venta para la moto ha sido cancelado.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error al Cancelar",
            description: result.error || "No se pudo cancelar el proceso de la moto.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error Inesperado",
          description: "Ocurrió un error al intentar cancelar el proceso.",
        });
        console.error("Error cancelando proceso:", error);
      }
    });
  };

  const handleOpenDetailModal = (moto: MotorcycleWithFullDetails) => {
    const motoWithModelData = {
      ...moto,
      model: moto.model
        ? {
            ...moto.model,
            imageUrl: moto.model.imageUrl || null,
          }
        : null,
    };
    console.log("handleOpenDetailModal - Moto data:", JSON.stringify(motoWithModelData, null, 2));
    setSelectedMotoForModal(motoWithModelData);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMotoForModal(null);
  };

  const getSortIcon = (columnKey: SortableKey | undefined) => {
    if (!columnKey || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 text-muted-foreground opacity-50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div>
      <DeleteConfirmationDialog
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        selectedMoto={selectedMotoToDelete}
        handleDelete={handleDeleteConfirm}
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
        onEdit={(id) => router.push(`/stock/edit/${id}`)}
        estadoVentaConfig={estadoVentaConfig}
      />
      <OtpDialog
        open={showOtpDialog}
        onOpenChange={(open) => {
          setShowOtpDialog(open);
          if (!open) {
            setPendingStatusChange(null);
            setOtpError("");
          }
        }}
        onConfirm={handleOtpConfirm}
        title="Verificación de Seguridad Requerida"
        description={
          pendingStatusChange?.currentStatus === MotorcycleState.VENDIDO
            ? "Estás intentando devolver una motocicleta VENDIDA a STOCK. Esta es una operación crítica que requiere verificación adicional."
            : pendingStatusChange?.currentStatus === MotorcycleState.ELIMINADO
              ? "Estás intentando restaurar una motocicleta ELIMINADA a STOCK. Esta es una operación crítica que requiere verificación adicional."
              : "Esta es una operación crítica que requiere verificación adicional."
        }
        isLoading={otpLoading}
        error={otpError}
      />

      {/* Overlay de loading */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Cargando motocicletas...</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <FilterSection onFilterChange={handleFilterChange} />
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Motos por página:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ColumnSelector
          columns={AVAILABLE_COLUMNS}
          visibleColumns={visibleColumns}
          onColumnToggle={handleColumnToggle}
        />

        <div className="text-sm text-muted-foreground">
          Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
          {Math.min(currentPage * pageSize, totalItems)} de
          {totalItems} motos
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {AVAILABLE_COLUMNS.map(
              (col) =>
                visibleColumns.includes(col.id) && (
                  <TableHead
                    key={col.id}
                    className={
                      col.id === "year"
                        ? "w-[100px]"
                        : col.id === "state"
                          ? "w-[130px] text-center"
                          : col.id === "price"
                            ? "text-right"
                            : ""
                    }
                  >
                    {col.isSortable ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort(col)}
                        className="p-0 hover:bg-transparent font-semibold"
                      >
                        {col.label} {getSortIcon(col.sortKey)}
                      </Button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                No se encontraron motocicletas.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((moto) => (
              <MotorcycleRow
                key={moto.id}
                moto={moto}
                onAction={handleAction}
                onToggleStatus={handleToggleStatus}
                onCancelProcess={handleCancelProcess}
                onNavigateToDetail={(id) => router.push(`/sales/${id}`)}
                onRowDoubleClick={handleOpenDetailModal}
                isPending={isPending}
              >
                {visibleColumns.includes("brandModel") && (
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold uppercase">
                        {moto.brand?.name || "N/A"}
                      </span>
                      <span className="text-base text-muted-foreground">
                        {moto.model?.name || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("chassisId") && (
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-mono text-xl">{moto.chassisNumber}</span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("year") && (
                  <TableCell className="text-xl w-[100px]">{moto.year}</TableCell>
                )}
                {visibleColumns.includes("displacement") && (
                  <TableCell className="text-xl">{moto.displacement ?? "N/A"} cc</TableCell>
                )}
                {visibleColumns.includes("branch") && (
                  <TableCell className="text-xl text-muted-foreground">
                    {moto.branch?.name || "N/A"}
                  </TableCell>
                )}
                {visibleColumns.includes("state") && (
                  <TableCell className="w-[130px] text-center">
                    <MotorcycleStatusBadge state={moto.state} />
                  </TableCell>
                )}
                {visibleColumns.includes("price") && (
                  <TableCell className="text-right">
                    <PriceDisplay
                      costPrice={moto.costPrice}
                      wholesalePrice={moto.wholesalePrice}
                      retailPrice={moto.retailPrice}
                      size="sm"
                      currency={moto.currency}
                    />
                  </TableCell>
                )}
                {visibleColumns.includes("actions") && (
                  <TableCell className="text-right print:hidden">
                    <ActionButtons
                      moto={moto}
                      onAction={handleAction}
                      onToggleStatus={handleToggleStatus}
                      onCancelProcess={handleCancelProcess}
                      onNavigateToDetail={(id) => router.push(`/sales/${id}`)}
                    />
                    <ActionMenu
                      moto={moto}
                      onAction={handleAction}
                      onToggleStatus={handleToggleStatus}
                      onCancelProcess={handleCancelProcess}
                      onNavigateToDetail={(id) => router.push(`/sales/${id}`)}
                    />
                  </TableCell>
                )}
              </MotorcycleRow>
            ))
          )}
        </TableBody>
      </Table>

      <PaginationControl
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}

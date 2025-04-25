import { useState, useTransition, useOptimistic, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { type Motorcycle, MotorcycleState, type Brand, type Model, type Sucursal, type Reservation, type Client, type MotoColor } from "@prisma/client";
import { updateMotorcycleStatus } from "@/actions/stock/update-motorcycle-status";
import FilterSection from "./FilterSection";
import PaginationControl from "./PaginationControl";
import MotorcycleRow from "./MotorcycleRow";
import { estadoVentaConfig } from "./MotorcycleStatusBadge";
import DeleteConfirmationDialog from "../DeleteDialog";
import { ReserveModal } from "../ReserveModal";
import { MotorcycleDetailModal, type MotorcycleWithDetails } from "../MotorcycleDetailModal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Client as ClientColumn } from "@/app/(app)/clients/columns";
import { ColumnSelector } from "./ColumnSelector";
import { PriceDisplay } from "@/components/ui/price-display";
import MotorcycleStatusBadge from "./MotorcycleStatusBadge";
import { ActionButtons, ActionMenu } from "./MotorcycleActions";

export type MotorcycleWithFullDetails = MotorcycleWithDetails & {
    brand?: Brand & { organizationBrands?: { color: string }[] } | null;
    color?: MotoColor | null;
};

interface MotorcycleTableProps {
    initialData: MotorcycleWithFullDetails[];
    clients: ClientColumn[];
}

type SortableKey = keyof Pick<Motorcycle, 'id' | 'year' | 'mileage' | 'retailPrice' | 'state' | 'chassisNumber' | 'createdAt' | 'updatedAt'>;
type SortConfig = {
    key: SortableKey | null;
    direction: "asc" | "desc" | null;
};

type ManualColumnId = 'brandModel' | 'chassisId' | 'year' | 'displacement' | 'branch' | 'state' | 'price' | 'actions';
interface ManualColumnDefinition {
    id: ManualColumnId;
    label: string;
    isSortable?: boolean;
    sortKey?: SortableKey;
}

const AVAILABLE_COLUMNS: ManualColumnDefinition[] = [
    { id: 'brandModel', label: 'Marca / Modelo' },
    { id: 'chassisId', label: 'Chasis / ID' },
    { id: 'year', label: 'Año', isSortable: true, sortKey: 'year' },
    { id: 'displacement', label: 'Cilindrada' },
    { id: 'branch', label: 'Ubicación' },
    { id: 'state', label: 'Estado Venta', isSortable: true, sortKey: 'state' },
    { id: 'price', label: 'Precio', isSortable: true, sortKey: 'retailPrice' },
    { id: 'actions', label: 'Acciones' },
];

const DEFAULT_VISIBLE_COLUMNS: ManualColumnId[] = AVAILABLE_COLUMNS.map(col => col.id);

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function MotorcycleTable({ initialData, clients }: MotorcycleTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filters, setFilters] = useState({
        search: "",
        marca: "todas",
        tipo: "todos",
        ubicacion: "todas",
        estadosVenta: Object.values(MotorcycleState),
        years: [] as number[],
    });
    const [motorcycles, setMotorcycles] = useState<MotorcycleWithFullDetails[]>(initialData);
    const [selectedMotoToDelete, setSelectedMotoToDelete] = useState<MotorcycleWithFullDetails | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [selectedReserveMoto, setSelectedReserveMoto] = useState<MotorcycleWithFullDetails | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedMotoForModal, setSelectedMotoForModal] = useState<MotorcycleWithDetails | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<ManualColumnId[]>(DEFAULT_VISIBLE_COLUMNS);

    const [optimisticMotorcycles, addOptimisticUpdate] = useOptimistic(
        motorcycles,
        (state: MotorcycleWithFullDetails[], optimisticValue: { motorcycleId: number; newStatus: MotorcycleState; reservation?: Reservation | null; clientId?: string | null }) => {
            return state.map((moto) =>
                moto.id === optimisticValue.motorcycleId
                    ? {
                        ...moto,
                        state: optimisticValue.newStatus,
                    }
                    : moto,
            );
        },
    );

    // --- Datos para Filtros (Simplificado) ---
    const availableBrands = [...new Set(optimisticMotorcycles.map(m => m.brand?.name).filter(Boolean))].sort() as string[];
    const availableModels = [...new Set(optimisticMotorcycles.map(m => m.model?.name).filter(Boolean))].sort() as string[];
    const availableBranches = [...new Set(optimisticMotorcycles.map(m => m.branch?.name).filter(Boolean))].sort() as string[];
    const availableYears = [...new Set(optimisticMotorcycles.map(m => m.year).filter(y => typeof y === 'number'))].sort((a, b) => b - a) as number[];

    const getFilteredData = () => {
        let filtered = [...optimisticMotorcycles];

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(moto =>
                moto.brand?.name?.toLowerCase().includes(search) ||
                moto.model?.name?.toLowerCase().includes(search) ||
                moto.chassisNumber?.toLowerCase().includes(search)
            );
        }
        if (filters.marca !== "todas") {
            filtered = filtered.filter(moto => moto.brand?.name === filters.marca);
        }
        if (filters.tipo !== "todos") {
            filtered = filtered.filter(moto => moto.model?.name === filters.tipo);
        }
        if (filters.ubicacion !== "todas") {
            filtered = filtered.filter(moto => moto.branch?.name === filters.ubicacion);
        }
        if (filters.estadosVenta.length > 0 && filters.estadosVenta.length < Object.values(MotorcycleState).length) {
            filtered = filtered.filter(moto => filters.estadosVenta.includes(moto.state));
        }
        if (filters.years.length > 0) {
            filtered = filtered.filter(moto => filters.years.includes(moto.year));
        }

        return filtered;
    };

    const getSortedData = () => {
        const filteredData = getFilteredData();
        const { key, direction } = sortConfig;

        if (!key || !direction) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[key];
            const bValue = b[key];

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return direction === 'asc' ? -1 : 1;
            if (bValue == null) return direction === 'asc' ? 1 : -1;

            if (typeof aValue === "string" && typeof bValue === "string") {
                return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === "number" && typeof bValue === "number") {
                return direction === "asc" ? aValue - bValue : bValue - aValue;
            }
            if (aValue instanceof Date && bValue instanceof Date) {
                return direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
            }
            if (key === 'state') {
                return direction === "asc" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
            }

            return 0;
        });
    };

    const handleSort = (column: ManualColumnDefinition) => {
        if (!column.isSortable || !column.sortKey) return;
        const key = column.sortKey;

        let direction: "asc" | "desc" | null = "asc";
        if (sortConfig.key === key) {
            if (sortConfig.direction === "asc") direction = "desc";
            else if (sortConfig.direction === "desc") direction = null;
        }

        setSortConfig({ key: direction ? key : null, direction });
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        const totalPages = Math.ceil((getSortedData() ?? []).length / pageSize);
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const handlePageSizeChange = (size: string) => {
        setPageSize(Number(size));
        setCurrentPage(1);
    };

    const handleFilterChange = (filterType: string, value: string | MotorcycleState[] | number[]) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
        setCurrentPage(1);
    };

    const handleColumnToggle = (columnId: ManualColumnId) => {
        setVisibleColumns(prev =>
            prev.includes(columnId)
                ? prev.filter(col => col !== columnId)
                : [...prev, columnId]
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

        startTransition(async () => {
            addOptimisticUpdate({ motorcycleId: motoId, newStatus, reservation: null });
            try {
                const result = await updateMotorcycleStatus(motoId, newStatus);

                if (result.success) {
                    setMotorcycles((current) =>
                        current.map((moto) =>
                            moto.id === motoId ? { ...moto, state: newStatus, reservation: null } : moto,
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
                            moto.id === motoId ? { ...moto, state: newStatus, reservation: null } : moto,
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

    const handleAction = (action: 'vender' | 'reservar' | 'eliminarLogico', moto: MotorcycleWithFullDetails) => {
        if (action === 'eliminarLogico') {
            setSelectedMotoToDelete(moto as MotorcycleWithFullDetails);
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
            setSelectedReserveMoto(moto as MotorcycleWithFullDetails);
            setShowReserveModal(true);
        }
    };

    const handleDeleteConfirm = () => {
        if (selectedMotoToDelete) {
            handleSetEliminado(Number(selectedMotoToDelete.id));
            setShowDeleteDialog(false);
            setSelectedMotoToDelete(null);
        }
    };

    const handleReserved = (updatedMoto: { motorcycleId: number; reservationId: number; amount: number; clientId: string }) => {
        startTransition(() => {
            setMotorcycles((prev) =>
                prev.map((m) =>
                    m.id === updatedMoto.motorcycleId
                        ? {
                            ...m,
                            state: MotorcycleState.RESERVADO,
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
        const newStatus = MotorcycleState.STOCK;
        startTransition(async () => {
            addOptimisticUpdate({ motorcycleId: motoId, newStatus: newStatus, reservation: null });
            try {
                const result = await updateMotorcycleStatus(motoId, newStatus);
                if (result.success) {
                    setMotorcycles((current) =>
                        current.map((moto) =>
                            moto.id === motoId ? {
                                ...moto,
                                state: newStatus,
                                reservation: null
                            } : moto,
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
        console.log('handleOpenDetailModal - Moto data:', JSON.stringify(moto, null, 2));
        setSelectedMotoForModal(moto);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedMotoForModal(null);
    };

    const sortedData = getSortedData();
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

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
                clients={clients}
                onToggleStatus={handleToggleStatus}
                onSetEliminado={handleSetEliminado}
                onAction={handleAction}
                onCancelProcess={handleCancelProcess}
                onNavigateToSale={(id) => router.push(`/sales/${id}`)}
                onEdit={(id) => router.push(`/stock/edit/${id}`)}
                estadoVentaConfig={estadoVentaConfig}
            />

            <div className="mb-6">
                <FilterSection
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    availableYears={availableYears}
                    availableBrands={availableBrands}
                    availableModels={availableModels}
                    availableBranches={availableBranches}
                />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Motos por página:</span>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZE_OPTIONS.map(size => (
                                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
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
                    Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de{" "}
                    {sortedData.length} motos
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        {AVAILABLE_COLUMNS.map((col) =>
                            visibleColumns.includes(col.id) && (
                                <TableHead key={col.id} className={
                                    col.id === 'year' ? 'w-[100px]' :
                                        col.id === 'state' ? 'w-[130px] text-center' :
                                            col.id === 'price' ? 'text-right' : ''
                                }>
                                    {col.isSortable ? (
                                        <Button variant="ghost" onClick={() => handleSort(col)} className="p-0 hover:bg-transparent font-semibold">
                                            {col.label} {getSortIcon(col.sortKey)}
                                        </Button>
                                    ) : (
                                        col.label
                                    )}
                                </TableHead>
                            )
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
                                {visibleColumns.includes('brandModel') && (
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold uppercase">{moto.brand?.name || 'N/A'}</span>
                                            <span className="text-base text-muted-foreground">{moto.model?.name || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                )}
                                {visibleColumns.includes('chassisId') && (
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xl">{moto.chassisNumber}</span>
                                        </div>
                                    </TableCell>
                                )}
                                {visibleColumns.includes('year') && (
                                    <TableCell className="text-xl w-[100px]">{moto.year}</TableCell>
                                )}
                                {visibleColumns.includes('displacement') && (
                                    <TableCell className="text-xl">{moto.displacement ?? 'N/A'} cc</TableCell>
                                )}
                                {visibleColumns.includes('branch') && (
                                    <TableCell className="text-xl text-muted-foreground">
                                        {moto.branch?.name || 'N/A'}
                                    </TableCell>
                                )}
                                {visibleColumns.includes('state') && (
                                    <TableCell className="w-[130px] text-center">
                                        <MotorcycleStatusBadge state={moto.state} />
                                    </TableCell>
                                )}
                                {visibleColumns.includes('price') && (
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
                                {visibleColumns.includes('actions') && (
                                    <TableCell>
                                        <div className="flex items-center justify-end">
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
                                        </div>
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
                totalItems={sortedData.length}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />
        </div>
    );
} 
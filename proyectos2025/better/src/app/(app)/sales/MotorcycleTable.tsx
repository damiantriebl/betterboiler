import React, { useState, useTransition, useOptimistic } from 'react';
import { Motorcycle, MotorcycleState, Prisma } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, cn } from '@/lib/utils';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
    PaginationLink, PaginationNext, PaginationPrevious
} from '@/components/ui/pagination';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import DeleteConfirmationDialog from './DeleteDialog';
import { ReserveModal } from './ReserveModal';
import { type Client } from '@/app/(app)/clients/columns';
import { MotorcycleDetailModal, MotorcycleWithReservation } from './MotorcycleDetailModal';
import {
    ChevronDown, ChevronUp, ChevronsUpDown, Trash2, Pause, Play,
    DollarSign, BookmarkPlus, MoreHorizontal, RotateCcw
} from 'lucide-react';
import { updateMotorcycleStatus } from '@/actions/stock/update-motorcycle-status';

interface MotorcycleTableProps {
    initialData: Motorcycle[];
    clients: any;
}

type SortConfig = {
    key: keyof Pick<Motorcycle, 'id' | 'year' | 'mileage' | 'retailPrice' | 'state' | 'chassisNumber' | 'createdAt' | 'updatedAt'> | null;
    direction: 'asc' | 'desc' | null;
};

const estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }> = {
    [MotorcycleState.STOCK]: { label: 'En Stock', className: 'border-green-500 text-green-500 bg-transparent hover:bg-green-100' },
    [MotorcycleState.VENDIDO]: { label: 'Vendido', className: 'border-violet-500 text-violet-500 bg-transparent hover:bg-violet-100' },
    [MotorcycleState.PAUSADO]: { label: 'Pausado', className: 'border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-100' },
    [MotorcycleState.RESERVADO]: { label: 'Reservado', className: 'border-blue-500 text-blue-500 bg-transparent hover:bg-blue-100' },
    [MotorcycleState.PROCESANDO]: { label: 'Procesando', className: 'border-orange-500 text-orange-500 bg-transparent hover:bg-orange-100' },
    [MotorcycleState.ELIMINADO]: { label: 'Eliminado', className: 'border-red-500 text-red-500 bg-transparent hover:bg-red-100' },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const actionConfig = {
    vender: { label: 'Vender', icon: DollarSign, className: 'text-green-600 border-green-600 hover:bg-green-100' },
    eliminar: { label: 'Eliminar', icon: Trash2, className: 'text-red-600 border-red-600 hover:bg-red-100' },
    reservar: { label: 'Reservar', icon: BookmarkPlus, className: 'text-blue-600 border-blue-600 hover:bg-blue-100' },
} as const;

interface ReservationUpdate {
    motorcycleId: number;
    reservationAmount: number;
    clientId: string;
}

export default function MotorcycleTable({ initialData, clients }: MotorcycleTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedMoto, setSelectedMoto] = useState<Motorcycle | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [motorcycles, setMotorcycles] = useState<Motorcycle[]>(initialData);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [selectedReserveMoto, setSelectedReserveMoto] = useState<Motorcycle | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedMotoForModal, setSelectedMotoForModal] = useState<MotorcycleWithReservation | null>(null);

    const [optimisticMotorcycles, addOptimisticUpdate] = useOptimistic(
        motorcycles,
        (state: Motorcycle[], optimisticValue: { motorcycleId: number; newStatus: MotorcycleState }) => {
            return state.map((moto) =>
                moto.id === optimisticValue.motorcycleId
                    ? { ...moto, state: optimisticValue.newStatus }
                    : moto,
            );
        },
    );

    const handleSort = (key: NonNullable<SortConfig['key']>) => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') direction = 'desc';
            else if (sortConfig.direction === 'desc') direction = null;
        }
        setSortConfig({ key: direction ? key : null, direction });
        setCurrentPage(1);
    };

    const getSortedData = () => {
        const dataToSort = optimisticMotorcycles ?? motorcycles;
        if (!sortConfig.key || !sortConfig.direction) return dataToSort;
        return [...dataToSort].sort((a, b) => {
            const key = sortConfig.key as NonNullable<SortConfig['key']>;
            const aValue = a[key] ?? (typeof a[key] === 'number' ? 0 : '');
            const bValue = b[key] ?? (typeof b[key] === 'number' ? 0 : '');
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
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
        return sortConfig.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4 ml-1" />
        ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
        );
    };

    const handlePageChange = (page: number) => {
        const totalPages = Math.ceil((optimisticMotorcycles ?? motorcycles).length / pageSize);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePageSizeChange = (size: string) => {
        setPageSize(Number(size));
        setCurrentPage(1);
    };

    const handleToggleStatus = (motoId: number, currentStatus: MotorcycleState) => {
        let newStatus: MotorcycleState;
        let actionLabel: string;
        if (currentStatus === MotorcycleState.ELIMINADO) {
            newStatus = MotorcycleState.STOCK;
            actionLabel = 'restaurando';
        } else if (currentStatus === MotorcycleState.STOCK) {
            newStatus = MotorcycleState.PAUSADO;
            actionLabel = 'pausando';
        } else {
            newStatus = MotorcycleState.STOCK;
            actionLabel = 'activando';
        }
        startTransition(async () => {
            addOptimisticUpdate({ motorcycleId: motoId, newStatus });
            try {
                const result = await updateMotorcycleStatus(motoId, newStatus);
                if (result.success) {
                    setMotorcycles((current) => current.map((moto) => moto.id === motoId ? { ...moto, state: newStatus } : moto));
                    toast({ title: 'Estado Actualizado', description: `Moto ${actionLabel === 'restaurando' ? 'restaurada a stock' : (actionLabel === 'pausando' ? 'pausada' : 'activada')} correctamente.` });
                } else {
                    toast({ variant: 'destructive', title: 'Error al actualizar', description: result.error || 'No se pudo cambiar el estado.' });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error inesperado', description: 'Ocurrió un error al actualizar el estado.' });
            }
        });
    };

    const handleSetEliminado = (motoId: number) => {
        const newStatus = MotorcycleState.ELIMINADO;
        startTransition(async () => {
            addOptimisticUpdate({ motorcycleId: motoId, newStatus });
            try {
                const result = await updateMotorcycleStatus(motoId, newStatus);
                if (result.success) {
                    setMotorcycles((current) => current.map((moto) => moto.id === motoId ? { ...moto, state: newStatus } : moto));
                    toast({ title: 'Moto Eliminada', description: 'La moto ha sido marcada como eliminada (lógicamente).' });
                } else {
                    toast({ variant: 'destructive', title: 'Error al eliminar', description: result.error || 'No se pudo marcar como eliminada.' });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error inesperado', description: 'Ocurrió un error al eliminar la moto.' });
            }
        });
    };

    const handleAction = (action: 'vender' | 'reservar' | 'eliminarLogico', moto: MotorcycleWithReservation) => {
        if (action === 'eliminarLogico') {
            setSelectedMoto(moto as Motorcycle);
            setShowDeleteDialog(true);
        } else if (action === 'vender') {
            const newStatus = MotorcycleState.PROCESANDO;
            addOptimisticUpdate({ motorcycleId: moto.id, newStatus });
            startTransition(async () => {
                try {
                    const result = await updateMotorcycleStatus(moto.id, newStatus);
                    if (result.success) {
                        setMotorcycles((current) => current.map((m) => (m.id === moto.id ? { ...m, state: newStatus } : m)));
                        router.push(`/sales/${moto.id}`);
                    } else {
                        toast({ variant: 'destructive', title: 'Error al Vender', description: result.error || 'No se pudo iniciar el proceso de venta.' });
                    }
                } catch (error) {
                    toast({ variant: 'destructive', title: 'Error Inesperado', description: 'Ocurrió un error al intentar vender.' });
                }
            });
        } else if (action === 'reservar') {
            setSelectedReserveMoto(moto as Motorcycle);
            setShowReserveModal(true);
        }
    };

    const handleDeleteConfirm = () => {
        if (selectedMoto) {
            handleSetEliminado(selectedMoto.id);
            setShowDeleteDialog(false);
            setSelectedMoto(null);
        }
    };

    const handleReserved = (updatedMoto: ReservationUpdate) => {
        setMotorcycles((prev) => prev.map((m) => m.id === updatedMoto.motorcycleId ? { ...m, state: MotorcycleState.RESERVADO, reservationAmount: updatedMoto.reservationAmount, clientId: updatedMoto.clientId } : m));
        addOptimisticUpdate({ motorcycleId: updatedMoto.motorcycleId, newStatus: MotorcycleState.RESERVADO });
        toast({ title: 'Moto reservada', description: 'La moto ha sido reservada correctamente.' });
    };

    const handleCancelProcess = (motoId: number) => {
        const newStatus = MotorcycleState.STOCK;
        startTransition(async () => {
            addOptimisticUpdate({ motorcycleId: motoId, newStatus: newStatus });
            try {
                const result = await updateMotorcycleStatus(motoId, newStatus);
                if (result.success) {
                    setMotorcycles((current) => current.map((moto) => moto.id === motoId ? { ...moto, state: newStatus, clientId: null } : moto));
                    toast({ title: 'Proceso Cancelado', description: 'El proceso de venta para la moto ha sido cancelado.' });
                } else {
                    toast({ variant: 'destructive', title: 'Error al Cancelar', description: result.error || 'No se pudo cancelar el proceso.' });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error Inesperado', description: 'Ocurrió un error al cancelar el proceso.' });
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

    const sortedData = getSortedData();
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

    return (
        <div>
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
            <div className="flex items-center justify-between p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Motos por página:</span>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAGE_SIZE_OPTIONS.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de {sortedData.length} motos
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Chasis / ID</TableHead>
                        <TableHead className="w-[100px]"><Button variant="ghost" onClick={() => handleSort("year")} className="p-0 hover:bg-muted">Año {getSortIcon("year")}</Button></TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cilindrada</TableHead>
                        <TableHead className="w-[100px]">Estado</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead className="w-[130px] text-center"><Button variant="ghost" onClick={() => handleSort("state")} className="flex items-center justify-center w-full p-0 hover:bg-muted">Estado Venta {getSortIcon("state")}</Button></TableHead>
                        <TableHead className="text-right"><Button variant="ghost" onClick={() => handleSort("retailPrice")} className="flex items-center justify-end w-full p-0 hover:bg-muted">Precio {getSortIcon("retailPrice")}</Button></TableHead>
                        <TableHead>Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((moto) => (
                        <TableRow key={moto.id} className="cursor-pointer hover:bg-muted/50 relative" onDoubleClick={() => handleOpenDetailModal(moto as MotorcycleWithReservation)} >
                            <TableCell className="font-medium"><div className="flex flex-col"><span className="font-mono text-sm">{moto.chassisNumber}</span><span className="text-xs text-muted-foreground">ID: {moto.id}</span></div></TableCell>
                            <TableCell className="w-[100px]">{moto.year}</TableCell>
                            <TableCell className="text-muted-foreground italic">N/A</TableCell>
                            <TableCell>{moto.displacement ?? 'N/A'} cc</TableCell>
                            <TableCell className="w-[100px] text-muted-foreground italic">N/A</TableCell>
                            <TableCell className="text-muted-foreground italic">N/A</TableCell>
                            <TableCell className="w-[130px] text-center">
                                <Badge variant="outline" className={cn("font-normal whitespace-nowrap", estadoVentaConfig[moto.state]?.className)} >
                                    {estadoVentaConfig[moto.state]?.label ?? "Desconocido"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatPrice(moto.retailPrice)}</TableCell>
                            <TableCell>
                                <div className="hidden xl:flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleAction("vender", moto)} disabled={!moto.state === MotorcycleState.STOCK || isPending} >...</Button>
                                        <Button onClick={() => handleAction("eliminarLogico", moto)} disabled={isPending} >...</Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleToggleStatus(moto.id, moto.state)} disabled={!(moto.state === MotorcycleState.STOCK || moto.state === MotorcycleState.PAUSADO) || isPending}>...</Button>
                                        <Button onClick={() => handleAction("reservar", moto)} disabled={moto.state === MotorcycleState.PAUSADO || isPending}>...</Button>
                                    </div>
                                </div>
                                <div className="xl:hidden">
                                    <DropdownMenu>
                                        {moto.state === MotorcycleState.ELIMINADO ? <DropdownMenuItem onClick={() => handleToggleStatus(moto.id, moto.state)}>...</DropdownMenuItem> :
                                            moto.state === MotorcycleState.PROCESANDO ? <>...</> :
                                                moto.state === MotorcycleState.RESERVADO ? <>...</> :
                                                    <>
                                                        {moto.state === MotorcycleState.STOCK || moto.state === MotorcycleState.PAUSADO && <DropdownMenuItem onClick={() => handleToggleStatus(moto.id, moto.state)}>...</DropdownMenuItem>}
                                                        {!moto.state === MotorcycleState.RESERVADO && <DropdownMenuItem onClick={() => handleAction('reservar', moto)} disabled={moto.state === MotorcycleState.PAUSADO}>...</DropdownMenuItem>}
                                                        {moto.state === MotorcycleState.STOCK && <DropdownMenuItem onClick={() => handleAction('vender', moto)}>...</DropdownMenuItem>}
                                                        <DropdownMenuItem onClick={() => handleAction("eliminarLogico", moto)}>...</DropdownMenuItem>
                                                    </>
                                        }
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="p-4 border-t">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem><PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                        {/* ... Lógica de renderizado de links de página ... */}
                        <PaginationItem><PaginationNext onClick={() => handlePageChange(currentPage + 1)} className={currentPage === Math.ceil(sortedData.length / pageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
} 
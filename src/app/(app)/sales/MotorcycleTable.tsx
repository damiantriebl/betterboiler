import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Motorcycle, EstadoVenta } from "@/types/BikesType";
import { formatPrice } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Trash2, PauseCircle, DollarSign, BookmarkPlus, MoreHorizontal } from "lucide-react";
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
import { cn } from "@/lib/utils";
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

interface MotorcycleTableProps {
    initialData: Motorcycle[];
}

type SortConfig = {
    key: keyof Motorcycle | null;
    direction: 'asc' | 'desc' | null;
};

const estadoVentaConfig: Record<EstadoVenta, { label: string, className: string }> = {
    [EstadoVenta.STOCK]: {
        label: "En Stock",
        className: "border-green-500 text-green-500 bg-transparent hover:bg-green-100"
    },
    [EstadoVenta.VENDIDO]: {
        label: "Vendido",
        className: "border-red-500 text-red-500 bg-transparent hover:bg-red-100"
    },
    [EstadoVenta.PAUSADO]: {
        label: "Pausado",
        className: "border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-100"
    },
    [EstadoVenta.RESERVADO]: {
        label: "Reservado",
        className: "border-blue-500 text-blue-500 bg-transparent hover:bg-blue-100"
    },
    [EstadoVenta.PROCESANDO]: {
        label: "Procesando",
        className: "border-purple-500 text-purple-500 bg-transparent hover:bg-purple-100"
    },
    [EstadoVenta.ELIMINADO]: {
        label: "Eliminado",
        className: "border-gray-500 text-gray-500 bg-transparent hover:bg-gray-100"
    }
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const actionConfig = {
    vender: {
        label: "Vender",
        icon: DollarSign,
        className: "text-green-600 border-green-600 hover:bg-green-100"
    },
    eliminar: {
        label: "Eliminar",
        icon: Trash2,
        className: "text-red-600 border-red-600 hover:bg-red-100"
    },
    pausar: {
        label: "Pausar",
        icon: PauseCircle,
        className: "text-yellow-600 border-yellow-600 hover:bg-yellow-100"
    },
    reservar: {
        label: "Reservar",
        icon: BookmarkPlus,
        className: "text-blue-600 border-blue-600 hover:bg-blue-100"
    }
} as const;

export default function MotorcycleTable({ initialData }: MotorcycleTableProps) {
    const router = useRouter();
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: null,
        direction: null
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedMoto, setSelectedMoto] = useState<Motorcycle | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleSort = (key: keyof Motorcycle) => {
        let direction: 'asc' | 'desc' | null = 'asc';

        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') {
                direction = 'desc';
            } else if (sortConfig.direction === 'desc') {
                direction = null;
            }
        }

        setSortConfig({ key: direction ? key : null, direction });
        setCurrentPage(1); // Resetear a la primera página al ordenar
    };

    const getSortedData = () => {
        if (!sortConfig.key || !sortConfig.direction) {
            return initialData;
        }

        return [...initialData].sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }

            return 0;
        });
    };

    const getSortIcon = (key: keyof Motorcycle) => {
        if (sortConfig.key !== key) {
            return <ChevronsUpDown className="w-4 h-4 ml-1" />;
        }
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-4 h-4 ml-1" />
            : <ChevronDown className="w-4 h-4 ml-1" />;
    };

    const sortedData = getSortedData();
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (size: string) => {
        setPageSize(Number(size));
        setCurrentPage(1); // Resetear a la primera página al cambiar el tamaño
    };

    const handleAction = (action: keyof typeof actionConfig, moto: Motorcycle) => {
        if (action === 'eliminar') {
            setSelectedMoto(moto);
            setShowDeleteDialog(true);
        } else if (action === 'vender') {
            router.push(`/ventas/${moto.id}`);
        } else {
            console.log(`Acción ${action} en moto:`, moto);
        }
    };

    const handleDelete = () => {
        if (selectedMoto) {
            console.log(`Se borró id: ${selectedMoto.id}`);
            setShowDeleteDialog(false);
            setSelectedMoto(null);
        }
    };


    const ActionButtons = ({ moto }: { moto: Motorcycle }) => (
        <div className="hidden xl:flex flex-col gap-2">
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.vender.className)}
                    onClick={() => handleAction('vender', moto)}
                >
                    <actionConfig.vender.icon className="h-4 w-4" />
                    {actionConfig.vender.label}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.eliminar.className)}
                    onClick={() => handleAction('eliminar', moto)}
                >
                    <actionConfig.eliminar.icon className="h-4 w-4" />
                    {actionConfig.eliminar.label}
                </Button>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.pausar.className)}
                    onClick={() => handleAction('pausar', moto)}
                >
                    <actionConfig.pausar.icon className="h-4 w-4" />
                    {actionConfig.pausar.label}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.reservar.className)}
                    onClick={() => handleAction('reservar', moto)}
                >
                    <actionConfig.reservar.icon className="h-4 w-4" />
                    {actionConfig.reservar.label}
                </Button>
            </div>
        </div>
    );

    const ActionMenu = ({ moto }: { moto: Motorcycle }) => (
        <div className="xl:hidden">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    {(Object.keys(actionConfig) as Array<keyof typeof actionConfig>).map((action) => {
                        const config = actionConfig[action];
                        return (
                            <DropdownMenuItem
                                key={action}
                                onClick={() => handleAction(action, moto)}
                                className={cn(
                                    "flex items-center gap-2 cursor-pointer",
                                    config.className
                                )}
                            >
                                <config.icon className="h-4 w-4" />
                                {config.label}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );

    return (
        <div >
            <DeleteConfirmationDialog showDeleteDialog={showDeleteDialog} setShowDeleteDialog={setShowDeleteDialog} selectedMoto={selectedMoto} handleDelete={handleDelete} />
            <div className="flex items-center justify-between p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Motos por página:</span>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={handlePageSizeChange}
                    >
                        <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="10" />
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
                <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de {sortedData.length} motos
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('marca')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Marca y Modelo
                                {getSortIcon('marca')}
                            </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('año')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Año
                                {getSortIcon('año')}
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('tipo')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Tipo
                                {getSortIcon('tipo')}
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('cilindrada')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Cilindrada
                                {getSortIcon('cilindrada')}
                            </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('estado')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Estado
                                {getSortIcon('estado')}
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('ubicacion')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Ubicación
                                {getSortIcon('ubicacion')}
                            </Button>
                        </TableHead>
                        <TableHead className="w-[130px]">
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('estadoVenta')}
                                className="flex items-center p-0 hover:bg-muted"
                            >
                                Estado Venta
                                {getSortIcon('estadoVenta')}
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">
                            <Button
                                variant="ghost"
                                onClick={() => handleSort('precio')}
                                className="flex items-center justify-end w-full hover:bg-muted"
                            >
                                Precio
                                {getSortIcon('precio')}
                            </Button>
                        </TableHead>
                        <TableHead>Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((moto) => (
                        <TableRow key={moto.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold">{moto.marca}</span>
                                    <span className="text-muted-foreground">{moto.modelo}</span>
                                </div>
                            </TableCell>
                            <TableCell className="w-[100px] text-xl font-bold">{moto.año}</TableCell>
                            <TableCell>{moto.tipo}</TableCell>
                            <TableCell>{moto.cilindrada} cc</TableCell>
                            <TableCell className="w-[100px]">{moto.estado}</TableCell>
                            <TableCell>{moto.ubicacion}</TableCell>
                            <TableCell className="w-[130px] text-center">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "font-normal whitespace-nowrap"
                                    )}
                                >
                                    {estadoVentaConfig[moto.estadoVenta]?.label ?? 'Desconocido'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xl font-bold">{formatPrice(moto.precio)}</TableCell>
                            <TableCell>
                                <ActionButtons moto={moto} />
                                <ActionMenu moto={moto} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="p-4 border-t">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                title="Anterior"
                                onClick={() => handlePageChange(currentPage - 1)}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                                // Mostrar primera página, última página, página actual y páginas adyacentes
                                return page === 1 ||
                                    page === totalPages ||
                                    Math.abs(currentPage - page) <= 1;
                            })
                            .map((page, index, array) => {
                                // Si hay un salto en la secuencia, mostrar elipsis
                                if (index > 0 && page - array[index - 1] > 1) {
                                    return (
                                        <PaginationItem key={`ellipsis-${page}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }

                                return (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            onClick={() => handlePageChange(page)}
                                            isActive={currentPage === page}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}

                        <PaginationItem>
                            <PaginationNext
                                title="siguiente"
                                onClick={() => handlePageChange(currentPage + 1)}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
} 
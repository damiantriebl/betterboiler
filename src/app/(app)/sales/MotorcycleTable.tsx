"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Motorcycle, EstadoVenta } from "@/types/BikesType";
import { formatPrice } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
import { updateMotorcycleStatus } from "@/actions/stock/update-motorcycle-status";

interface MotorcycleTableProps {
  initialData: Motorcycle[];
}

type SortConfig = {
  key: keyof Motorcycle | null;
  direction: "asc" | "desc" | null;
};

const estadoVentaConfig: Record<EstadoVenta, { label: string; className: string }> = {
  [EstadoVenta.STOCK]: {
    label: "En Stock",
    className: "border-green-500 text-green-500 bg-transparent hover:bg-green-100",
  },
  [EstadoVenta.VENDIDO]: {
    label: "Vendido",
    className: "border-violet-500 text-violet-500 bg-transparent hover:bg-violet-100",
  },
  [EstadoVenta.PAUSADO]: {
    label: "Pausado",
    className: "border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-100",
  },
  [EstadoVenta.RESERVADO]: {
    label: "Reservado",
    className: "border-blue-500 text-blue-500 bg-transparent hover:bg-blue-100",
  },
  [EstadoVenta.PROCESANDO]: {
    label: "Procesando",
    className: "border-orange-500 text-orange-500 bg-transparent hover:bg-orange-100",
  },
  [EstadoVenta.ELIMINADO]: {
    label: "Eliminado",
    className: "border-green-500 text-green-500 bg-transparent hover:bg-green-100",
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

export default function MotorcycleTable({ initialData }: MotorcycleTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedMoto, setSelectedMoto] = useState<Motorcycle | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [motorcycles, setMotorcycles] = useState(initialData);

  const [optimisticMotorcycles, addOptimisticUpdate] = useOptimistic(
    motorcycles,
    (state, optimisticValue: { motorcycleId: number; newStatus: EstadoVenta }) => {
      return state.map((moto) =>
        moto.id === optimisticValue.motorcycleId.toString()
          ? { ...moto, estadoVenta: optimisticValue.newStatus }
          : moto,
      );
    },
  );

  const handleSort = (key: keyof Motorcycle) => {
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

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction) return optimisticMotorcycles;

    return [...optimisticMotorcycles].sort((a, b) => {
      // Use correct type (likely Motorcycle, adjust if needed)
      const key = sortConfig.key as keyof Motorcycle;
      const aValue = a[key] ?? "";
      const bValue = b[key] ?? "";

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      // Fallback comparison converting to string
      const stringA = String(aValue);
      const stringB = String(bValue);
      return sortConfig.direction === "asc" ? stringA.localeCompare(stringB) : stringB.localeCompare(stringA);
    });
  };

  const getSortIcon = (key: keyof Motorcycle) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="w-4 h-4 ml-1" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
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

  const handleToggleStatus = (motoId: number, currentStatus: EstadoVenta) => {
    const newStatus = currentStatus === EstadoVenta.STOCK ? EstadoVenta.PAUSADO : EstadoVenta.STOCK;
    const actionLabel = newStatus === EstadoVenta.PAUSADO ? "pausando" : "activando";

    addOptimisticUpdate({ motorcycleId: motoId, newStatus });

    startTransition(async () => {
      try {
        const result = await updateMotorcycleStatus(motoId, newStatus);

        if (result.success) {
          setMotorcycles((current) =>
            current.map((moto) =>
              moto.id === motoId.toString() ? { ...moto, estadoVenta: newStatus } : moto,
            ),
          );

          toast({
            title: "Estado Actualizado",
            description: `Moto ${actionLabel === "pausando" ? "pausada" : "activada"} correctamente.`,
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

  const handleAction = (action: keyof typeof actionConfig, moto: Motorcycle) => {
    if (action === "eliminar") {
      setSelectedMoto(moto);
      setShowDeleteDialog(true);
    } else if (action === "vender") {
      const newStatus = EstadoVenta.PROCESANDO;

      addOptimisticUpdate({ motorcycleId: Number(moto.id), newStatus });

      startTransition(async () => {
        try {
          const result = await updateMotorcycleStatus(Number(moto.id), newStatus);

          if (result.success) {
            setMotorcycles((current) =>
              current.map((m) => (m.id === moto.id ? { ...m, estadoVenta: newStatus } : m)),
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

  const ActionButtons = ({ moto }: { moto: Motorcycle }) => {
    const canToggleStatus =
      moto.estadoVenta === EstadoVenta.STOCK || moto.estadoVenta === EstadoVenta.PAUSADO;
    const isPaused = moto.estadoVenta === EstadoVenta.PAUSADO;
    const canSell = moto.estadoVenta === EstadoVenta.STOCK;

    return (
      <div className="hidden xl:flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full flex items-center gap-1", actionConfig.vender.className)}
            onClick={() => handleAction("vender", moto)}
            disabled={!canSell}
          >
            <actionConfig.vender.icon className="h-4 w-4" />
            {actionConfig.vender.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full flex items-center gap-1", actionConfig.eliminar.className)}
            onClick={() => handleAction("eliminar", moto)}
          >
            <actionConfig.eliminar.icon className="h-4 w-4" />
            {actionConfig.eliminar.label}
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
            onClick={() => handleToggleStatus(Number(moto.id), moto.estadoVenta)}
            disabled={!canToggleStatus || isPending}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? "Activar" : "Pausar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full flex items-center gap-1", actionConfig.reservar.className)}
            onClick={() => handleAction("reservar", moto)}
          >
            <actionConfig.reservar.icon className="h-4 w-4" />
            {actionConfig.reservar.label}
          </Button>
        </div>
      </div>
    );
  };

  const ActionMenu = ({ moto }: { moto: Motorcycle }) => {
    const canToggleStatus =
      moto.estadoVenta === EstadoVenta.STOCK || moto.estadoVenta === EstadoVenta.PAUSADO;
    const isPaused = moto.estadoVenta === EstadoVenta.PAUSADO;
    const canSell = moto.estadoVenta === EstadoVenta.STOCK;

    return (
      <div className="xl:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem
              onClick={() => handleToggleStatus(Number(moto.id), moto.estadoVenta)}
              disabled={!canToggleStatus || isPending}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isPaused
                  ? "text-green-600 focus:bg-green-100"
                  : "text-yellow-600 focus:bg-yellow-100",
              )}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? "Activar" : "Pausar"}
            </DropdownMenuItem>
            {(Object.keys(actionConfig) as Array<keyof typeof actionConfig>).map((action) => {
              const config = actionConfig[action];
              const isDisabled = action === "vender" && !canSell;

              return (
                <DropdownMenuItem
                  key={action}
                  onClick={() => handleAction(action, moto)}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    config.className.replace(/border-\S+/, ""),
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
  };

  return (
    <div>
      <DeleteConfirmationDialog
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        selectedMoto={selectedMoto}
        handleDelete={handleDelete}
      />
      <div className="flex items-center justify-between p-4 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Motos por página:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
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
          Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de{" "}
          {sortedData.length} motos
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("marca")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Marca y Modelo
                {getSortIcon("marca")}
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                onClick={() => handleSort("año")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Año
                {getSortIcon("año")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("tipo")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Tipo
                {getSortIcon("tipo")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("cilindrada")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Cilindrada
                {getSortIcon("cilindrada")}
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                onClick={() => handleSort("estado")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Estado
                {getSortIcon("estado")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("ubicacion")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Ubicación
                {getSortIcon("ubicacion")}
              </Button>
            </TableHead>
            <TableHead className="w-[130px]">
              <Button
                variant="ghost"
                onClick={() => handleSort("estadoVenta")}
                className="flex items-center p-0 hover:bg-muted"
              >
                Estado Venta
                {getSortIcon("estadoVenta")}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => handleSort("precio")}
                className="flex items-center justify-end w-full hover:bg-muted"
              >
                Precio
                {getSortIcon("precio")}
              </Button>
            </TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((moto) => (
            <TableRow
              key={moto.id}
              className="cursor-pointer hover:bg-muted/50 relative"
              style={{
                borderLeft: `6px solid ${moto.color}`,
              }}
            >
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
                    "font-normal whitespace-nowrap",
                    estadoVentaConfig[moto.estadoVenta]?.className,
                  )}
                >
                  {estadoVentaConfig[moto.estadoVenta]?.label ?? "Desconocido"}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xl font-bold">
                {formatPrice(moto.precio)}
              </TableCell>
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
              .filter((page) => {
                // Mostrar primera página, última página, página actual y páginas adyacentes
                return page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1;
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
                className={
                  currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

"use client"; // Necesario por los hooks

import { deleteSupplier } from "@/actions/suppliers/suppliers-unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Supplier } from "@prisma/client";
import { ArrowUpDown, ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import React, { useState, useTransition } from "react";

interface SupplierTableProps {
  initialData: Supplier[];
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (supplierId: number) => void;
}

type SortableKeys = "legalName" | "commercialName" | "contactName" | "status";

type SortConfig = {
  key: SortableKeys | null;
  direction: "asc" | "desc" | null;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function SupplierTable({ initialData, onEdit, onDelete }: SupplierTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSort = (key: SortableKeys) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    else if (sortConfig.key === key && sortConfig.direction === "desc") direction = null;

    setSortConfig({ key: direction ? key : null, direction });
    setCurrentPage(1);
  };

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction) return initialData;

    return [...initialData].sort((a, b) => {
      const aValueToSort =
        sortConfig.key === "commercialName"
          ? a.commercialName || a.legalName
          : (a[sortConfig.key as keyof Supplier] ?? "");
      const bValueToSort =
        sortConfig.key === "commercialName"
          ? b.commercialName || b.legalName
          : (b[sortConfig.key as keyof Supplier] ?? "");

      if (aValueToSort < bValueToSort) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValueToSort > bValueToSort) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-4 h-4 ml-1 opacity-30" />;
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

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
    setCurrentPage(1);
  };

  const handleEditClick = (supplier: Supplier) => {
    if (onEdit) onEdit(supplier);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    if (
      !confirm(`¿Estás seguro de eliminar a "${supplier.commercialName || supplier.legalName}"?`)
    ) {
      return;
    }
    setDeletingId(supplier.id);
    startDeleteTransition(async () => {
      const result = await deleteSupplier(supplier.id);
      if (result.success) {
        toast({
          title: "Proveedor eliminado",
          description: `Se eliminó a ${supplier.commercialName || supplier.legalName}.`,
        });
      } else {
        toast({ variant: "destructive", title: "Error al eliminar", description: result.error });
      }
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("legalName")}
                className="px-1 hover:bg-muted/50"
              >
                Nombre <span className="sr-only sm:not-sr-only">Legal/Comercial</span>
                {getSortIcon("legalName")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("contactName")}
                className="px-1 hover:bg-muted/50"
              >
                Contacto
                {getSortIcon("contactName")}
              </Button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">Domicilio Comercial</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("status")}
                className="px-1 hover:bg-muted/50"
              >
                Estado
                {getSortIcon("status")}
              </Button>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No se encontraron proveedores.
              </TableCell>
            </TableRow>
          )}
          {paginatedData.map((supplier: Supplier) => (
            <TableRow
              key={supplier.id}
              className={cn(
                "hover:bg-muted/50 transition-colors",
                isDeleting && deletingId === supplier.id && "opacity-50",
              )}
            >
              <TableCell className="font-medium">
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="hover:underline text-blue-600 dark:text-blue-400"
                >
                  {supplier.commercialName || supplier.legalName}
                </Link>
                {supplier.commercialName && supplier.legalName !== supplier.commercialName && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    Legal: {supplier.legalName}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {supplier.contactName || (
                  <span className="text-muted-foreground italic">Sin contacto</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div
                  className="truncate max-w-[200px] lg:max-w-xs"
                  title={supplier.commercialAddress || ""}
                >
                  {supplier.commercialAddress || (
                    <span className="text-muted-foreground italic">Sin dirección</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={supplier.status === "ACTIVO" ? "default" : "outline"}
                  className={cn(
                    supplier.status === "ACTIVO"
                      ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200"
                      : supplier.status === "SUSPENDIDO"
                        ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200"
                        : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {supplier.status === "ACTIVO"
                    ? "Activo"
                    : supplier.status === "SUSPENDIDO"
                      ? "Suspendido"
                      : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-muted"
                      disabled={isDeleting && deletingId === supplier.id}
                    >
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleEditClick(supplier)}
                      disabled={isDeleting}
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(supplier.id.toString())}
                      disabled={isDeleting}
                    >
                      Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => handleDeleteClick(supplier)}
                      disabled={isDeleting && deletingId === supplier.id}
                    >
                      {isDeleting && deletingId === supplier.id ? "Eliminando..." : "Eliminar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Información de paginación y controles en la parte inferior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Proveedores por página:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[80px] h-8">
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

        <div className="text-sm text-muted-foreground">
          Mostrando {sortedData.length === 0 ? 0 : startIndex + 1} a{" "}
          {Math.min(startIndex + pageSize, sortedData.length)} de {sortedData.length} proveedores
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) {
                  if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={
                    currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

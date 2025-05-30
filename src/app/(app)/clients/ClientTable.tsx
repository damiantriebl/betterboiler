"use client";

import { deleteClient } from "@/actions/clients/manage-clients";
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
import type { Client } from "@prisma/client";
import { ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import React, { useState, useTransition } from "react";

interface ClientTableProps {
  initialData: Client[];
  onEdit?: (client: Client) => void;
  onDelete?: (clientId: string) => void;
}

type SortableKeys = "firstName" | "lastName" | "email" | "type" | "status";

type SortConfig = {
  key: SortableKeys | null;
  direction: "asc" | "desc" | null;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ClientTable({ initialData, onEdit, onDelete }: ClientTableProps) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleEditClick = (client: Client) => {
    if (onEdit) onEdit(client);
  };

  const handleDeleteClick = (client: Client) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar al cliente "${client.firstName} ${client.lastName || ""}"?`,
      )
    ) {
      return;
    }
    setDeletingId(client.id);
    startDeleteTransition(async () => {
      try {
        await deleteClient(client.id);
        toast({
          title: "Cliente eliminado",
          description: `Se eliminó al cliente ${client.firstName} ${client.lastName || ""}.`,
        });
        if (onDelete) onDelete(client.id);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar el cliente.",
        });
      }
      setDeletingId(null);
    });
  };

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
      const aValue = a[sortConfig.key as keyof Client] ?? "";
      const bValue = b[sortConfig.key as keyof Client] ?? "";

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
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

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("firstName")}
                className="px-1 hover:bg-muted/50"
              >
                Nombre
                {getSortIcon("firstName")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("email")}
                className="px-1 hover:bg-muted/50"
              >
                Email
                {getSortIcon("email")}
              </Button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">Contacto</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("type")}
                className="px-1 hover:bg-muted/50"
              >
                Tipo
                {getSortIcon("type")}
              </Button>
            </TableHead>
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
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No se encontraron clientes.
              </TableCell>
            </TableRow>
          )}
          {paginatedData.map((client: Client) => (
            <TableRow
              key={client.id}
              className={cn(
                "hover:bg-muted/50 transition-colors",
                isDeleting && deletingId === client.id && "opacity-50",
              )}
            >
              <TableCell className="font-medium">
                <div>
                  <div className="font-medium">
                    {client.firstName} {client.lastName || ""}
                  </div>
                  {client.companyName && (
                    <div className="text-sm text-muted-foreground mt-1">{client.companyName}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-blue-600 dark:text-blue-400">{client.email}</span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="space-y-1">
                  {client.phone && <div className="text-sm">📞 {client.phone}</div>}
                  {client.mobile && <div className="text-sm">📱 {client.mobile}</div>}
                  {!client.phone && !client.mobile && (
                    <span className="text-muted-foreground italic">Sin contacto</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    client.type === "Individual"
                      ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200",
                  )}
                >
                  {client.type === "Individual" ? "Persona Física" : "Persona Jurídica"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={client.status === "active" ? "default" : "outline"}
                  className={cn(
                    client.status === "active"
                      ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {client.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-muted"
                      disabled={isDeleting && deletingId === client.id}
                    >
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEditClick(client)} disabled={isDeleting}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(client.id)}
                      disabled={isDeleting}
                    >
                      Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => handleDeleteClick(client)}
                      disabled={isDeleting && deletingId === client.id}
                    >
                      {isDeleting && deletingId === client.id ? "Eliminando..." : "Eliminar"}
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
          <span className="text-sm text-muted-foreground">Clientes por página:</span>
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
          {Math.min(startIndex + pageSize, sortedData.length)} de {sortedData.length} clientes
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

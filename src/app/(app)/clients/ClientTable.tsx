"use client";

import React, { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { MoreHorizontal, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Client } from './columns';
import { deleteClient } from '@/actions/clients/manage-clients';
import { toast } from '@/hooks/use-toast';

interface ClientTableProps {
  initialData: Client[];
  onEdit?: (client: Client) => void;
  onDelete?: (clientId: string) => void;
}

type SortableKeys = 'firstName' | 'lastName' | 'companyName' | 'email' | 'status';

type SortConfig = {
  key: SortableKeys | null;
  direction: 'asc' | 'desc' | null;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ClientTable({ initialData, onEdit, onDelete }: ClientTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSort = (key: SortableKeys) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;

    setSortConfig({ key: direction ? key : null, direction });
    setCurrentPage(1);
  };

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction) return initialData;

    return [...initialData].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      const valA = aValue ?? '';
      const valB = bValue ?? '';

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-4 h-4 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 ml-1" />
      : <ChevronDown className="w-4 h-4 ml-1" />;
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

  const handleEditClick = (client: Client) => {
    if (onEdit) onEdit(client);
  };

  const handleDeleteClick = (client: Client) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente "${client.firstName} ${client.lastName || ''}"?`)) {
      return;
    }
    setDeletingId(client.id);
    startDeleteTransition(async () => {
      try {
        await deleteClient(client.id);
        toast({
          title: "Cliente eliminado",
          description: `Se eliminó al cliente ${client.firstName} ${client.lastName || ''}.`
        });
        if (onDelete) onDelete(client.id);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar el cliente."
        });
      }
      setDeletingId(null);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between p-4 bg-muted/50 border-t border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Clientes por página:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Mostrando {sortedData.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de {sortedData.length} clientes
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('firstName')} className="px-1">
                Nombre
                {getSortIcon('firstName')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('email')} className="px-1">
                Email
                {getSortIcon('email')}
              </Button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
            <TableHead className="hidden sm:table-cell">CUIT/CUIL</TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('status')} className="px-1">
                Estado
                {getSortIcon('status')}
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
            <TableRow key={client.id} className={cn(isDeleting && deletingId === client.id && "opacity-50")}>
              <TableCell className="font-medium">
                {client.firstName} {client.lastName}
                {client.companyName && (
                  <span className="block text-xs text-muted-foreground">{client.companyName}</span>
                )}
              </TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {client.phone || <span className="text-muted-foreground italic">N/A</span>}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {client.taxId || <span className="text-muted-foreground italic">N/A</span>}
              </TableCell>
              <TableCell>
                <Badge variant={client.status === 'active' ? 'default' : 'outline'}
                  className={cn(client.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-600 border-gray-300')}>
                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEditClick(client)} disabled={isDeleting}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(client.id)} disabled={isDeleting}>
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

      {totalPages > 1 && (
        <div className="p-4 border-t">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

"use client";

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
import type { ClientFormData } from "@/zod/ClientsZod";
import type { MotorcycleState } from "@prisma/client";
import type { Column, ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

// Definición del tipo Cliente para las columnas
// Asegurarse que los tipos opcionales usen 'null' en lugar de 'undefined'
// para coincidir con Prisma
export type Client = {
  id: string;
  type: "Individual" | "LegalEntity";
  firstName: string;
  lastName?: string | null; // Cambiado de undefined a null
  companyName?: string | null; // Cambiado de undefined a null
  taxId: string;
  email: string;
  phone?: string | null; // Asegurar que sea string | null
  mobile?: string | null; // Asegurar que sea string | null
  address?: string | null;
  vatStatus?: string | null; // Cambiado de undefined a null
  status: "active" | "inactive";
  notes?: string | null; // Cambiado de undefined a null
  createdAt: Date;
  updatedAt: Date;
  // Asegúrate que la relación con motorcycles también coincida con la estructura real
  motorcycles?:
    | {
        id: string;
        brand: string;
        model: string;
        state: MotorcycleState; // Importa MotorcycleState si no está ya
      }[]
    | null; // Puede ser un array o null
};

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "firstName",
    header: ({ column }: { column: Column<Client, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }: { row: Row<Client> }) => {
      const firstName = row.original.firstName;
      const lastName = row.original.lastName;
      // Mostrar nombre completo si existe apellido
      return (
        <div className="font-medium">
          {firstName} {lastName ? lastName : ""}
          {row.original.companyName && (
            <span className="block text-xs text-muted-foreground">{row.original.companyName}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }: { row: Row<Client> }) =>
      row.original.email || <span className="text-muted-foreground italic">N/A</span>,
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
    cell: ({ row }: { row: Row<Client> }) =>
      row.original.phone || <span className="text-muted-foreground italic">N/A</span>,
  },
  {
    accessorKey: "taxId",
    header: "CUIT/CUIL",
    cell: ({ row }: { row: Row<Client> }) =>
      row.original.taxId || <span className="text-muted-foreground italic">N/A</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }: { column: Column<Client, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Estado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }: { row: Row<Client> }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === "active" ? "default" : "outline"}
          className={
            status === "active"
              ? "bg-green-100 text-green-800 border-green-300"
              : "bg-gray-100 text-gray-600 border-gray-300"
          }
        >
          {status === "active" ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }: { row: Row<Client> }) => {
      const client = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(client.id)}>
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

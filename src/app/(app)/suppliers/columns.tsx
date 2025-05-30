"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

// Tipo de dato para la fila
export type Proveedor = SupplierFormData & { id: string }; // Asumimos que cada proveedor tendrá un ID único

// Interfaz para la definición simplificada de columnas
export interface SimpleColumn {
  accessorKey: keyof Proveedor | "actions"; // 'actions' es un caso especial para la columna de acciones
  header: string | React.ReactNode; // Puede ser un string o un componente para el header
  cell?: (props: { row: { original: Proveedor } }) => React.ReactNode; // La función cell es opcional ahora
  className?: string; // Para estilos opcionales en la celda o header
}

export const columns: SimpleColumn[] = [
  {
    accessorKey: "commercialName",
    header: (
      <div className="flex items-center">
        Nombre Comercial
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      </div>
    ),
    cell: ({ row }) => {
      const commercialName = row.original.commercialName;
      const legalName = row.original.legalName;
      return <div className="font-medium">{commercialName || legalName}</div>;
    },
  },
  {
    accessorKey: "contactName",
    header: "Persona de Contacto",
    cell: ({ row }) =>
      row.original.contactName || <span className="text-muted-foreground italic">N/A</span>,
  },
  {
    accessorKey: "commercialAddress",
    header: "Domicilio Comercial",
    cell: ({ row }) => {
      const domicilio = row.original.commercialAddress;
      return (
        <div className="truncate max-w-xs">
          {domicilio || <span className="text-muted-foreground italic">N/A</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.original.status;
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${estado === "activo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {estado === "activo" ? "Activo" : "Inactivo"}
        </span>
      );
    },
  },
  {
    accessorKey: "actions", // Clave especial para la columna de acciones
    header: "Acciones",
    cell: ({ row }) => {
      const proveedor = row.original;
      return (
        <div className="text-right">
          {" "}
          {/* Alineación a la derecha para acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(proveedor.id)}>
                Copiar ID Proveedor
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

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
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import type { ProveedorFormData } from "./SupplierForm"; // Importamos el tipo desde el formulario

// Tipo de dato para la fila (igual que ProveedorFormData por ahora)
// En una implementación real, podría ser un tipo diferente devuelto por la API
export type Proveedor = ProveedorFormData & { id: string }; // Asumimos que cada proveedor tendrá un ID único

export const columns: ColumnDef<Proveedor>[] = [
  {
    accessorKey: "nombreComercial",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre Comercial
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const nombreComercial = row.original.nombreComercial;
      const razonSocial = row.original.razonSocial;
      // Mostrar nombre comercial si existe, si no, razón social
      return <div className="font-medium">{nombreComercial || razonSocial}</div>;
    },
  },
  {
    accessorKey: "contactoNombre",
    header: "Persona de Contacto",
    cell: ({ row }) =>
      row.original.contactoNombre || <span className="text-muted-foreground italic">N/A</span>,
  },
  {
    accessorKey: "domicilioComercial",
    header: "Domicilio Comercial",
    cell: ({ row }) => {
      const domicilio = row.original.domicilioComercial;
      // TODO: Idealmente, extraer la localidad si el campo estuviera estructurado.
      // Por ahora, mostramos el texto o un snippet.
      return (
        <div className="truncate max-w-xs">
          {domicilio || <span className="text-muted-foreground italic">N/A</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.original.estado;
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
    id: "actions",
    cell: ({ row }) => {
      const proveedor = row.original;

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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(proveedor.id)} // Acción de ejemplo: copiar ID
            >
              Copiar ID Proveedor
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Editar</DropdownMenuItem> {/* TODO: Implementar Editar */}
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
              Eliminar {/* TODO: Implementar Eliminar */}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

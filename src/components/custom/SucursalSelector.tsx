"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import {
    Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
// Importar el tipo BranchData definido en la acción
import { type BranchData } from "@/actions/stock/get-sucursales";

interface SucursalSelectorProps {
    sucursales: BranchData[];
    selectedSucursalId?: number | null;
    onSelect: (sucursalId: number) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    notFoundMessage?: string;
    className?: string;
}

export function SucursalSelector({
    sucursales,
    selectedSucursalId,
    onSelect,
    placeholder = "Selecciona sucursal...",
    searchPlaceholder = "Busca sucursal...",
    notFoundMessage = "No se encontró la sucursal.",
    className
}: SucursalSelectorProps) {
    const [open, setOpen] = React.useState(false);

    const selectedSucursal = React.useMemo(() => {
        // Buscar por id (numérico)
        return sucursales.find(s => s.id === selectedSucursalId);
    }, [selectedSucursalId, sucursales]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-10", className)} // Asegurar altura consistente
                >
                    <span className="truncate">
                        {selectedSucursal ? selectedSucursal.nombre : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                <Command filter={(value, search) => {
                    // Filtrar por nombre de sucursal
                    const sucursal = sucursales.find(s => s.id.toString() === value);
                    if (sucursal?.nombre.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                }}>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{notFoundMessage}</CommandEmpty>
                        <CommandGroup>
                            {sucursales.map((sucursal) => (
                                <CommandItem
                                    key={sucursal.id}
                                    value={sucursal.id.toString()} // Usar ID como valor
                                    onSelect={(currentValue) => {
                                        const selectedId = parseInt(currentValue);
                                        if (!isNaN(selectedId)) {
                                            onSelect(selectedId);
                                        }
                                        setOpen(false);
                                    }}
                                    className="py-2 px-3" // Ajustar padding si es necesario
                                >
                                    <Check
                                        className={cn("mr-2 h-4 w-4",
                                            selectedSucursalId === sucursal.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {sucursal.nombre}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
} 
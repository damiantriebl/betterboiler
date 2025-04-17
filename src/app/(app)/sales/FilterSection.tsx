import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { colores, marcas, tipos, ubicaciones, estadosVenta } from "@/data/motorcycles";
import { EstadoVenta } from "@/types/BikesType";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterSectionProps {
    filters: {
        search: string;
        marca: string;
        tipo: string;
        ubicacion: string;
        estadosVenta: EstadoVenta[];
    };
    onFilterChange: (filterType: string, value: string | EstadoVenta[]) => void;
}

export default function FilterSection({ filters, onFilterChange }: FilterSectionProps) {
    const formatEstadoVenta = (estado: string) => {
        if (estado === 'ver-todo') return 'Ver todo';
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    };

    const handleEstadoVentaSelect = (estado: string) => {
        if (estado === 'ver-todo') {
            // Si selecciona "Ver todo", incluimos todos los estados
            onFilterChange("estadosVenta", [...estadosVenta]);
            return;
        }

        const isSelected = filters.estadosVenta.includes(estado as EstadoVenta);
        let newEstados: EstadoVenta[];

        if (isSelected) {
            newEstados = filters.estadosVenta.filter(e => e !== estado);
        } else {
            newEstados = [...filters.estadosVenta, estado as EstadoVenta];
        }

        onFilterChange("estadosVenta", newEstados);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="flex flex-col gap-2">
                <Label>Buscar</Label>
                <Input
                    type="text"
                    placeholder="Buscar por modelo, marca..."
                    className="w-full"
                    value={filters.search}
                    onChange={(e) => onFilterChange("search", e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label>Marca</Label>
                <Select value={filters.marca} onValueChange={(value) => onFilterChange("marca", value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas las marcas</SelectItem>
                        {marcas.map((marca) => (
                            <SelectItem key={marca} value={marca}>
                                {marca}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Tipo</Label>
                <Select value={filters.tipo} onValueChange={(value) => onFilterChange("tipo", value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los tipos</SelectItem>
                        {tipos.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                                {tipo}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Ubicación</Label>
                <Select value={filters.ubicacion} onValueChange={(value) => onFilterChange("ubicacion", value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas las ubicaciones</SelectItem>
                        {ubicaciones.map((ubicacion) => (
                            <SelectItem key={ubicacion} value={ubicacion}>
                                {ubicacion}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Estado de Venta</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "justify-between",
                                filters.estadosVenta.length > 0 && "text-primary"
                            )}
                        >
                            {filters.estadosVenta.length === estadosVenta.length
                                ? "Ver todo"
                                : filters.estadosVenta.length > 0
                                    ? `${filters.estadosVenta.length} seleccionados`
                                    : "Seleccionar estados"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Buscar estado..." />
                            <CommandEmpty>No se encontraron estados.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem
                                    key="ver-todo"
                                    onSelect={() => handleEstadoVentaSelect('ver-todo')}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            filters.estadosVenta.length === estadosVenta.length
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    Ver todo
                                </CommandItem>
                                {estadosVenta.map((estado) => (
                                    <CommandItem
                                        key={estado}
                                        onSelect={() => handleEstadoVentaSelect(estado)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                filters.estadosVenta.includes(estado as EstadoVenta)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {formatEstadoVenta(estado)}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
                {filters.estadosVenta.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {filters.estadosVenta.length === estadosVenta.length ? (
                            <Badge
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => onFilterChange("estadosVenta", [EstadoVenta.STOCK])}
                            >
                                Ver todo
                                <span className="ml-1">×</span>
                            </Badge>
                        ) : (
                            filters.estadosVenta.map((estado) => (
                                <Badge
                                    key={estado}
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const newEstados = filters.estadosVenta.filter(e => e !== estado);
                                        onFilterChange("estadosVenta", newEstados);
                                    }}
                                >
                                    {formatEstadoVenta(estado)}
                                    <span className="ml-1">×</span>
                                </Badge>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
} 
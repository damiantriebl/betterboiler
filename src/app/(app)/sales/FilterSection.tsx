import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colores, marcas, tipos, ubicaciones } from "@/data/motorcycles";
import { MotorcycleState } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
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
    estadosVenta: MotorcycleState[];
  };
  onFilterChange: (filterType: string, value: string | MotorcycleState[]) => void;
}

const estadosVentaPrisma = Object.values(MotorcycleState);

export default function FilterSection({ filters, onFilterChange }: FilterSectionProps) {
  const formatEstadoVenta = (estado: MotorcycleState) => {
    return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
  };

  const handleEstadoVentaSelect = (estadoValue: string) => {
    const estado = estadoValue as MotorcycleState;

    if (estadoValue === "ver-todo") {
      onFilterChange("estadosVenta", [...estadosVentaPrisma]);
      return;
    }

    const isSelected = filters.estadosVenta.includes(estado);
    let newEstados: MotorcycleState[];

    if (isSelected) {
      newEstados = filters.estadosVenta.filter((e) => e !== estado);
    } else {
      newEstados = [...filters.estadosVenta, estado];
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
        <Select
          value={filters.ubicacion}
          onValueChange={(value) => onFilterChange("ubicacion", value)}
        >
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
              className={cn("justify-between", filters.estadosVenta.length > 0 && "text-primary")}
            >
              {filters.estadosVenta.length === estadosVentaPrisma.length ||
              filters.estadosVenta.length === 0
                ? "Ver todo"
                : filters.estadosVenta.length === 1
                  ? formatEstadoVenta(filters.estadosVenta[0])
                  : `${filters.estadosVenta.length} seleccionados`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar estado..." />
              <CommandEmpty>No se encontraron estados.</CommandEmpty>
              <CommandGroup>
                <CommandItem key="ver-todo" onSelect={() => handleEstadoVentaSelect("ver-todo")}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      filters.estadosVenta.length === estadosVentaPrisma.length ||
                        filters.estadosVenta.length === 0
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  Ver todo
                </CommandItem>
                {estadosVentaPrisma.map((estado) => (
                  <CommandItem
                    key={estado}
                    value={estado}
                    onSelect={() => handleEstadoVentaSelect(estado)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.estadosVenta.includes(estado) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {formatEstadoVenta(estado)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {filters.estadosVenta.length > 0 &&
          filters.estadosVenta.length < estadosVentaPrisma.length && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.estadosVenta.map((estado) => (
                <Badge
                  key={estado}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    const newEstados = filters.estadosVenta.filter((e) => e !== estado);
                    onFilterChange("estadosVenta", newEstados.length > 0 ? newEstados : []);
                  }}
                >
                  {formatEstadoVenta(estado)}
                  <span className="ml-1">×</span>
                </Badge>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

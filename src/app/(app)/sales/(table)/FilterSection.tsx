import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MotorcycleState } from "@prisma/client";
import { Check, ChevronsUpDown } from "lucide-react";

interface FilterSectionProps {
  filters: {
    search: string;
    marca: string;
    tipo: string;
    ubicacion: string;
    estadosVenta: MotorcycleState[];
    years: number[];
  };
  onFilterChange: (filterType: string, value: string | MotorcycleState[] | number[]) => void;
  availableYears?: number[];
  availableBrands?: string[];
  availableModels?: string[];
  availableBranches?: string[];
}

const estadosVentaPrisma = Object.values(MotorcycleState);

export default function FilterSection({
  filters,
  onFilterChange,
  availableYears = [],
  availableBrands = [],
  availableModels = [],
  availableBranches = [],
}: FilterSectionProps) {
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

  const formatYear = (year: number) => {
    return year.toString();
  };

  const handleYearSelect = (yearValue: string) => {
    const year = Number(yearValue);

    if (yearValue === "todos-años") {
      onFilterChange("years", [...availableYears]);
      return;
    }

    const isSelected = filters.years.includes(year);
    let newYears: number[];

    if (isSelected) {
      newYears = filters.years.filter((y) => y !== year);
    } else {
      newYears = [...filters.years, year];
    }

    onFilterChange("years", newYears);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
            {availableBrands.map((marca) => (
              <SelectItem key={marca} value={marca}>
                {marca}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Modelo</Label>
        <Select value={filters.tipo} onValueChange={(value) => onFilterChange("tipo", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {availableModels.map((modelo) => (
              <SelectItem key={modelo} value={modelo}>
                {modelo}
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
            {availableBranches.map((ubicacion) => (
              <SelectItem key={ubicacion} value={ubicacion}>
                {ubicacion}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Año</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn("justify-between", filters.years.length > 0 && "text-primary")}
            >
              {filters.years.length === availableYears.length || filters.years.length === 0
                ? "Todos los años"
                : filters.years.length === 1
                  ? formatYear(filters.years[0])
                  : `${filters.years.length} seleccionados`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar año..." />
              <CommandEmpty>No se encontraron años.</CommandEmpty>
              <CommandGroup>
                <CommandItem key="todos-años" onSelect={() => handleYearSelect("todos-años")}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      filters.years.length === availableYears.length || filters.years.length === 0
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  Todos los años
                </CommandItem>
                {availableYears.map((year) => (
                  <CommandItem
                    key={year}
                    value={year.toString()}
                    onSelect={() => handleYearSelect(year.toString())}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.years.includes(year) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {formatYear(year)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {filters.years.length > 0 && filters.years.length < availableYears.length && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.years.map((year) => (
              <Badge
                key={year}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  const newYears = filters.years.filter((y) => y !== year);
                  onFilterChange("years", newYears.length > 0 ? newYears : []);
                }}
              >
                {formatYear(year)}
                <span className="ml-1">×</span>
              </Badge>
            ))}
          </div>
        )}
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

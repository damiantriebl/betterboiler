"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import type { MotorcycleForTransfer } from "@/types/logistics";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, MapPin } from "lucide-react";
import { useState } from "react";

interface MotorcycleTableProps {
  motorcycles: MotorcycleForTransfer[];
  selectedMotorcycles?: number[];
  onMotorcycleSelect?: (motorcycleId: number, selected: boolean) => void;
  showSelection?: boolean;
}

type SortConfig = {
  key: string | null;
  direction: "asc" | "desc" | null;
};

export default function MotorcycleTable({
  motorcycles,
  selectedMotorcycles = [],
  onMotorcycleSelect,
  showSelection = false,
}: MotorcycleTableProps) {
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<MotorcycleForTransfer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  // Filtrado y sorting
  const filteredAndSortedData = (() => {
    let result = [...motorcycles];

    // Filtrado
    if (searchTerm) {
      result = result.filter(
        (motorcycle) =>
          motorcycle.brand?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          motorcycle.model?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          motorcycle.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          motorcycle.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sorting
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortConfig.key) {
          case "brand":
            aValue = a.brand?.name || "";
            bValue = b.brand?.name || "";
            break;
          case "model":
            aValue = a.model?.name || "";
            bValue = b.model?.name || "";
            break;
          case "year":
            aValue = a.year;
            bValue = b.year;
            break;
          case "price":
            aValue = a.retailPrice;
            bValue = b.retailPrice;
            break;
          case "branch":
            aValue = a.branch?.name || "";
            bValue = b.branch?.name || "";
            break;
          default:
            aValue = "";
            bValue = "";
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  })();

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const handleMotorcycleSelect = (motorcycleId: number, selected: boolean) => {
    if (onMotorcycleSelect) {
      onMotorcycleSelect(motorcycleId, selected);
    }
  };

  const isSelected = (motorcycleId: number) => {
    return selectedMotorcycles.includes(motorcycleId);
  };

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Buscar motocicletas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {filteredAndSortedData.length} motocicleta
            {filteredAndSortedData.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && <TableHead className="w-[50px]">Seleccionar</TableHead>}
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("brand")}
                  className="h-auto p-0 font-medium"
                >
                  Marca/Modelo
                  {getSortIcon("brand")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("year")}
                  className="h-auto p-0 font-medium"
                >
                  Año
                  {getSortIcon("year")}
                </Button>
              </TableHead>
              <TableHead>Color</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("branch")}
                  className="h-auto p-0 font-medium"
                >
                  Sucursal
                  {getSortIcon("branch")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("price")}
                  className="h-auto p-0 font-medium"
                >
                  Precio
                  {getSortIcon("price")}
                </Button>
              </TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showSelection ? 7 : 6} className="h-24 text-center">
                  {searchTerm
                    ? "No se encontraron motocicletas que coincidan con la búsqueda."
                    : "No hay motocicletas disponibles."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((motorcycle) => (
                <TableRow key={motorcycle.id}>
                  {showSelection && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected(motorcycle.id)}
                        onCheckedChange={(checked) =>
                          handleMotorcycleSelect(motorcycle.id, checked as boolean)
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {motorcycle.brand?.name} {motorcycle.model?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Chasis: {motorcycle.chassisNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{motorcycle.year}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{motorcycle.color?.name || "N/A"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {motorcycle.branch?.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatPrice(motorcycle.retailPrice, motorcycle.currency)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMotorcycle(motorcycle)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de detalles */}
      <Dialog open={!!selectedMotorcycle} onOpenChange={() => setSelectedMotorcycle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Motocicleta</DialogTitle>
          </DialogHeader>
          {selectedMotorcycle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Marca:</strong> {selectedMotorcycle.brand?.name}
                    </div>
                    <div>
                      <strong>Modelo:</strong> {selectedMotorcycle.model?.name}
                    </div>
                    <div>
                      <strong>Año:</strong> {selectedMotorcycle.year}
                    </div>
                    <div>
                      <strong>Color:</strong> {selectedMotorcycle.color?.name || "N/A"}
                    </div>
                    <div>
                      <strong>Chasis:</strong> {selectedMotorcycle.chassisNumber}
                    </div>
                    <div>
                      <strong>Estado:</strong> <Badge>{selectedMotorcycle.state}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ubicación y Precio</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Sucursal:</strong> {selectedMotorcycle.branch?.name}
                    </div>
                    <div>
                      <strong>Precio:</strong>{" "}
                      {formatPrice(selectedMotorcycle.retailPrice, selectedMotorcycle.currency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

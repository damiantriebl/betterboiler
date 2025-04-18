"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColorConfig } from "@/types/ColorType";
import type { BranchData } from "@/actions/stock/get-branch";
import type { Supplier } from "@prisma/client";
import type { BrandForCombobox } from "./page"; // Asume que este tipo está en page.tsx
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod"; // Importar el tipo principal
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Importar componentes de Tooltip

// Interfaz para las props del Preview
interface BatchPreviewProps {
  formData: Partial<MotorcycleBatchFormData>;
  availableBrands: BrandForCombobox[];
  availableColors: ColorConfig[];
  availableBranches: BranchData[];
  suppliers: Supplier[];
}

// Componente de Vista Previa
export function BatchPreview({
  formData,
  availableBrands,
  availableColors,
  availableBranches,
  suppliers,
}: BatchPreviewProps) {
  const selectedBrand = formData.brandId
    ? availableBrands.find((b) => b.id === formData.brandId)
    : null;
  const selectedModel =
    selectedBrand && formData.modelId
      ? selectedBrand.models.find((m) => m.id === formData.modelId)
      : null;
  const selectedSupplier = formData.supplierId
    ? suppliers.find((s) => s.id === formData.supplierId)
    : null;

  const formatCurrency = (value: number | null | undefined, currency = "ARS") => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: currency }).format(value);
  };

  // Changed type from any to be more specific
  const renderValue = (value: string | number | null | undefined, fallback = "...") =>
    value ?? <span className="text-muted-foreground">{fallback}</span>;

  // Determinar el color del borde
  const brandBorderColor = selectedBrand?.color || "transparent";

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start sticky top-20">
      {/* Card 1: Añadir borde izquierdo y estilo dinámico */}
      <Card
        className="flex-1 w-full border-l-4" // Añadir clase base para el ancho del borde
        style={{ borderLeftColor: brandBorderColor }} // Establecer color dinámicamente
      >
        <CardHeader>
          <CardTitle>Información del Lote</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {/* Columna Izquierda: Info General */}
          <div className="space-y-2">
            <h4 className="font-semibold mb-1 text-base">General</h4>
            <p>
              <span className="font-medium">Marca:</span> {renderValue(selectedBrand?.name)}
            </p>
            <p>
              <span className="font-medium">Modelo:</span> {renderValue(selectedModel?.name)}
            </p>
            <p>
              <span className="font-medium">Año:</span> {renderValue(formData.year)}
            </p>
            <p>
              <span className="font-medium">Cilindrada:</span>{" "}
              {formData.displacement ? (
                `${formData.displacement} cc`
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </p>
            <p>
              <span className="font-medium">Proveedor:</span>{" "}
              {renderValue(selectedSupplier?.commercialName || selectedSupplier?.legalName, "N/A")}
            </p>
          </div>
          {/* Columna Derecha: Precios */}
          <div className="space-y-2">
            <h4 className="font-semibold mb-1 text-base">Precios ({formData.currency})</h4>
            <p>
              <span className="font-medium">Costo:</span>{" "}
              {formatCurrency(formData.costPrice, formData.currency)}
            </p>
            <p>
              <span className="font-medium">Minorista:</span>{" "}
              {formatCurrency(formData.retailPrice, formData.currency)}
            </p>
            <p>
              <span className="font-medium">Mayorista:</span>{" "}
              {formatCurrency(formData.wholesalePrice, formData.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Lista de Unidades */}
      <Card className="flex-1 w-full">
        <CardHeader>
          <CardTitle>Unidades ({formData.units?.length || 0})</CardTitle>
          <CardDescription>Detalle de cada unidad en el lote.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[450px] overflow-y-auto border rounded-md">
            {" "}
            {/* Contenedor scrollable con borde */}
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {" "}
                {/* Header fijo */}
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>{" "}
                  {/* Ajustar ancho si es necesario */}
                  <TableHead>Chasis</TableHead>
                  <TableHead>Motor</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead> {/* Nueva Columna */}
                  <TableHead className="text-right">Km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.units && formData.units.length > 0 ? (
                  formData.units.map((unit, index) => {
                    const selectedColor = unit.colorId
                      ? availableColors.find((c) => c.dbId === unit.colorId)
                      : null;
                    const selectedBranch = unit.branchId
                      ? availableBranches.find((b) => b.id === unit.branchId)
                      : null;
                    return (
                      <TableRow key={unit.idTemporal || index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{renderValue(unit.chassisNumber)}</TableCell>
                        <TableCell>{renderValue(unit.engineNumber, "N/A")}</TableCell>
                        <TableCell>
                          {selectedColor ? (
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-2 cursor-default">
                                  <span
                                    className="h-4 w-4 rounded-full border inline-block"
                                    style={{
                                      backgroundColor: selectedColor.colorOne,
                                    }}
                                  />
                                  <span>{selectedColor.name}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{selectedColor.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            renderValue(null)
                          )}
                        </TableCell>
                        <TableCell>{renderValue(selectedBranch?.nombre)}</TableCell>
                        <TableCell>{renderValue(unit.state, "STOCK")}</TableCell>{" "}
                        {/* Mostrar Estado */}
                        <TableCell className="text-right">{unit.mileage ?? 0}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground italic"
                    >
                      Aún no hay unidades añadidas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

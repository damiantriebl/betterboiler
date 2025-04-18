"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type BrandForCombobox } from "./page"; // Importar tipo desde page
import { type ColorConfig } from "@/types/ColorType";
import { cn } from "@/lib/utils";

interface MotoPreviewCardProps {
  formData: {
    marcaId?: number | null;
    modeloId?: number | null;
    año?: number | null;
    cilindrada?: number | null;
    precioVentaMinorista?: number | null;
    units?: Array<{
      nroChasis?: string | null;
      nroMotor?: string | null;
      colorId?: number | null;
      kilometraje?: number | null;
      sucursalId?: number | null;
    }> | null;
    // Añadir más campos si se quieren mostrar
  };
  availableBrands: BrandForCombobox[];
  availableColors: ColorConfig[];
}

export function MotoPreviewCard({
  formData,
  availableBrands,
  availableColors,
}: MotoPreviewCardProps) {
  const selectedBrand = React.useMemo(
    () => availableBrands.find((b) => b.id === formData.marcaId),
    [availableBrands, formData.marcaId],
  );

  const selectedModel = React.useMemo(
    () => selectedBrand?.models.find((m) => m.id === formData.modeloId),
    [selectedBrand, formData.modeloId],
  );

  const firstUnit = formData.units?.[0];

  const selectedColor = React.useMemo(
    () =>
      // Buscar por dbId ya que colorId en el form viene de ahí
      availableColors.find((c) => c.dbId === firstUnit?.colorId),
    [availableColors, firstUnit?.colorId],
  );

  // Usar el color definido en OrganizationBrand o un gris por defecto
  const brandColor = selectedBrand?.color || "#cccccc";

  const getDisplayValue = (
    value: string | number | null | undefined,
    placeholder: string = "N/A",
  ) => {
    // Devuelve el valor o el placeholder si es null, undefined o 0 (excepto para kilometraje que sí puede ser 0)
    if (value === 0 && placeholder !== "N/A") return value.toString(); // Permitir 0 si no es placeholder default
    return value !== null && value !== undefined && value !== 0 ? value.toString() : placeholder;
  };

  // Helper para mostrar precios
  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) return "-";
    return `$${value.toLocaleString("es-AR")}`; // Formato argentino
  };

  return (
    <Card
      className={cn(
        "sticky top-20 border-l-8", // Mantener visible y borde más grueso
      )}
      style={{ borderColor: brandColor }}
    >
      <CardHeader className="pb-2 pt-4">
        {" "}
        {/* Menos padding vertical */}
        <CardTitle className="text-lg">Vista Previa</CardTitle> {/* Título más pequeño */}
      </CardHeader>
      <CardContent className="space-y-2 text-sm pb-4">
        {" "}
        {/* Menos espacio y padding */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Marca:</span>
          <span className="font-medium">{getDisplayValue(selectedBrand?.name, "---")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Modelo:</span>
          <span className="font-medium">{getDisplayValue(selectedModel?.name, "---")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Año:</span>
          <span className="font-medium">{getDisplayValue(formData.año, "---")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Cilindrada:</span>
          <span className="font-medium">
            {formData.cilindrada ? `${formData.cilindrada} cc` : "---"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Precio Vta:</span>
          <span className="font-medium">{formatPrice(formData.precioVentaMinorista)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

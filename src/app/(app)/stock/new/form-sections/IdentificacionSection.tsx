"use client";

import type { BranchData } from "@/actions/stock/form-data-unified";
import { ColorSelector } from "@/components/custom/ColorSelector";
import { SucursalSelector } from "@/components/custom/SucursalSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColorConfig } from "@/types/ColorType";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import { MotorcycleState } from "@prisma/client";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import React from "react";
import type {
  Control,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from "react-hook-form";

interface IdentificacionSectionProps {
  control: Control<MotorcycleBatchFormData>;
  fields: FieldArrayWithId<MotorcycleBatchFormData, "units", "id">[];
  append: UseFieldArrayAppend<MotorcycleBatchFormData, "units">;
  remove: UseFieldArrayRemove;
  availableColors: ColorConfig[];
  availableBranches: BranchData[];
  isSubmitting?: boolean;
}

export function IdentificacionSection({
  control,
  fields,
  append,
  remove,
  availableColors,
  availableBranches,
  isSubmitting = false,
}: IdentificacionSectionProps) {
  const addIdentificacion = () => {
    append({
      idTemporal: Date.now(),
      chassisNumber: "",
      engineNumber: "",
      colorId: availableColors.length > 0 ? Number(availableColors[0].id) : 0,
      mileage: 0,
      branchId: availableBranches.length > 0 ? Number(availableBranches[0].id) : 0,
      state: MotorcycleState.STOCK,
    });
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin unidades</AlertTitle>
          <AlertDescription>Debe agregar al menos una unidad para continuar.</AlertDescription>
        </Alert>
      )}

      {fields.map((field, index) => (
        <Card key={field.id} className="border">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Unidad {index + 1}</h4>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número de Chasis */}
              <FormField
                control={control}
                name={`units.${index}.chassisNumber`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Chasis *</FormLabel>
                    <FormControl>
                      <Input
                        className="h-10"
                        placeholder="Ingrese número de chasis"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Número de Motor */}
              <FormField
                control={control}
                name={`units.${index}.engineNumber`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Motor</FormLabel>
                    <FormControl>
                      <Input
                        className="h-10"
                        placeholder="Opcional"
                        disabled={isSubmitting}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color */}
              <FormField
                control={control}
                name={`units.${index}.colorId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color *</FormLabel>
                    <FormControl>
                      <ColorSelector
                        colors={availableColors}
                        selectedColorId={field.value}
                        onSelect={(id: number | null) => field.onChange(id)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kilometraje */}
              <FormField
                control={control}
                name={`units.${index}.mileage`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje</FormLabel>
                    <FormControl>
                      <Input
                        className="h-10"
                        type="number"
                        placeholder="0"
                        min="0"
                        disabled={isSubmitting}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : Number(value));
                        }}
                        value={field.value ?? 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sucursal */}
              <FormField
                control={control}
                name={`units.${index}.branchId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal *</FormLabel>
                    <FormControl>
                      <SucursalSelector
                        sucursales={availableBranches}
                        selectedSucursalId={field.value}
                        onSelect={(id: number | null) => field.onChange(id)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado */}
              <FormField
                control={control}
                name={`units.${index}.state`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={MotorcycleState.STOCK}>En Stock</SelectItem>
                        <SelectItem value={MotorcycleState.PAUSADO}>Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addIdentificacion}
        disabled={isSubmitting}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar Unidad
      </Button>
    </div>
  );
}

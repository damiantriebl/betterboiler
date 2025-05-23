"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import type { Control } from "react-hook-form";
import type React from "react";

interface PreciosSectionProps {
  control: Control<MotorcycleBatchFormData>;
  isSubmitting?: boolean;
}

export function PreciosSection({ control, isSubmitting = false }: PreciosSectionProps) {
  const handleNullableNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: number | null) => void },
  ) => {
    const value = e.target.value;
    field.onChange(value === "" ? null : Number(value));
  };

  return (
    <div className="space-y-6">
      {/* Moneda */}
      <FormField
        control={control}
        name="currency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Moneda</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Precio de Costo */}
      <FormField
        control={control}
        name="costPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Precio de Costo ($)</FormLabel>
            <FormControl>
              <Input
                className="h-10"
                type="number"
                placeholder="0"
                disabled={isSubmitting}
                {...field}
                onChange={(e) => handleNullableNumberChange(e, field)}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Sección de Precios - Mayorista y Minorista */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Precio Mayorista */}
        <div className="space-y-4 p-4 border rounded-md w-full md:w-1/2">
          <h3 className="text-lg font-semibold mb-2 border-b pb-1">Precio Mayorista</h3>

          <FormField
            control={control}
            name="wholesalePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-base">Precio Final ($)</FormLabel>
                <FormControl>
                  <Input
                    className="h-10 font-bold text-lg"
                    type="number"
                    placeholder="0"
                    disabled={isSubmitting}
                    {...field}
                    onChange={(e) => handleNullableNumberChange(e, field)}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Precio Minorista */}
        <div className="space-y-4 p-4 border rounded-md w-full md:w-1/2">
          <h3 className="text-lg font-semibold mb-2 border-b pb-1">Precio Minorista</h3>

          <FormField
            control={control}
            name="retailPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-base">Precio Final ($)</FormLabel>
                <FormControl>
                  <Input
                    className="h-10 font-bold text-lg"
                    type="number"
                    placeholder="0"
                    disabled={isSubmitting}
                    {...field}
                    onChange={(e) => handleNullableNumberChange(e, field)}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}

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
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

interface PreciosSectionProps {
  control: Control<MotorcycleBatchFormData>;
  setValue: UseFormSetValue<MotorcycleBatchFormData>;
  watch: UseFormWatch<MotorcycleBatchFormData>;
  isSubmitting?: boolean;
}

export function PreciosSection({
  control,
  setValue,
  watch,
  isSubmitting = false,
}: PreciosSectionProps) {
  // Referencias para evitar loops infinitos
  const isCalculatingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleNullableNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: number | null) => void },
  ) => {
    const value = e.target.value;
    field.onChange(value === "" ? null : Number(value));
  };

  // Función para calcular precio final basado en costo, IVA, otros impuestos y ganancia
  const calcularPrecioFinal = (
    costPrice: number,
    ivaPorcentaje: number,
    otrosImpuestosPorcentaje: number,
    gananciaPorcentaje: number,
  ): number => {
    const costoConImpuestos =
      costPrice * (1 + ivaPorcentaje / 100) * (1 + otrosImpuestosPorcentaje / 100);
    // Si ganancia es 0, devolver solo costo + impuestos
    if (gananciaPorcentaje === 0) {
      return costoConImpuestos;
    }
    return costoConImpuestos * (1 + gananciaPorcentaje / 100);
  };

  // Función para calcular % de ganancia basado en precio final, costo, IVA y otros impuestos
  const calcularPorcentajeGanancia = (
    precioFinal: number,
    costPrice: number,
    ivaPorcentaje: number,
    otrosImpuestosPorcentaje: number,
  ): number => {
    const costoConImpuestos =
      costPrice * (1 + ivaPorcentaje / 100) * (1 + otrosImpuestosPorcentaje / 100);
    // Si el precio final es igual al costo con impuestos, ganancia es 0
    if (Math.abs(precioFinal - costoConImpuestos) < 0.01) {
      return 0;
    }
    return (precioFinal / costoConImpuestos - 1) * 100;
  };

  // Función con debounce para actualizar valores
  const debouncedSetValue = useCallback(
    (fieldName: keyof MotorcycleBatchFormData, value: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (!isCalculatingRef.current) {
          isCalculatingRef.current = true;
          setValue(fieldName, value);
          setTimeout(() => {
            isCalculatingRef.current = false;
          }, 100);
        }
      }, 500); // 500ms de delay
    },
    [setValue],
  );

  // Observar cambios en los campos para cálculos automáticos
  const watchedValues = watch([
    "costPrice",
    "ivaPorcentajeMayorista",
    "otrosImpuestosMayorista",
    "gananciaPorcentajeMayorista",
    "wholesalePrice",
    "ivaPorcentajeMinorista",
    "otrosImpuestosMinorista",
    "gananciaPorcentajeMinorista",
    "retailPrice",
  ]);

  const [
    costPrice,
    ivaPorcentajeMayorista,
    otrosImpuestosMayorista,
    gananciaPorcentajeMayorista,
    wholesalePrice,
    ivaPorcentajeMinorista,
    otrosImpuestosMinorista,
    gananciaPorcentajeMinorista,
    retailPrice,
  ] = watchedValues;

  // Efecto para calcular precio mayorista cuando cambian costo, IVA, otros impuestos o ganancia
  // biome-ignore lint/correctness/useExhaustiveDependencies: Evitar loop infinito con funciones dependientes
  useEffect(() => {
    if (isCalculatingRef.current) return;

    if (
      costPrice &&
      typeof ivaPorcentajeMayorista === "number" &&
      typeof otrosImpuestosMayorista === "number" &&
      typeof gananciaPorcentajeMayorista === "number" &&
      costPrice > 0 &&
      ivaPorcentajeMayorista >= 0 &&
      otrosImpuestosMayorista >= 0 &&
      gananciaPorcentajeMayorista >= 0
    ) {
      const nuevoPrecio = calcularPrecioFinal(
        costPrice,
        ivaPorcentajeMayorista,
        otrosImpuestosMayorista,
        gananciaPorcentajeMayorista,
      );
      const precioRedondeado = Math.round(nuevoPrecio * 100) / 100;

      if (Math.abs(precioRedondeado - (wholesalePrice || 0)) > 0.01) {
        debouncedSetValue("wholesalePrice", precioRedondeado);
      }
    }
  }, [
    costPrice,
    ivaPorcentajeMayorista,
    otrosImpuestosMayorista,
    gananciaPorcentajeMayorista,
    debouncedSetValue,
  ]);

  // Efecto para calcular ganancia mayorista cuando cambia el precio final
  // biome-ignore lint/correctness/useExhaustiveDependencies: Evitar loop infinito con funciones dependientes
  useEffect(() => {
    if (isCalculatingRef.current) return;

    if (
      costPrice &&
      typeof ivaPorcentajeMayorista === "number" &&
      typeof otrosImpuestosMayorista === "number" &&
      wholesalePrice &&
      costPrice > 0 &&
      ivaPorcentajeMayorista >= 0 &&
      otrosImpuestosMayorista >= 0 &&
      wholesalePrice > 0
    ) {
      const nuevaGanancia = calcularPorcentajeGanancia(
        wholesalePrice,
        costPrice,
        ivaPorcentajeMayorista,
        otrosImpuestosMayorista,
      );
      const gananciaRedondeada = Math.round(nuevaGanancia * 100) / 100;

      if (Math.abs(gananciaRedondeada - (gananciaPorcentajeMayorista || 0)) > 0.01) {
        debouncedSetValue("gananciaPorcentajeMayorista", gananciaRedondeada);
      }
    }
  }, [
    wholesalePrice,
    costPrice,
    ivaPorcentajeMayorista,
    otrosImpuestosMayorista,
    debouncedSetValue,
  ]);

  // Efecto para calcular precio minorista cuando cambian costo, IVA, otros impuestos o ganancia
  // biome-ignore lint/correctness/useExhaustiveDependencies: Evitar loop infinito con funciones dependientes
  useEffect(() => {
    if (isCalculatingRef.current) return;

    if (
      costPrice &&
      typeof ivaPorcentajeMinorista === "number" &&
      typeof otrosImpuestosMinorista === "number" &&
      typeof gananciaPorcentajeMinorista === "number" &&
      costPrice > 0 &&
      ivaPorcentajeMinorista >= 0 &&
      otrosImpuestosMinorista >= 0 &&
      gananciaPorcentajeMinorista >= 0
    ) {
      const nuevoPrecio = calcularPrecioFinal(
        costPrice,
        ivaPorcentajeMinorista,
        otrosImpuestosMinorista,
        gananciaPorcentajeMinorista,
      );
      const precioRedondeado = Math.round(nuevoPrecio * 100) / 100;

      if (Math.abs(precioRedondeado - (retailPrice || 0)) > 0.01) {
        debouncedSetValue("retailPrice", precioRedondeado);
      }
    }
  }, [
    costPrice,
    ivaPorcentajeMinorista,
    otrosImpuestosMinorista,
    gananciaPorcentajeMinorista,
    debouncedSetValue,
  ]);

  // Efecto para calcular ganancia minorista cuando cambia el precio final
  // biome-ignore lint/correctness/useExhaustiveDependencies: Evitar loop infinito con funciones dependientes
  useEffect(() => {
    if (isCalculatingRef.current) return;

    if (
      costPrice &&
      typeof ivaPorcentajeMinorista === "number" &&
      typeof otrosImpuestosMinorista === "number" &&
      retailPrice &&
      costPrice > 0 &&
      ivaPorcentajeMinorista >= 0 &&
      otrosImpuestosMinorista >= 0 &&
      retailPrice > 0
    ) {
      const nuevaGanancia = calcularPorcentajeGanancia(
        retailPrice,
        costPrice,
        ivaPorcentajeMinorista,
        otrosImpuestosMinorista,
      );
      const gananciaRedondeada = Math.round(nuevaGanancia * 100) / 100;

      if (Math.abs(gananciaRedondeada - (gananciaPorcentajeMinorista || 0)) > 0.01) {
        debouncedSetValue("gananciaPorcentajeMinorista", gananciaRedondeada);
      }
    }
  }, [retailPrice, costPrice, ivaPorcentajeMinorista, otrosImpuestosMinorista, debouncedSetValue]);

  // Cleanup del timeout cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
            name="ivaPorcentajeMayorista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IVA (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="h-10 pr-8"
                      type="number"
                      placeholder="21"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? 21}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="otrosImpuestosMayorista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Otros Impuestos (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="h-10 pr-8"
                      type="number"
                      placeholder="0"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? 0}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="gananciaPorcentajeMayorista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>% Ganancia</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="h-10 pr-8"
                      type="number"
                      placeholder="0"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? ""}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
            name="ivaPorcentajeMinorista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IVA (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="h-10 pr-8"
                      type="number"
                      placeholder="21"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? 21}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="otrosImpuestosMinorista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Otros Impuestos (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="h-10 pr-8"
                      type="number"
                      placeholder="0"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? 0}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="gananciaPorcentajeMinorista"
            render={({ field }) => (
              <FormItem>
                <FormLabel>% Ganancia</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="h-10 pr-8"
                      type="number"
                      placeholder="0"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? ""}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

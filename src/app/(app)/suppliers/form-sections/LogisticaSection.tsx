"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface LogisticaSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function LogisticaSection({ control, isSubmitting = false }: LogisticaSectionProps) {
  return (
    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name="shippingMethods"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Métodos de Envío</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Correo Argentino, Flete propio (opcional)"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="shippingCosts"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Costos de Envío</FormLabel>
            <FormControl>
              <Input
                placeholder="Detallar costos o 'Según cotización' (opcional)"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="deliveryTimes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tiempos de Entrega Promedio</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: 24-72hs hábiles (opcional)"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="transportConditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Condiciones de Transporte</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Requiere cadena de frío (opcional)"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

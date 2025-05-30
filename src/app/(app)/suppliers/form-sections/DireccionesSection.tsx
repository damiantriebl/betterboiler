"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface DireccionesSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function DireccionesSection({ control, isSubmitting = false }: DireccionesSectionProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="legalAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domicilio Legal</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Dirección legal completa (opcional)"
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
        name="commercialAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domicilio Comercial</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Dirección comercial/sede (opcional)"
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
        name="deliveryAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domicilio de Entrega</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Dirección de entrega/retiro (opcional)"
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

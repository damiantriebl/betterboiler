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
import { Textarea } from "@/components/ui/textarea";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface ComercialSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function ComercialSection({ control, isSubmitting = false }: ComercialSectionProps) {
  return (
    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name="paymentCurrency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Moneda de Pago</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: ARS, USD, EUR (opcional)"
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
        name="paymentTermDays"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Plazo de Pago (días)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Ej: 30 (opcional)"
                disabled={isSubmitting}
                {...field}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="creditLimit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Límite de Crédito</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder="Monto máximo (opcional)"
                disabled={isSubmitting}
                {...field}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="paymentMethods"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Formas de Pago</FormLabel>
            <FormControl>
              <Input
                placeholder="Efectivo, Transferencia, Cheque (opcional)"
                disabled={isSubmitting}
                value={Array.isArray(field.value) ? field.value.join(", ") : ""}
                onChange={(e) => field.onChange(e.target.value.split(", ").filter(Boolean))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="discountsConditions"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Descuentos o Condiciones Especiales</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Detallar descuentos por pronto pago, volumen, etc. (opcional)"
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
        name="returnPolicy"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Política de Devoluciones y Garantías</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describir política (opcional)"
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

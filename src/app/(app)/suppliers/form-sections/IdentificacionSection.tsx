"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface IdentificacionSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function IdentificacionSection({
  control,
  isSubmitting = false,
}: IdentificacionSectionProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="legalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Razón Social</FormLabel>
            <FormControl>
              <Input placeholder="Nombre legal completo" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="commercialName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre Comercial</FormLabel>
            <FormControl>
              <Input
                placeholder="Nombre de fantasía (opcional)"
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
        name="taxIdentification"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identificación Tributaria (CUIT/CUIL/etc.)</FormLabel>
            <FormControl>
              <Input placeholder="Ej: 20-12345678-9" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface BancariaSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function BancariaSection({ control, isSubmitting = false }: BancariaSectionProps) {
  return (
    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name="bank"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Banco</FormLabel>
            <FormControl>
              <Input placeholder="Nombre del banco (opcional)" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="accountTypeNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo/Nro de Cuenta</FormLabel>
            <FormControl>
              <Input placeholder="Ej: CA 123456789 (opcional)" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="cbu"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CBU/IBAN</FormLabel>
            <FormControl>
              <Input
                placeholder="Código bancario uniforme (opcional)"
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
        name="bankAlias"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Alias Bancario</FormLabel>
            <FormControl>
              <Input
                placeholder="Alias para transferencias (opcional)"
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
        name="swiftBic"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>SWIFT/BIC</FormLabel>
            <FormControl>
              <Input
                placeholder="Código internacional (opcional)"
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

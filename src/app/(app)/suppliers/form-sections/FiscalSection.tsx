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
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface FiscalSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function FiscalSection({ control, isSubmitting = false }: FiscalSectionProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="vatCondition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Condición frente al IVA</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                <SelectItem value="Monotributista">Monotributista</SelectItem>
                <SelectItem value="Exento">Exento</SelectItem>
                <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="voucherType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Comprobante Emitido</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Factura A">Factura A</SelectItem>
                <SelectItem value="Factura B">Factura B</SelectItem>
                <SelectItem value="Factura C">Factura C</SelectItem>
                <SelectItem value="Recibo X">Recibo X</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="grossIncome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ingresos Brutos (Nro./Convenio)</FormLabel>
            <FormControl>
              <Input
                placeholder="Número o 'Convenio Multilateral'"
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
        name="localTaxRegistration"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Inscripción Tributaria Local</FormLabel>
            <FormControl>
              <Input
                placeholder="Número de inscripción municipal/provincial (opcional)"
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

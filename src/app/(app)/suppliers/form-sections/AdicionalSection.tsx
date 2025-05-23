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

interface AdicionalSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function AdicionalSection({ control, isSubmitting = false }: AdicionalSectionProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="itemsCategories"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rubros / Categorías</FormLabel>
            <FormControl>
              <Input
                placeholder="Productos o servicios ofrecidos (opcional)"
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
        name="certifications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Certificaciones</FormLabel>
            <FormControl>
              <Input placeholder="ISO 9001, etc. (opcional)" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="commercialReferences"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Referencias Comerciales</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Otros clientes (opcional)"
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
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estado</FormLabel>
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
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notesObservations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas / Observaciones Internas</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Cualquier nota adicional (opcional)"
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

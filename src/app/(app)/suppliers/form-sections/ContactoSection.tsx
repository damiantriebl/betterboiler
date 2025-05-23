"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { SupplierFormData } from "@/zod/SuppliersZod";
import type { Control } from "react-hook-form";

interface ContactoSectionProps {
  control: Control<SupplierFormData>;
  isSubmitting?: boolean;
}

export function ContactoSection({ control, isSubmitting = false }: ContactoSectionProps) {
  return (
    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name="contactName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Persona de Contacto</FormLabel>
            <FormControl>
              <Input placeholder="Nombre completo (opcional)" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="contactPosition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cargo</FormLabel>
            <FormControl>
              <Input placeholder="Cargo (opcional)" disabled={isSubmitting} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="landlineNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Teléfono Fijo</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: +54 11 1234-5678 (opcional)"
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
        name="mobileNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Teléfono Móvil</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: +54 9 11 1234-5678 (opcional)"
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
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="contacto@empresa.com (opcional)"
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
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sitio Web</FormLabel>
            <FormControl>
              <Input
                placeholder="https://empresa.com (opcional)"
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

"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";

import type { Control } from "react-hook-form";

interface LegalSectionProps {
  control: Control<MotorcycleBatchFormData>;
  isSubmitting?: boolean;
}

export function LegalSection({ control, isSubmitting = false }: LegalSectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>Esta sección contiene información legal del lote de motocicletas.</p>
        <p>
          Los campos específicos de cada unidad (patente, observaciones) se manejan en la sección de
          Identificación.
        </p>
      </div>

      {/* Aquí podríamos agregar otros campos legales globales en el futuro */}
      {/* Por ahora, esta sección queda como placeholder para futuras funcionalidades legales */}
    </div>
  );
}

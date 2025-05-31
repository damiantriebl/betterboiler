"use client";

import type { MotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id";
import { updateMotorcycle } from "@/actions/stock";
import type { getFormData } from "@/actions/stock/form-data-unified";
import { NewMotoFormRefactored } from "@/app/(app)/stock/new/NewMotoForm";
import { toast } from "@/hooks/use-toast";
import { type MotorcycleBatchFormData, motorcycleBatchSchema } from "@/zod/NewBikeZod";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useActionState } from "react";
import { useForm } from "react-hook-form";

interface EditMotorcycleFormProps {
  motorcycle: MotorcycleWithRelations;
  formData: Awaited<ReturnType<typeof getFormData>>;
}

export function EditMotorcycleForm({ motorcycle, formData }: EditMotorcycleFormProps) {
  // Preparar react-hook-form
  const form = useForm<MotorcycleBatchFormData>({
    resolver: zodResolver(motorcycleBatchSchema),
    // defaultValues se manejarán dentro de NewMotoForm con useEffect
  });

  // Preparar useActionState
  const [state, formAction, isPending] = useActionState(
    updateMotorcycle.bind(null, motorcycle.id),
    null,
  );

  // Efecto para mostrar toasts basado en el estado de la acción
  useEffect(() => {
    if (state?.success === true) {
      toast({ title: "Éxito", description: state.message });
    } else if (state?.success === false && state?.error) {
      if (typeof state.error === "string") {
        toast({ title: "Error", description: state.error, variant: "destructive" });
      } else {
        // Si es un objeto de errores, mostrar solo el primer error
        const firstError = Object.values(state.error)[0];
        if (firstError && Array.isArray(firstError) && firstError[0]) {
          toast({ title: "Error", description: firstError[0], variant: "destructive" });
        }
      }
    }
  }, [state]);

  return (
    <form action={formAction}>
      <NewMotoFormRefactored
        form={form}
        isEditing={true}
        initialData={motorcycle}
        availableBrands={formData.availableBrands}
        availableColors={formData.availableColors}
        availableBranches={formData.availableBranches}
        suppliers={formData.suppliers}
        isSubmitting={isPending}
        serverSuccess={state?.success}
        serverError={state?.success === false ? state.message : null}
        submitButtonLabel="Guardar Cambios"
        onSubmit={(e) => {
          /* No hacer nada, action se encarga */
        }}
      />
    </form>
  );
}

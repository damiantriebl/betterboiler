"use client";

import { getMotorcycleById } from "@/actions/sales/get-motorcycle-by-id";
import type { MotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id"; // Importar tipo
import { getFormData } from "@/actions/stock/get-form-data"; // Acción para obtener datos del form
import { updateMotorcycle } from "@/actions/stock/update-motorcycle";
// Importar el componente de formulario
import { NewMotoForm } from "@/app/(app)/stock/new/NewMotoForm"; // Usar el form directamente
import { toast } from "@/hooks/use-toast";
import { type MotorcycleBatchFormData, motorcycleBatchSchema } from "@/zod/MotorcycleBatchSchema";
import { zodResolver } from "@hookform/resolvers/zod"; // Importar resolver
import { notFound } from "next/navigation";
import { useActionState } from "react";
import React, { useEffect } from "react"; // Importar React
import { useForm } from "react-hook-form"; // Importar useForm

interface EditMotorcyclePageProps {
  params: {
    id: string;
  };
}

export default async function EditMotorcyclePage({ params }: EditMotorcyclePageProps) {
  const { id } = params;
  console.log(id);

  const [motorcycle, formData] = await Promise.all([getMotorcycleById(id), getFormData()]);

  if (!motorcycle) {
    notFound(); // Mostrar página 404 si la moto no existe
  }

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
      // Redirigir o actualizar de alguna manera si es necesario
    } else if (state?.success === false && state.message) {
      toast({ variant: "destructive", title: "Error", description: state.message });
      // Si hay errores de validación, pasarlos al form
      if (state.errors) {
        Object.keys(state.errors).forEach((key) => {
          const field = key as keyof MotorcycleBatchFormData;
          const message = state.errors?.[field]?.[0]; // Tomar el primer mensaje
          if (message) {
            form.setError(field, { type: "server", message });
          }
        });
      }
    }
  }, [state, form]); // Añadir form a las dependencias

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Editar Motocicleta</h1>
        <p className="text-muted-foreground">
          Modifica los detalles de la motocicleta ID: {motorcycle.id}.
        </p>
      </div>
      {/* Renderizar el Formulario directamente */}
      <form action={formAction}>
        <NewMotoForm
          form={form} // Pasar el hook form completo
          isEditing={true}
          initialData={motorcycle}
          // Pasar datos obtenidos de getFormData
          availableBrands={formData.availableBrands}
          availableColors={formData.availableColors}
          availableBranches={formData.availableBranches}
          suppliers={formData.suppliers}
          // Pasar estado de la acción
          isSubmitting={isPending}
          serverSuccess={state?.success}
          serverError={state?.success === false ? state.message : null}
          submitButtonLabel="Guardar Cambios"
          // onSubmit no se necesita aquí ya que usamos <form action={...}>
          onSubmit={(e) => {
            /* No hacer nada, action se encarga */
          }}
        />
        {/* El botón de submit debe estar fuera o dentro de NewMotoForm 
                    pero SIN un onClick que llame a form.handleSubmit. 
                    El <form action={...}> se encarga. Si el botón está 
                    dentro de NewMotoForm, debe tener type="submit". */}
      </form>
    </main>
  );
}

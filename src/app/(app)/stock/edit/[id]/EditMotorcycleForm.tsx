"use client";

import type { MotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id";
import { getFormData } from "@/actions/stock/get-form-data";
import { updateMotorcycle } from "@/actions/stock/update-motorcycle";
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
            // Redirigir o actualizar de alguna manera si es necesario
        } else if (state?.success === false && state.message) {
            toast({ variant: "destructive", title: "Error", description: state.message });
            // Si hay errores de validación, pasarlos al form
            if (state.errors) {
                for (const key of Object.keys(state.errors)) {
                    const field = key as keyof MotorcycleBatchFormData;
                    if (state.errors[field]) {
                        const errorMessage = state.errors[field];
                        if (errorMessage) {
                            form.setError(field, {
                                type: "manual",
                                message: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
                            });
                        }
                    }
                }
            }
        }
    }, [state, form]);

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
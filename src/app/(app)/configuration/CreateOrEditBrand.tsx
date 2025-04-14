"use client";

import React, { useState, useEffect } from 'react';
import { useActionState } from 'react'; // Importar useActionState
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createOrEditBrand, State as BrandActionState } from "@/actions/configuration/create-edit-brand"; // Importar la acción y el tipo State
import { Loader2 } from 'lucide-react';

// Esquema Zod para validación del lado del cliente
const brandFormSchema = z.object({
    id: z.number().int().optional(),
    name: z.string().min(1, "El nombre de la marca es requerido."),
    color: z.string().optional(), // Añadir color opcional al esquema cliente
});

type BrandFormData = z.infer<typeof brandFormSchema>;

interface CreateOrEditBrandProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brandToEdit?: { // Datos opcionales para editar
        id: number;
        name: string;
    } | null;
    onSuccess?: () => void; // Callback opcional post-éxito
}

const initialState: BrandActionState = {
    success: false,
    error: null,
};

export default function CreateOrEditBrand({
    open,
    onOpenChange,
    brandToEdit,
    onSuccess
}: CreateOrEditBrandProps) {

    const { toast } = useToast();
    // --- Usar useActionState --- 
    const [state, formAction, isPending] = useActionState<BrandActionState, FormData>(
        createOrEditBrand,
        initialState
    );
    // --- Fin useActionState ---

    const form = useForm<BrandFormData>({
        resolver: zodResolver(brandFormSchema),
        defaultValues: {
            id: brandToEdit?.id,
            name: brandToEdit?.name ?? "",
            color: "#ffffff", // Valor por defecto para el color picker (o null/undefined si prefieres)
        },
    });

    // Resetear formulario y estado al abrir/cerrar o cambiar brandToEdit
    useEffect(() => {
        form.reset({
            id: brandToEdit?.id,
            name: brandToEdit?.name ?? "",
        });
        // Resetear el estado de la acción si el diálogo se cierra o cambia el item a editar
        if (!open || brandToEdit?.id !== form.getValues("id")) {
            // No podemos resetear state directamente, pero podemos manejar el feedback
        }

    }, [open, brandToEdit, form]);

    // Mostrar Toasts basados en el estado de la acción
    useEffect(() => {
        if (state.success) {
            toast({
                title: brandToEdit ? "Marca Actualizada" : "Marca Creada",
                description: `La marca se ${brandToEdit ? 'actualizó' : 'creó'} correctamente.`
            });
            onOpenChange(false); // Cerrar el diálogo en éxito
            if (onSuccess) onSuccess(); // Llamar callback si existe
            // No reseteamos el estado `state` aquí, useActionState lo maneja
        }
        if (state.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: state.error,
            });
        }
    }, [state, brandToEdit, onOpenChange, toast, onSuccess]);

    // Nota: No necesitamos un `onSubmit` separado si usamos `action` en el form

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{brandToEdit ? "Editar Marca" : "Crear Nueva Marca"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    {/* Usar formAction directamente en el <form> */}
                    <form action={formAction} className="space-y-4">
                        {/* Campo oculto para ID si estamos editando */}
                        {brandToEdit?.id && (
                            <input type="hidden" {...form.register("id")} value={brandToEdit.id} />
                        )}

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de la Marca</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Honda" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Añadir campo para Color */}
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Color (Opcional)</FormLabel>
                                    <FormControl>
                                        {/* Input tipo color básico */}
                                        <Input type="color" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isPending}>
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {brandToEdit ? "Guardar Cambios" : "Crear Marca"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 
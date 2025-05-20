"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod"; // Importación de Zod
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PettyCashMovement } from "@prisma/client";
import { updatePettyCashMovement } from "@/actions/petty-cash/update-petty-cash-movement"; // Importar la acción

interface EditMovementFormProps {
    movement: PettyCashMovement;
    onSubmitAction: typeof updatePettyCashMovement; // Usar el tipo de la acción importada
    onClose: () => void;
    users: { id: string; name: string; role: string }[];
}

// El tipo para el formulario se deriva del schema de Zod
type EditMovementFormValues = z.infer<typeof updatePettyCashMovementSchema>;

interface UpdatePettyCashMovementResult {
    success: boolean;
    error?: string; // Error general
    message?: string;
    data?: UpdatePettyCashMovementFormValues;
    // NO tiene fieldErrors directamente aquí.
}

const EditMovementForm = ({
    movement,
    onSubmitAction,
    onClose,
    users,
}: EditMovementFormProps) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EditMovementFormValues>({
        resolver: zodResolver(updatePettyCashMovementSchema),
        defaultValues: {
            id: movement.id,
            type: movement.type,
            description: movement.description,
            amount: movement.amount,
            date: new Date(movement.date), // Asegurar que sea un objeto Date
        },
    });

    const handleSubmit = async (values: EditMovementFormValues) => {
        setIsSubmitting(true);
        try {
            const result = await onSubmitAction(values);

            if (result.error) {
                toast({
                    title: "Error al actualizar",
                    description: result.fieldErrors
                        ? "Por favor revise los campos."
                        : result.error,
                    variant: "destructive",
                });
                if (result.fieldErrors) {
                    for (const [field, errors] of Object.entries(result.fieldErrors)) {
                        if (Array.isArray(errors) && errors.length > 0) {
                            // @ts-ignore TODO: fix this type error, field might not be in EditMovementFormValues
                            form.setError(field as keyof EditMovementFormValues, {
                                type: "server",
                                message: errors.join(", "),
                            });
                        }
                    }
                }
            } else {
                toast({
                    title: "Éxito",
                    description: "Movimiento actualizado correctamente.",
                });
                onClose();
            }
        } catch (error) {
            toast({
                title: "Error inesperado",
                description: "Ocurrió un error al actualizar el movimiento.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Movimiento</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Movimiento</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {pettyCashMovementTypeEnum.options.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type === "DEPOSIT" && "Ingreso"}
                                                    {type === "WITHDRAWAL" && "Retiro"}
                                                    {type === "SPEND" && "Gasto"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Descripción del movimiento" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="100"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            min="100"
                                            step="100"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : ""}
                                            onChange={(e) => field.onChange(new Date(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={onClose} aria-label="Cancelar" disabled={isSubmitting}>
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting} aria-label="Guardar Cambios">
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default EditMovementForm; 
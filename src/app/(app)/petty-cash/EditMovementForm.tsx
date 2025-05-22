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
import type { PettyCashSpend } from "@prisma/client";
import { updatePettyCashMovement } from "@/actions/petty-cash/update-petty-cash-movement";
import { UpdatePettyCashMovementSchema, type UpdatePettyCashMovementFormValues } from "@/zod/pettyCashSchema"; // Asegúrate que el schema se importa

// Definición simple para los tipos de movimiento si no existe un enum global
const pettyCashMovementTypeEnum = {
    options: ["DEPOSIT", "WITHDRAWAL", "SPEND"] as const, // Usar const assertion para tipos literales
};

interface EditMovementFormProps {
    movement: PettyCashSpend;
    onClose: () => void;
    users: { id: string; name: string; role: string }[]; // Esta prop parece no usarse, considerar eliminarla si no es necesaria.
}

const pettyCashMovementTypeEnumZod = z.enum(["DEPOSIT", "WITHDRAWAL", "SPEND"]);

const EditMovementForm = ({
    movement,
    onClose,
    users, // Esta prop parece no usarse
}: EditMovementFormProps) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<UpdatePettyCashMovementFormValues>({ // Usar el tipo importado del schema
        resolver: zodResolver(UpdatePettyCashMovementSchema), // Usar el schema importado
        defaultValues: {
            movementId: movement.id, // Ajustar al schema
            // type: movement.type, // 'type' no está en UpdatePettyCashMovementSchema
            description: movement.description ?? undefined, // Usar ?? undefined para campos opcionales
            amount: movement.amount,
            // date: new Date(movement.date), // 'date' no está en UpdatePettyCashMovementSchema
            ticketNumber: movement.motive ?? undefined, // Asumiendo que 'motive' mapea a 'ticketNumber'
            receiptUrl: movement.ticketUrl ?? undefined, // Asumiendo que 'ticketUrl' mapea a 'receiptUrl'
        },
    });

    const handleSubmit = async (values: UpdatePettyCashMovementFormValues) => { // Usar el tipo importado
        setIsSubmitting(true);
        try {
            // Llamar a la acción directamente
            const result = await updatePettyCashMovement(values);

            if (!result.success) { // Simplificar la condición
                toast({
                    title: "Error al actualizar",
                    description: result.fieldErrors
                        ? "Por favor revise los campos."
                        : result.error || "Ocurrió un error desconocido.",
                    variant: "destructive",
                });
                if (result.fieldErrors) {
                    for (const [field, errors] of Object.entries(result.fieldErrors)) {
                        if (errors && errors.length > 0) { // Chequear que errors exista
                            form.setError(field as keyof UpdatePettyCashMovementFormValues, { // Quitar el @ts-ignore si es posible
                                type: "server",
                                message: errors.join(", "),
                            });
                        }
                    }
                }
            } else {
                toast({
                    title: "Éxito",
                    description: result.message || "Movimiento actualizado correctamente.",
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
                    <DialogTitle>Editar Gasto</DialogTitle> {/* Cambiado para reflejar que se editan Gastos */}
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
                        {/* El campo 'type' no está en el schema de actualización, se elimina del formulario
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
                        */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Descripción del gasto" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount" // Primero el monto
                            render={({ field, fieldState, formState }) => (
                                <FormItem>
                                    <FormLabel>Monto</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="100"
                                            {...field}
                                            value={field.value === undefined || field.value === null ? "" : String(field.value)} // Manejar undefined/null para el valor inicial
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Permitir campo vacío para borrar, o parsear a número
                                                const numericValue = value === "" ? undefined : Number.parseFloat(value);
                                                field.onChange(numericValue);
                                            }}
                                            onBlur={(e) => { // Asegurar que onBlur también maneje el parseo
                                                const value = e.target.value;
                                                const numericValue = Number.parseFloat(value);
                                                if (!Number.isNaN(numericValue)) {
                                                    field.onChange(numericValue); // Actualiza el valor del formulario
                                                } else if (value === "") {
                                                    field.onChange(undefined); // Permitir borrar el campo
                                                }
                                                // No es necesario llamar a field.onBlur() explícitamente aquí si no se necesita un comportamiento adicional
                                            }}
                                            min="0" // O el mínimo que corresponda, puede ser 1 o 100
                                            step="0.01" // O el step que corresponda, como 1 o 100
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ticketNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Comprobante</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: F001-00001234" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="receiptUrl" // Campo para la URL del comprobante (opcional)
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL del Comprobante (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://ejemplo.com/comprobante.jpg" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* El campo 'date' no está en el schema de actualización, se elimina del formulario
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
                        */}
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
                {/* TODO: Agregar DialogDescription si es necesario para accesibilidad */}
            </DialogContent>
        </Dialog>
    );
};

export default EditMovementForm; 
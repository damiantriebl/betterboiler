"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { createPettyCashSpendWithTicket } from "@/actions";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useActionState, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createPettyCashSpendSchema as zodGlobalSchema } from "@/zod/PettyCashZod";
import { z } from "zod";
import { CreatePettyCashSpendState } from "@/types/action-states";
import { type PettyCashSpend } from "@prisma/client";
import { updatePettyCashMovement } from "@/actions/petty-cash/update-petty-cash-movement";
import { UpdatePettyCashMovementSchema, type UpdatePettyCashMovementFormValues } from "@/zod/pettyCashSchema";

const spendFormClientSchema = zodGlobalSchema.omit({ withdrawalId: true, ticketUrl: true }).extend({
    motive: z.string().min(1, "El motivo es requerido."),
});

type SpendFormData = z.infer<typeof spendFormClientSchema>;

interface SpendFormProps {
    withdrawalId: string;
    onClose: () => void;
    organizationId: string;
}

const initialActionState: CreatePettyCashSpendState = {
    status: "idle",
    message: "",
    errors: {},
};

export default function SpendForm({
    withdrawalId,
    onClose,
    organizationId,
}: SpendFormProps) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [currentWithdrawalBalance, setCurrentWithdrawalBalance] = useState<number | null>(null);
    const [balanceError, setBalanceError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [state, formAction, isPending] = useActionState<CreatePettyCashSpendState, FormData>(
        createPettyCashSpendWithTicket,
        initialActionState,
    );

    const form = useForm<SpendFormData>({
        resolver: zodResolver(spendFormClientSchema),
        defaultValues: {
            amount: 0,
            motive: "",
            description: "",
            date: new Date(),
        },
    });

    const watchedMotive = useWatch({
        control: form.control,
        name: "motive",
    });

    useEffect(() => {
        if (watchedMotive !== 'otros') {
            form.clearErrors('description');
        }
    }, [watchedMotive, form]);

    useEffect(() => {
        if (state.status === "success") {
            toast({
                title: "Gasto Registrado",
                description: state.message || "El gasto y el comprobante se han registrado correctamente.",
            });
            onClose();
            form.reset();
        }
        if (state.status === "error") {
            toast({
                variant: "destructive",
                title: "Error al registrar el gasto",
                description: state.errors?._form?.join(", ") || state.message || "Ocurrió un error desconocido.",
            });
            if (state.errors) {
                for (const [key, value] of Object.entries(state.errors)) {
                    if (key === "_form") continue;
                    const fieldKey = key as keyof SpendFormData | "ticketFile" | "root" | "root.serverError";
                    const messages = Array.isArray(value) ? value : [value];
                    if (messages.length > 0) {
                        if (fieldKey === "ticketFile") {
                            form.setError("root.serverError", { type: "server", message: `Archivo: ${messages.join(", ")}` });
                        } else if (form.control._fields && fieldKey in form.control._fields) {
                            form.setError(fieldKey as keyof SpendFormData, { type: "server", message: messages.join(", ") });
                        } else {
                            form.setError("root", { type: "server", message: messages.join(", ") });
                        }
                    }
                }
            }
        }
    }, [state, onClose, toast, form]);

    useEffect(() => {
        async function fetchWithdrawalBalance() {
            if (withdrawalId && organizationId) {
                // Asumiría que getPettyCashWithdrawalBalance existe y es una server action
                // const result = await getPettyCashWithdrawalBalance(withdrawalId, organizationId);
                // if (result.error) {
                //     setBalanceError(result.error);
                //     toast({ variant: "destructive", title: "Error", description: result.error });
                // } else {
                //     setCurrentWithdrawalBalance(result.balance);
                // }
            }
        }
        fetchWithdrawalBalance();
    }, [withdrawalId, organizationId]);

    const attemptFormSubmission = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const isValid = await form.trigger();

        if (isValid) {
            const rhfData = form.getValues();

            if (formRef.current) {
                const formData = new FormData(formRef.current);

                React.startTransition(() => {
                    formAction(formData);
                });
            } else {
                console.error("La referencia al formulario no está disponible.");
                toast({
                    variant: "destructive",
                    title: "Error Interno",
                    description: "No se pudo enviar el formulario. Intente de nuevo.",
                });
            }
        } else {
            console.log("Validación del cliente falló (manual trigger):", form.formState.errors);
            toast({
                variant: "destructive",
                title: "Error de Validación",
                description: "Por favor corrige los errores en el formulario.",
            });
        }

        const spendAmount = form.getValues("amount");
        if (currentWithdrawalBalance !== null && spendAmount > currentWithdrawalBalance) {
            form.setError("amount", { type: "manual", message: `El monto no puede exceder el saldo disponible del retiro: ${currentWithdrawalBalance}` });
            return;
        }
    };

    let ticketErrorMessage: string | null = null;
    if (form.formState.errors.root?.serverError?.message) {
        ticketErrorMessage = form.formState.errors.root.serverError.message;
    } else if (state.errors && state.errors.ticketFile) {
        if (Array.isArray(state.errors.ticketFile)) {
            ticketErrorMessage = state.errors.ticketFile.join(", ");
        } else {
            ticketErrorMessage = String(state.errors.ticketFile);
        }
    }

    const handleSubmit = async (values: UpdatePettyCashMovementFormValues) => {
        setIsSubmitting(true);
        try {
            const result = await updatePettyCashMovement(values);

            if (!result.success) {
                toast({
                    title: "Error al actualizar",
                    description: result.fieldErrors
                        ? "Por favor revise los campos."
                        : result.error || "Ocurrió un error desconocido.",
                    variant: "destructive",
                });
                if (result.fieldErrors) {
                    for (const [fieldKeyString, errors] of Object.entries(result.fieldErrors)) {
                        if (errors && errors.length > 0) {
                            if (form.control._fields && fieldKeyString in form.control._fields) {
                                form.setError(fieldKeyString as keyof SpendFormData, {
                                    type: "server",
                                    message: errors.join(", "),
                                });
                            } else {
                                form.setError("root", {
                                    type: "server",
                                    message: `Error en campo '${fieldKeyString}': ${errors.join(", ")}`,
                                });
                            }
                        }
                    }
                }
            } else {
                toast({
                    title: "Éxito",
                    description: result.message || "Gasto actualizado correctamente.",
                });
                onClose();
            }
        } catch (error) {
            console.error("Error in handleSubmit:", error);
            toast({
                title: "Error inesperado",
                description: "Ocurrió un error al actualizar el gasto.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) { form.reset(); onClose(); } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Gasto y Subir Comprobante</DialogTitle>
                    <DialogDescription>
                        Complete los detalles del gasto y adjunte el comprobante si es necesario.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        ref={formRef}
                        onSubmit={attemptFormSubmission}
                        className="space-y-4"
                    >
                        <input type="hidden" name="withdrawalId" value={withdrawalId} />
                        <input type="hidden" name="organizationId" value={organizationId} />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field, fieldState, formState }) => (
                                <FormItem>
                                    <FormLabel>Monto del Gasto</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="100"
                                            min="100"
                                            placeholder="100"
                                            {...field}
                                            value={
                                                field.value === 0 && !fieldState.isDirty && !formState.isSubmitted
                                                    ? ""
                                                    : String(field.value)
                                            }
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                    field.onChange(0);
                                                } else {
                                                    const numericValue = parseFloat(val);
                                                    field.onChange(isNaN(numericValue) ? val : numericValue);
                                                }
                                            }}
                                            onBlur={e => {
                                                let numericValue = parseFloat(String(field.value));
                                                if (isNaN(numericValue)) {
                                                    numericValue = 0;
                                                } else if (numericValue < 100 && numericValue !== 0) {
                                                    numericValue = 100;
                                                }
                                                field.onChange(numericValue);
                                                if (field.onBlur) {
                                                    field.onBlur();
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="motive"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                        <FormControl>
                                            <SelectTrigger id="motive">
                                                <SelectValue placeholder="Seleccione un motivo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="combustible">Combustible</SelectItem>
                                            <SelectItem value="viaticos">Viáticos</SelectItem>
                                            <SelectItem value="repuestos">Repuestos</SelectItem>
                                            <SelectItem value="servicio_mecanico">Servicio mecánico</SelectItem>
                                            <SelectItem value="impuestos">Impuestos</SelectItem>
                                            <SelectItem value="banco">Gastos bancarios</SelectItem>
                                            <SelectItem value="papeleria">Papelería</SelectItem>
                                            <SelectItem value="servicios">Servicios públicos</SelectItem>
                                            <SelectItem value="libreria_impresiones">Librería e Impresiones</SelectItem>
                                            <SelectItem value="mantenimiento_local">Mantenimiento Local</SelectItem>
                                            <SelectItem value="publicidad_marketing">Publicidad y Marketing</SelectItem>
                                            <SelectItem value="otros">Otros</SelectItem>
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
                                    <FormLabel>Descripción del Gasto {watchedMotive === 'otros' ? '(Requerido)' : '(Opcional)'}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={watchedMotive === 'otros' ? "Detalle el gasto..." : "Ej: Compra de insumos de oficina (opcional)"}
                                            {...field}
                                            value={field.value ?? ""}
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
                                    <FormLabel>Fecha del Gasto</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            {...field}
                                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormItem>
                            <FormLabel>Comprobante (Ticket/Factura)</FormLabel>
                            <FormControl>
                                <Input type="file" name="ticketFile" accept="image/jpeg,image/png,application/pdf" />
                            </FormControl>
                            {ticketErrorMessage && (
                                <p className="text-sm font-medium text-destructive">
                                    {ticketErrorMessage}
                                </p>
                            )}
                        </FormItem>

                        {form.formState.errors.root && !form.formState.errors.root.serverError && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
                        )}

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={() => { form.reset(); onClose(); }} disabled={isPending}>
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar Gasto
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

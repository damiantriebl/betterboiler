"use client";

import React, { useEffect, useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { recordPaymentSchema, type RecordPaymentInput } from "@/zod/current-account-schemas";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordPayment } from "@/actions/current-accounts/record-payment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ActionState } from "@/types/action-states";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAccountId: string;
    defaultAmount: number;
    installmentNumber: number;
}

const initialActionState: ActionState = {
    success: false,
    message: undefined,
    error: undefined,
};

export default function PaymentModal({
    isOpen,
    onClose,
    currentAccountId,
    defaultAmount,
    installmentNumber,
}: PaymentModalProps) {
    const [actionState, formAction, isActionPending] = useActionState(
        recordPayment,
        initialActionState
    );

    const [showSurplusOptions, setShowSurplusOptions] = useState(false);

    const form = useForm<RecordPaymentInput>({
        resolver: zodResolver(recordPaymentSchema),
        defaultValues: {
            currentAccountId,
            amountPaid: defaultAmount,
            paymentDate: new Date().toISOString(),
            paymentMethod: "Efectivo",
            notes: "",
            installmentNumber: installmentNumber,
        },
    });

    useEffect(() => {
        if (form.watch('amountPaid') > defaultAmount) {
            setShowSurplusOptions(true);
            form.setValue('surplusAction', undefined);
        } else {
            setShowSurplusOptions(false);
        }
    }, [form.watch('amountPaid'), defaultAmount, form]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    useEffect(() => {
        if (actionState.success) {
            setTimeout(() => {
                onClose();
                form.reset();
            }, 1200);
        }
    }, [actionState.success, onClose, form]);

    const processForm = async (data: RecordPaymentInput) => {
        formAction(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                onClose();
                form.reset();
            }
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pago de Cuota {installmentNumber}</DialogTitle>
                    <DialogDescription>
                        Ingresa los detalles del pago para esta cuota.
                    </DialogDescription>
                </DialogHeader>

                {actionState.message && actionState.success && (
                    <Alert variant="default" className="mb-4">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Éxito</AlertTitle>
                        <AlertDescription>{actionState.message}</AlertDescription>
                    </Alert>
                )}
                {actionState.error && !actionState.success && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{actionState.error}</AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(processForm)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amountPaid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto a pagar</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ingrese monto"
                                            {...field}
                                            onChange={(e) => {
                                                const rawValue = e.target.value;
                                                const sanitizedValue = rawValue.replace(/,/g, '.').replace(/[^0-9.]/g, '');

                                                const parts = sanitizedValue.split('.');
                                                let finalValue = sanitizedValue;
                                                if (parts.length > 2) {
                                                    finalValue = parts[0] + '.' + parts.slice(1).join('');
                                                }

                                                if (finalValue === '') {
                                                    field.onChange(undefined);
                                                } else if (finalValue === '.') {
                                                    field.onChange(undefined);
                                                } else {
                                                    const numericValue = parseFloat(finalValue);
                                                    if (!isNaN(numericValue)) {
                                                        field.onChange(numericValue);
                                                    } else {
                                                        field.onChange(undefined);
                                                    }
                                                }
                                            }}
                                            value={field.value === undefined || field.value === null ? '' : String(field.value)}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Monto sugerido: {formatCurrency(defaultAmount)}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {showSurplusOptions && (
                            <div className="space-y-2">
                                <FormLabel>Acción para el excedente</FormLabel>
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant={form.watch('surplusAction') === 'RECALCULATE' ? 'default' : 'outline'}
                                        onClick={() => form.setValue('surplusAction', 'RECALCULATE')}
                                    >
                                        Recalcular cuotas
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={form.watch('surplusAction') === 'REDUCE_INSTALLMENTS' ? 'default' : 'outline'}
                                        onClick={() => form.setValue('surplusAction', 'REDUCE_INSTALLMENTS')}
                                    >
                                        Reducir cantidad de cuotas
                                    </Button>
                                </div>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de pago</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(new Date(field.value), "PPP")
                                                    ) : (
                                                        <span>Selecciona una fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => field.onChange(date?.toISOString() ?? new Date().toISOString())}
                                                disabled={(date) => date > new Date()}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de pago</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona el método de pago" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                                            <SelectItem value="Tarjeta de crédito">Tarjeta de crédito</SelectItem>
                                            <SelectItem value="Tarjeta de débito">Tarjeta de débito</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="transactionReference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Referencia de transacción</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Número de cheque, recibo, etc." {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Observaciones adicionales sobre el pago" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => {
                                onClose();
                                form.reset();
                            }}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isActionPending}>
                                {isActionPending ? "Procesando..." : "Registrar Pago"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { baseCurrentAccountObject, paymentFrequencySchema, currentAccountStatusSchema, type CreateCurrentAccountInput } from "@/zod/current-account-schemas";
import { createCurrentAccountAction } from "@/actions/create-current-account-action";
import { type CurrentAccount } from "@prisma/client";

// Simple InputErrorMessage component
const InputErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return <p className="text-sm font-medium text-destructive">{message}</p>;
};

// Helper function to calculate installment amount
// M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
// P = principal loan amount
// i = periodic interest rate
// n = total number of payments
const calculateInstallment = (
    principal: number,
    annualRate: number,
    periodsPerYear: number,
    numberOfInstallments: number
): number => {
    if (principal <= 0 || numberOfInstallments <= 0) { // Allow annualRate and periodsPerYear to be 0 for interest-free
        if (principal > 0 && numberOfInstallments > 0 && annualRate === 0) {
            return principal / numberOfInstallments;
        }
        return 0;
    }
    if (annualRate === 0) { // Handled above, but good for clarity
        return principal / numberOfInstallments;
    }
    const periodicInterestRate = annualRate / 100 / periodsPerYear;
    const numerator = periodicInterestRate * Math.pow(1 + periodicInterestRate, numberOfInstallments);
    const denominator = Math.pow(1 + periodicInterestRate, numberOfInstallments) - 1;

    if (denominator === 0) { // This can happen if periodicInterestRate is 0 and was not caught
        return principal / numberOfInstallments;
    }
    return principal * (numerator / denominator);
};

const getPeriodsPerYear = (frequency: z.infer<typeof paymentFrequencySchema>): number => {
    switch (frequency) {
        case "WEEKLY": return 52;
        case "BIWEEKLY": return 26;
        case "MONTHLY": return 12;
        case "QUARTERLY": return 4;
        case "ANNUALLY": return 1;
        default: return 12; // Default to monthly
    }
};

// Form-specific schema including annualInterestRate
// We access the .shape of the original schema to bypass the .refine() for extension
const formSchema = baseCurrentAccountObject.extend({
    annualInterestRate: z.number({ required_error: "La tasa de interés anual es requerida." }).min(0, "La tasa de interés no puede ser negativa."),
}).refine((data: z.infer<typeof baseCurrentAccountObject> & { annualInterestRate: number }) => data.downPayment <= data.totalAmount, { // Keep the refinement for form validation
    message: "El pago inicial no puede ser mayor que el monto total.",
    path: ["downPayment"],
});

type CurrentAccountFormValues = z.infer<typeof formSchema>;

interface CurrentAccountPaymentFormProps {
    clientId: string;
    modelId: number;
    motorcyclePrice: number;
    onSuccess?: (createdAccount: CurrentAccount) => void;
    onCancel: () => void;
    parentIsLoading?: boolean;
}

export function CurrentAccountPaymentForm({
    clientId,
    modelId,
    motorcyclePrice,
    onSuccess,
    onCancel,
    parentIsLoading = false,
}: CurrentAccountPaymentFormProps) {
    const [calculatedInstallmentAmount, setCalculatedInstallmentAmount] = useState(0);
    const [financedAmount, setFinancedAmount] = useState(0);
    const [totalRepayment, setTotalRepayment] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);
    const [actionIsLoading, setActionIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const form = useForm<CurrentAccountFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId,
            modelId,
            totalAmount: motorcyclePrice,
            downPayment: 0,
            numberOfInstallments: 12,
            paymentFrequency: "MONTHLY",
            annualInterestRate: 0,
            startDate: new Date().toISOString().split("T")[0],
            reminderLeadTimeDays: undefined,
            notes: "",
            status: "ACTIVE",
            installmentAmount: 0,
        },
    });

    const { watch, control, handleSubmit, setValue, setError, clearErrors, formState: { errors } } = form;

    const downPayment = watch("downPayment");
    const numberOfInstallments = watch("numberOfInstallments");
    const annualInterestRate = watch("annualInterestRate");
    const paymentFrequency = watch("paymentFrequency");

    useEffect(() => {
        setValue("clientId", clientId);
        setValue("modelId", modelId);
        setValue("totalAmount", motorcyclePrice);
    }, [clientId, modelId, motorcyclePrice, setValue]);

    useEffect(() => {
        const principal = motorcyclePrice - (downPayment || 0);
        setFinancedAmount(principal > 0 ? principal : 0);

        if (principal <= 0 || (numberOfInstallments || 0) <= 0) {
            setCalculatedInstallmentAmount(0);
            setValue("installmentAmount", 0);
            setTotalRepayment(0);
            setTotalInterest(0);
            return;
        }

        const periods = getPeriodsPerYear(paymentFrequency);
        const installment = calculateInstallment(
            principal,
            annualInterestRate || 0,
            periods,
            numberOfInstallments || 0
        );

        const finalInstallment = parseFloat(installment.toFixed(2));
        setCalculatedInstallmentAmount(finalInstallment);
        setValue("installmentAmount", finalInstallment);

        const currentTotalRepayment = finalInstallment * (numberOfInstallments || 0);
        setTotalRepayment(currentTotalRepayment);
        const currentTotalInterest = currentTotalRepayment - principal;
        setTotalInterest(currentTotalInterest > 0 ? currentTotalInterest : 0);

    }, [motorcyclePrice, downPayment, numberOfInstallments, annualInterestRate, paymentFrequency, setValue]);


    const handleFormSubmit = async (data: CurrentAccountFormValues) => {
        setActionIsLoading(true);
        setGeneralError(null);
        clearErrors(); // Clear previous errors

        const submissionData: CreateCurrentAccountInput = {
            clientId: data.clientId,
            modelId: data.modelId,
            totalAmount: data.totalAmount,
            downPayment: data.downPayment,
            numberOfInstallments: data.numberOfInstallments,
            installmentAmount: parseFloat(data.installmentAmount.toFixed(2)),
            paymentFrequency: data.paymentFrequency,
            startDate: new Date(data.startDate).toISOString(),
            reminderLeadTimeDays: data.reminderLeadTimeDays,
            status: data.status || "ACTIVE",
            notes: data.notes,
        };

        const result = await createCurrentAccountAction(submissionData);
        setActionIsLoading(false);

        if (result.success && result.data) {
            console.log("Current Account created:", result.data);
            if (onSuccess) {
                onSuccess(result.data);
            }
        } else {
            if (result.errors) {
                result.errors.forEach(err => {
                    setError(err.path as keyof CurrentAccountFormValues, { type: "manual", message: err.message });
                });
            }
            if (result.error) {
                setGeneralError(result.error);
            }
        }
    };

    const isSubmitDisabled = actionIsLoading || parentIsLoading || financedAmount <= 0 || calculatedInstallmentAmount <= 0 || Number.isNaN(calculatedInstallmentAmount);

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Financiación en Cuenta Corriente</CardTitle>
                <CardDescription>
                    Complete los detalles para la financiación de la motocicleta. Precio total: ${motorcyclePrice.toLocaleString()}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <CardContent className="space-y-6">
                    {generalError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md">
                            <p className="text-sm font-medium">Error</p>
                            <p className="text-xs">{generalError}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Down Payment */}
                        <div className="space-y-2">
                            <Label htmlFor="downPayment">Adelanto ($)</Label>
                            <Controller
                                name="downPayment"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="downPayment"
                                        type="number"
                                        placeholder="0.00"
                                        min={0}
                                        max={motorcyclePrice}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                        value={field.value || ''}
                                        disabled={actionIsLoading || parentIsLoading}
                                    />
                                )}
                            />
                            {errors.downPayment && <InputErrorMessage message={errors.downPayment.message} />}
                        </div>

                        {/* Annual Interest Rate */}
                        <div className="space-y-2">
                            <Label htmlFor="annualInterestRate">Tasa de Interés Anual (%)</Label>
                            <Controller
                                name="annualInterestRate"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="annualInterestRate"
                                        type="number"
                                        placeholder="Ej: 25"
                                        min={0}
                                        step="0.01"
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                        value={field.value || ''}
                                        disabled={actionIsLoading || parentIsLoading}
                                    />
                                )}
                            />
                            {errors.annualInterestRate && <InputErrorMessage message={errors.annualInterestRate.message} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Number of Installments */}
                        <div className="space-y-2">
                            <Label htmlFor="numberOfInstallments">Cantidad de Cuotas</Label>
                            <Controller
                                name="numberOfInstallments"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="numberOfInstallments"
                                        type="number"
                                        placeholder="Ej: 12"
                                        min={1}
                                        step={1}
                                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)}
                                        value={field.value || ''}
                                        disabled={actionIsLoading || parentIsLoading}
                                    />
                                )}
                            />
                            {errors.numberOfInstallments && <InputErrorMessage message={errors.numberOfInstallments.message} />}
                        </div>

                        {/* Payment Frequency */}
                        <div className="space-y-2">
                            <Label htmlFor="paymentFrequency">Frecuencia de Pago</Label>
                            <Controller
                                name="paymentFrequency"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={actionIsLoading || parentIsLoading}
                                    >
                                        <SelectTrigger id="paymentFrequency">
                                            <SelectValue placeholder="Seleccionar frecuencia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentFrequencySchema.options.map((freq) => (
                                                <SelectItem key={freq} value={freq}>
                                                    {freq.charAt(0).toUpperCase() + freq.slice(1).toLowerCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.paymentFrequency && <InputErrorMessage message={errors.paymentFrequency.message} />}
                        </div>
                    </div>

                    {/* Start Date */}
                    <div className="space-y-2">
                        <Label htmlFor="startDate">Fecha de Inicio de Pago</Label>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    id="startDate"
                                    type="date"
                                    disabled={actionIsLoading || parentIsLoading}
                                />
                            )}
                        />
                        {errors.startDate && <InputErrorMessage message={errors.startDate.message} />}
                    </div>

                    {/* Calculated Values Display */}
                    <Card className="bg-muted/50">
                        <CardHeader className="pb-2 pt-4">
                            <CardTitle className="text-lg">Resumen de Financiación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Monto a Financiar:</span> <strong>${financedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between"><span>Monto de Cuota:</span> <strong>${calculatedInstallmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between"><span>Total a Pagar (Financiado):</span> <strong>${totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between"><span>Total Intereses Pagados:</span> <strong>${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                        </CardContent>
                    </Card>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Reminder Lead Time */}
                        <div className="space-y-2">
                            <Label htmlFor="reminderLeadTimeDays">Días de Aviso Previo al Vencimiento (Opcional)</Label>
                            <Controller
                                name="reminderLeadTimeDays"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="reminderLeadTimeDays"
                                        type="number"
                                        placeholder="Ej: 3"
                                        min={0}
                                        step={1}
                                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                        value={field.value === undefined || field.value === null ? '' : field.value}
                                        disabled={actionIsLoading || parentIsLoading}
                                    />
                                )}
                            />
                            {errors.reminderLeadTimeDays && <InputErrorMessage message={errors.reminderLeadTimeDays.message} />}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas Adicionales (Opcional)</Label>
                        <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    id="notes"
                                    placeholder="Observaciones sobre la financiación..."
                                    rows={3}
                                    value={field.value || ''}
                                    disabled={actionIsLoading || parentIsLoading}
                                />
                            )}
                        />
                        {errors.notes && <InputErrorMessage message={errors.notes.message} />}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={actionIsLoading || parentIsLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitDisabled}>
                        {actionIsLoading ? "Procesando..." : "Crear Cuenta Corriente"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
} 
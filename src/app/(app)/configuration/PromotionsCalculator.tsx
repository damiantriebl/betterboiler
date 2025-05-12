"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign, Percent } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type BankingPromotionDisplay, type PromotionCalculation } from "@/types/banking-promotions";
import { calculatePromotionAmount } from "@/actions/banking-promotions/get-banking-promotions";
import { Spinner } from "@/components/custom/Spinner";
import { formatCurrency } from "@/lib/utils";

interface PromotionsCalculatorProps {
    promotions: BankingPromotionDisplay[];
}

export default function PromotionsCalculator({ promotions }: PromotionsCalculatorProps) {
    const [amount, setAmount] = useState<number>(1000); // Default amount for calculation
    const [selectedPromotionId, setSelectedPromotionId] = useState<string>("");
    const [selectedInstallments, setSelectedInstallments] = useState<string>("");
    const [isPending, setIsPending] = useState(false);
    const [calculation, setCalculation] = useState<PromotionCalculation | null>(null);

    // Get the selected promotion
    const selectedPromotion = promotions.find(
        p => p.id === Number(selectedPromotionId)
    );

    // Get available installments from the selected promotion
    const availableInstallments = selectedPromotion?.installmentPlans
        .filter(p => p.isEnabled)
        .sort((a, b) => a.installments - b.installments) || [];

    // Handle amount change
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
            setAmount(value);
        }
    };

    // Handle promotion change
    const handlePromotionChange = (value: string) => {
        setSelectedPromotionId(value);
        setSelectedInstallments("");
        setCalculation(null);
    };

    // Handle installments change
    const handleInstallmentsChange = (value: string) => {
        setSelectedInstallments(value);
    };

    // Handle calculate
    const handleCalculate = async () => {
        if (!selectedPromotionId) return;

        setIsPending(true);

        try {
            const result = await calculatePromotionAmount({
                amount,
                promotionId: Number(selectedPromotionId),
                installments: selectedInstallments ? Number(selectedInstallments) : undefined
            });

            setCalculation(result);
        } catch (error) {
            console.error("Error calculating promotion:", error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Calculator className="w-5 h-5" /> Calculadora de Promociones
                </CardTitle>
                <CardDescription>
                    Calcule el monto final de una compra con promociones bancarias aplicadas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto a calcular</Label>
                        <div className="relative">
                            <DollarSign className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input
                                id="amount"
                                type="number"
                                min={1}
                                value={amount}
                                onChange={handleAmountChange}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Promotion selection */}
                    <div className="space-y-2">
                        <Label htmlFor="promotion">Promoción</Label>
                        <Select value={selectedPromotionId} onValueChange={handlePromotionChange}>
                            <SelectTrigger id="promotion">
                                <SelectValue placeholder="Seleccione una promoción" />
                            </SelectTrigger>
                            <SelectContent>
                                {promotions.filter(p => p.isEnabled).map(promotion => (
                                    <SelectItem key={promotion.id} value={promotion.id.toString()}>
                                        {promotion.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Installments selection */}
                    <div className="space-y-2">
                        <Label htmlFor="installments">Cuotas</Label>
                        <Select
                            value={selectedInstallments}
                            onValueChange={handleInstallmentsChange}
                            disabled={!selectedPromotion || availableInstallments.length === 0}
                        >
                            <SelectTrigger id="installments">
                                <SelectValue placeholder={availableInstallments.length
                                    ? "Seleccione cuotas"
                                    : "No hay cuotas disponibles"}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {availableInstallments.map(plan => (
                                    <SelectItem key={plan.id} value={plan.installments.toString()}>
                                        {plan.installments} cuotas {plan.interestRate === 0
                                            ? "sin interés"
                                            : `(${plan.interestRate}% interés)`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Calculate button */}
                <div className="mt-4">
                    <Button
                        onClick={handleCalculate}
                        disabled={!selectedPromotionId || isPending}
                    >
                        {isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Calculator className="mr-2 h-4 w-4" />}
                        Calcular
                    </Button>
                </div>

                {/* Results */}
                {calculation && (
                    <div className="mt-6 border rounded-md p-4">
                        <h3 className="font-medium text-lg mb-2">Resultados de la promoción</h3>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Concepto</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Monto original</TableCell>
                                    <TableCell className="text-right">{formatCurrency(calculation.originalAmount)}</TableCell>
                                </TableRow>

                                {calculation.discountAmount && (
                                    <TableRow>
                                        <TableCell className="text-green-600">Descuento aplicado</TableCell>
                                        <TableCell className="text-right text-green-600">
                                            - {formatCurrency(calculation.discountAmount)}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {calculation.surchargeAmount && (
                                    <TableRow>
                                        <TableCell className="text-red-600">Recargo aplicado</TableCell>
                                        <TableCell className="text-right text-red-600">
                                            + {formatCurrency(calculation.surchargeAmount)}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {calculation.totalInterest && (
                                    <TableRow>
                                        <TableCell className="text-amber-600">Interés total por cuotas</TableCell>
                                        <TableCell className="text-right text-amber-600">
                                            + {formatCurrency(calculation.totalInterest)}
                                        </TableCell>
                                    </TableRow>
                                )}

                                <TableRow className="font-medium">
                                    <TableCell>Monto final</TableCell>
                                    <TableCell className="text-right">{formatCurrency(calculation.finalAmount)}</TableCell>
                                </TableRow>

                                {calculation.installments && calculation.installmentAmount && (
                                    <TableRow>
                                        <TableCell>Valor de cada cuota ({calculation.installments}x)</TableCell>
                                        <TableCell className="text-right">
                                            {calculation.installments}x {formatCurrency(calculation.installmentAmount)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Percent difference */}
                        <div className="mt-4 text-sm flex items-center">
                            <Percent className="w-4 h-4 mr-1" />
                            {calculation.finalAmount < calculation.originalAmount ? (
                                <span className="text-green-600">
                                    Ahorra {(100 - (calculation.finalAmount / calculation.originalAmount * 100)).toFixed(2)}%
                                </span>
                            ) : calculation.finalAmount > calculation.originalAmount ? (
                                <span className="text-amber-600">
                                    Incremento del {((calculation.finalAmount / calculation.originalAmount * 100) - 100).toFixed(2)}%
                                </span>
                            ) : (
                                <span>Sin cambios en el precio final</span>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 
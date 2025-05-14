"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { MotorcycleWithRelations, PaymentFormData } from "./types";
// import { formatPrice } from "./utils"; // Ya no se usa directamente, se usa formatRoundedCurrency

interface CurrentAccountPaymentFieldsProps {
  paymentData: PaymentFormData;
  moto: MotorcycleWithRelations | null;
  onPaymentDataChange: (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onDateChange: (name: string, date: Date | undefined) => void;
}

function getPeriodsPerYearCA(frequency: string | undefined): number {
  const freq = frequency || "MONTHLY";
  const FreqMap = { WEEKLY: 52, BIWEEKLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUALLY: 1 };
  return FreqMap[freq as keyof typeof FreqMap] || 12;
}

// Definimos la estructura para el plan de amortización, igual que en CurrentAccountsTable
interface AmortizationScheduleEntry {
  installmentNumber: number;
  capitalAtPeriodStart: number;
  interestForPeriod: number;
  amortization: number;
  calculatedInstallmentAmount: number;
  capitalAtPeriodEnd: number;
}

export default function CurrentAccountPaymentFields({
  paymentData,
  moto,
  onPaymentDataChange,
  onDateChange,
}: CurrentAccountPaymentFieldsProps) {
  const calculateInstallmentDetails = () => {
    if (!moto)
      return {
        error: "Datos de la moto no disponibles.",
        schedule: [] as AmortizationScheduleEntry[],
      };

    const principal = (moto.retailPrice || 0) - (paymentData.downPayment || 0);
    const installments = paymentData.currentAccountInstallments || 1;
    const annualRatePercent = paymentData.annualInterestRate || 0;
    const paymentFrequency = paymentData.currentAccountFrequency || "MONTHLY";

    const schedule: AmortizationScheduleEntry[] = [];
    let installmentAmount = 0;
    let totalPayment = 0;
    let totalInterest = 0;

    if (principal <= 0 || installments <= 0) {
      installmentAmount = principal <= 0 ? 0 : Math.ceil(principal / installments);
      totalPayment = installmentAmount * installments;
      // Generar schedule simple para este caso
      let cap = principal > 0 ? principal : 0;
      for (let i = 1; i <= installments; i++) {
        const amort = i === installments ? cap : installmentAmount;
        schedule.push({
          installmentNumber: i,
          capitalAtPeriodStart: cap,
          interestForPeriod: 0,
          amortization: amort,
          calculatedInstallmentAmount: amort,
          capitalAtPeriodEnd: Math.max(0, cap - amort),
        });
        cap -= amort;
      }
      return {
        installmentAmount,
        totalPayment,
        totalInterest: 0,
        currency: moto.currency || "USD",
        schedule,
      };
    }

    const periodsPerYear = getPeriodsPerYearCA(paymentFrequency);

    if (annualRatePercent === 0) {
      installmentAmount = Math.ceil(principal / installments);
      totalPayment = installmentAmount * installments;
      let cap = principal;
      for (let i = 1; i <= installments; i++) {
        let amort = i === installments && cap < installmentAmount ? cap : installmentAmount;
        if (cap <= 0 && i > 1) {
          amort = 0;
        }
        schedule.push({
          installmentNumber: i,
          capitalAtPeriodStart: cap > 0 ? cap : 0,
          interestForPeriod: 0,
          amortization: cap > 0 ? amort : 0,
          calculatedInstallmentAmount: cap > 0 ? amort : 0,
          capitalAtPeriodEnd: Math.max(0, cap - amort),
        });
        if (cap > 0) cap -= amort;
        else cap = 0;
      }
      return {
        installmentAmount,
        totalPayment,
        totalInterest: 0,
        currency: moto.currency || "USD",
        schedule,
      };
    }

    const ratePerPeriod = annualRatePercent / 100 / periodsPerYear;

    if (ratePerPeriod <= -1) {
      installmentAmount = Math.ceil(principal / installments);
      // Schedule simple también aquí
      return {
        installmentAmount,
        totalPayment: installmentAmount * installments,
        totalInterest: 0,
        currency: moto.currency || "USD",
        warning: "Tasa de interés inválida para cálculo francés, se usó cálculo simple.",
        schedule, // Vacío o simple como el caso sin interés
      };
    }

    const pmtNumerator = ratePerPeriod * Math.pow(1 + ratePerPeriod, installments);
    const pmtDenominator = Math.pow(1 + ratePerPeriod, installments) - 1;

    if (pmtDenominator === 0 || (pmtNumerator === 0 && pmtDenominator === 0)) {
      installmentAmount = Math.ceil(principal / installments);
      // Schedule simple también aquí
      return {
        installmentAmount,
        totalPayment: installmentAmount * installments,
        totalInterest: 0,
        currency: moto.currency || "USD",
        warning:
          "No se pudo calcular la cuota con interés (división por cero), se usó cálculo simple.",
        schedule, // Vacío o simple como el caso sin interés
      };
    }

    const rawPmt = principal * (pmtNumerator / pmtDenominator);
    const fixedInstallment = Math.ceil(rawPmt);
    let currentCapital = principal;

    for (let i = 1; i <= installments; i++) {
      const interest = Math.ceil(currentCapital * ratePerPeriod);
      let amortizationAmt = fixedInstallment - interest;
      let currentInstallmentAmount = fixedInstallment;

      if (i === installments) {
        amortizationAmt = currentCapital; // Amortizar todo lo que queda
        currentInstallmentAmount = Math.ceil(currentCapital + interest); // La última cuota es el capital restante + interés
      } else if (amortizationAmt > currentCapital) {
        // Por redondeos
        amortizationAmt = currentCapital;
        currentInstallmentAmount = Math.ceil(currentCapital + interest);
      }

      const capitalEnd = Math.max(0, currentCapital - amortizationAmt);
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: Math.ceil(currentCapital),
        interestForPeriod: interest,
        amortization: Math.ceil(amortizationAmt),
        calculatedInstallmentAmount: currentInstallmentAmount,
        capitalAtPeriodEnd: Math.ceil(capitalEnd) > 0 ? Math.ceil(capitalEnd) : 0, // Evitar -0
      });
      currentCapital = capitalEnd;
      if (currentCapital < 0.01) currentCapital = 0; // Considerar saldado si es muy pequeño

      totalPayment += currentInstallmentAmount;
    }
    // Recalcular installmentAmount como el de la primera cuota del schedule para el resumen.
    installmentAmount = schedule.length > 0 ? schedule[0].calculatedInstallmentAmount : 0;
    // Total interest es la suma de los intereses del schedule, o totalPayment - principal
    totalInterest = schedule.reduce((sum, item) => sum + item.interestForPeriod, 0);
    // totalPayment es la suma de las cuotas del schedule
    totalPayment = schedule.reduce((sum, item) => sum + item.calculatedInstallmentAmount, 0);

    return {
      installmentAmount: installmentAmount, // O podrías usar fixedInstallment si prefieres mostrar la cuota teórica
      totalPayment: Math.ceil(totalPayment),
      totalInterest: Math.ceil(totalInterest),
      currency: moto.currency || "USD",
      schedule,
    };
  };

  const formatRoundedCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.ceil(amount));
  };

  const renderCalculatedAmounts = () => {
    const details = calculateInstallmentDetails();

    if (details.error) {
      return <p className="text-red-500 text-sm">{details.error}</p>;
    }

    return (
      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-medium">Monto por Cuota (aprox.):</span>{" "}
          {formatRoundedCurrency(details.installmentAmount || 0, details.currency || "USD")}
        </p>
        <p className="text-sm">
          <span className="font-medium">Total a Pagar Estimado:</span>{" "}
          {formatRoundedCurrency(details.totalPayment || 0, details.currency || "USD")}
        </p>
        <p className="text-sm">
          <span className="font-medium">Interés Total Estimado:</span>{" "}
          {formatRoundedCurrency(details.totalInterest || 0, details.currency || "USD")}
        </p>
        {details.warning && <p className="text-xs text-amber-600 mt-1">{details.warning}</p>}

        {/* Tabla de Amortización Detallada */}
        {details.schedule && details.schedule.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <h4 className="text-xs font-semibold mb-2 text-gray-600">PLAN DE PAGOS DETALLADO:</h4>
            <table className="min-w-full text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 tracking-wider">
                    N° Cuota
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 tracking-wider">
                    Capital Inicio
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 tracking-wider">
                    Amortización
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 tracking-wider">
                    Intereses
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 tracking-wider">
                    Cuota
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {details.schedule.map((item) => (
                  <tr key={item.installmentNumber}>
                    <td className="px-3 py-2 whitespace-nowrap">{item.installmentNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatRoundedCurrency(item.capitalAtPeriodStart, details.currency || "USD")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatRoundedCurrency(item.amortization, details.currency || "USD")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatRoundedCurrency(item.interestForPeriod, details.currency || "USD")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold">
                      {formatRoundedCurrency(
                        item.calculatedInstallmentAmount,
                        details.currency || "USD",
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 border rounded-md mt-4">
      <h3 className="text-sm font-medium">Detalles de Cuenta Corriente</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="downPayment">Pago inicial / Adelanto</Label>
          <Input
            id="downPayment"
            name="downPayment"
            type="number"
            value={paymentData.downPayment ?? ""}
            onChange={onPaymentDataChange}
            placeholder="0"
            min="0"
          />
        </div>
        <div>
          <Label htmlFor="currentAccountInstallments">Cantidad de Cuotas</Label>
          <Input
            id="currentAccountInstallments"
            name="currentAccountInstallments"
            type="number"
            value={paymentData.currentAccountInstallments ?? ""}
            onChange={onPaymentDataChange}
            placeholder="12"
            min="1"
            step="1"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currentAccountFrequency">Frecuencia de Pago</Label>
          <Select
            name="currentAccountFrequency"
            value={paymentData.currentAccountFrequency ?? "MONTHLY"}
            onValueChange={(value) => {
              onPaymentDataChange({
                target: { name: "currentAccountFrequency", value },
              } as React.ChangeEvent<HTMLSelectElement>);
            }}
          >
            <SelectTrigger id="currentAccountFrequency">
              <SelectValue placeholder="Seleccionar frecuencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Semanal</SelectItem>
              <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
              <SelectItem value="MONTHLY">Mensual</SelectItem>
              <SelectItem value="QUARTERLY">Trimestral</SelectItem>
              <SelectItem value="ANNUALLY">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="annualInterestRate">Tasa de Interés Anual (%)</Label>
          <Input
            id="annualInterestRate"
            name="annualInterestRate"
            type="number"
            value={paymentData.annualInterestRate ?? ""}
            onChange={onPaymentDataChange}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="currentAccountStartDate">Fecha de Inicio (Primer Vencimiento)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !paymentData.currentAccountStartDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {paymentData.currentAccountStartDate ? (
                format(new Date(paymentData.currentAccountStartDate), "P", { locale: es })
              ) : (
                <span>Seleccione una fecha</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={
                paymentData.currentAccountStartDate
                  ? new Date(paymentData.currentAccountStartDate)
                  : undefined
              }
              onSelect={(date) => onDateChange("currentAccountStartDate", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {paymentData.currentAccountInstallments &&
        paymentData.currentAccountInstallments > 0 &&
        paymentData.annualInterestRate !== undefined && (
          <div className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 mt-3">
            {renderCalculatedAmounts()}
          </div>
        )}
      <div>
        <Label htmlFor="currentAccountNotes">Notas Adicionales</Label>
        <Textarea
          id="currentAccountNotes"
          name="currentAccountNotes"
          value={paymentData.currentAccountNotes ?? ""}
          onChange={onPaymentDataChange}
          placeholder="Añadir notas sobre la cuenta corriente..."
          rows={3}
        />
      </div>
    </div>
  );
}

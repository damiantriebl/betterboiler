"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { usePriceDisplayStore } from "@/stores/price-display-store";
import type { ModelFileWithUrl, MotorcycleWithDetails } from "@/types/motorcycle";
import type {
  AmortizationScheduleEntry,
  InstallmentDetails,
  PaymentData,
  QuotePDFProps,
} from "@/types/quote";
import { MotorcycleState } from "@prisma/client";
import {
  BookmarkPlus,
  Calculator,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Info,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientDetail } from "./ClientDetail";
import QuoteBridgePdf from "./components/QuoteBrigePdf";
import { Switch } from "@/components/ui/switch";
import { useSessionStore } from "@/stores/SessionStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  motorcycle: MotorcycleWithDetails | null;
  onToggleStatus: (id: number, status: MotorcycleState) => void;
  onSetEliminado: (id: number) => void;
  onAction: (action: "vender" | "reservar" | "eliminarLogico", moto: MotorcycleWithDetails) => void;
  onCancelProcess: (id: number) => void;
  onNavigateToSale: (id: string) => void;
  onEdit: (id: number) => void;
  estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }>;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <span className="text-sm font-medium text-muted-foreground">{label}:</span>
    <span className="text-sm">{value ?? "N/A"}</span>
  </div>
);

function PaymentQuoteSimulator({
  motorcycle,
  onClose,
  onExportPDF,
  organizationLogoUrl,
  organizationName,
}: {
  motorcycle: MotorcycleWithDetails | null;
  onClose: () => void;
  onExportPDF?: (pdfProps: {
    motorcycle: MotorcycleWithDetails | null;
    paymentData: PaymentData;
    activeTab: string;
    basePrice: number;
    modifierAmount: number;
    finalPrice: number;
    financedAmount: number;
    installmentDetails: InstallmentDetails;
    totalWithFinancing: number;
    formatAmount: (amount: number) => string;
    organizationLogoUrl?: string | null;
    organizationName?: string | null;
  }) => void;
  organizationLogoUrl?: string | null;
  organizationName?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"efectivo" | "tarjeta" | "cuenta_corriente">(
    "efectivo",
  );
  const [paymentData, setPaymentData] = useState<PaymentData>({
    metodoPago: "efectivo",
    cuotas: 1,
    isMayorista: false,
    discountType: "discount",
    discountValue: 0,
    downPayment: 0,
    currentAccountInstallments: 12,
    currentAccountFrequency: "MONTHLY",
    annualInterestRate: 30,
  });

  const getPeriodsPerYear = useCallback((frequency: string) => {
    const map: Record<string, number> = {
      WEEKLY: 52,
      BIWEEKLY: 26,
      MONTHLY: 12,
      QUARTERLY: 4,
      ANNUALLY: 1,
    };
    return map[frequency] || 12;
  }, []);

  const basePrice =
    paymentData.isMayorista && motorcycle?.wholesalePrice
      ? motorcycle.wholesalePrice
      : motorcycle?.retailPrice || 0;

  const modifierAmount =
    paymentData.discountValue > 0 ? (basePrice * paymentData.discountValue) / 100 : 0;

  const finalPrice =
    paymentData.discountType === "discount"
      ? basePrice - modifierAmount
      : basePrice + modifierAmount;

  const financedAmount = finalPrice - paymentData.downPayment;

  const calculateInstallmentDetails = useCallback((): InstallmentDetails => {
    if (!motorcycle) {
      return {
        installmentAmount: 0,
        totalPayment: 0,
        totalInterest: 0,
        currency: "ARS",
        schedule: [],
        warning: undefined,
      };
    }

    const principal = financedAmount;
    const installments = paymentData.currentAccountInstallments;
    const annualRatePercent = paymentData.annualInterestRate;
    const paymentFrequency = paymentData.currentAccountFrequency;

    const schedule: AmortizationScheduleEntry[] = [];
    let installmentAmount = 0;
    let totalPayment = 0;
    let totalInterest = 0;

    if (principal <= 0 || installments <= 0) {
      installmentAmount = 0;
      totalPayment = 0;
      if (installments > 0 && principal > 0) {
        installmentAmount = Math.ceil(principal / installments);
        totalPayment = installmentAmount * installments;
      }
      let cap = principal > 0 ? principal : 0;
      const singleAmort =
        principal > 0 && installments > 0 ? Math.ceil(principal / installments) : 0;

      for (let i = 1; i <= installments; i++) {
        let amortCalc = singleAmort;
        if (i === installments) {
          amortCalc = cap;
        }
        if (cap < amortCalc) amortCalc = cap;

        schedule.push({
          installmentNumber: i,
          capitalAtPeriodStart: cap,
          interestForPeriod: 0,
          amortization: amortCalc,
          calculatedInstallmentAmount: amortCalc,
          capitalAtPeriodEnd: Math.max(0, cap - amortCalc),
        });
        cap = Math.max(0, cap - amortCalc);
      }
      if (principal <= 0) installmentAmount = 0;
      else if (installments > 0)
        installmentAmount = schedule.length > 0 ? schedule[0].calculatedInstallmentAmount : 0;
      else installmentAmount = 0;

      totalPayment = schedule.reduce((sum, item) => sum + item.calculatedInstallmentAmount, 0);

      return {
        installmentAmount,
        totalPayment: Math.ceil(totalPayment),
        totalInterest: 0,
        currency: motorcycle.currency || "ARS",
        schedule,
        warning: principal <= 0 ? "El monto a financiar es cero." : undefined,
      };
    }

    const periodsPerYearVal = getPeriodsPerYear(paymentFrequency);

    if (annualRatePercent === 0) {
      installmentAmount = Math.ceil(principal / installments);
      totalPayment = installmentAmount * installments;
      let cap = principal;
      for (let i = 1; i <= installments; i++) {
        let amort = i === installments && cap < installmentAmount ? cap : installmentAmount;
        if (cap <= 0 && i > 1) amort = 0;
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
        totalPayment: Math.ceil(totalPayment),
        totalInterest: 0,
        currency: motorcycle.currency || "ARS",
        schedule,
        warning: undefined,
      };
    }

    const ratePerPeriod = annualRatePercent / 100 / periodsPerYearVal;

    if (ratePerPeriod <= -1) {
      installmentAmount = Math.ceil(principal / installments);
      return {
        installmentAmount,
        totalPayment: Math.ceil(installmentAmount * installments),
        totalInterest: 0,
        currency: motorcycle.currency || "ARS",
        warning: "Tasa de interés inválida para cálculo francés, se usó cálculo simple.",
        schedule,
      };
    }

    const pmtNumerator = ratePerPeriod * (1 + ratePerPeriod) ** installments;
    const pmtDenominator = (1 + ratePerPeriod) ** installments - 1;

    if (
      pmtDenominator === 0 ||
      (pmtNumerator === 0 && pmtDenominator === 0 && ratePerPeriod !== 0)
    ) {
      installmentAmount = Math.ceil(principal / installments);
      return {
        installmentAmount,
        totalPayment: Math.ceil(installmentAmount * installments),
        totalInterest: 0,
        currency: motorcycle.currency || "ARS",
        warning:
          "No se pudo calcular la cuota con interés (división por cero o tasa inválida), se usó cálculo simple.",
        schedule,
      };
    }

    const rawPmt =
      ratePerPeriod === 0 ? principal / installments : principal * (pmtNumerator / pmtDenominator);
    const fixedInstallment = Math.ceil(rawPmt);
    let currentCapital = principal;
    totalPayment = 0;

    for (let i = 1; i <= installments; i++) {
      const interest = Math.ceil(currentCapital * ratePerPeriod);
      let amortizationAmt = fixedInstallment - interest;
      let currentInstallmentAmount = fixedInstallment;

      if (amortizationAmt < 0 && fixedInstallment > 0) {
        amortizationAmt = 0;
        currentInstallmentAmount = interest;
      }

      if (i === installments) {
        amortizationAmt = currentCapital;
        currentInstallmentAmount = Math.ceil(currentCapital + interest);
      } else if (amortizationAmt > currentCapital && currentCapital > 0) {
        amortizationAmt = currentCapital;
        currentInstallmentAmount = Math.ceil(currentCapital + interest);
      } else if (currentCapital <= 0) {
        amortizationAmt = 0;
        currentInstallmentAmount = 0;
      }

      const capitalEnd = Math.max(0, currentCapital - amortizationAmt);
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: Math.ceil(currentCapital),
        interestForPeriod: interest,
        amortization: Math.ceil(amortizationAmt),
        calculatedInstallmentAmount: currentInstallmentAmount,
        capitalAtPeriodEnd: Math.ceil(capitalEnd) > 0 ? Math.ceil(capitalEnd) : 0,
      });
      currentCapital = capitalEnd;
      if (currentCapital < 0.01) currentCapital = 0;
      totalPayment += currentInstallmentAmount;
    }
    installmentAmount = schedule.length > 0 ? schedule[0].calculatedInstallmentAmount : 0;
    totalInterest = schedule.reduce((sum, item) => sum + item.interestForPeriod, 0);

    return {
      installmentAmount,
      totalPayment: Math.ceil(totalPayment),
      totalInterest: Math.ceil(totalInterest),
      currency: motorcycle.currency || "ARS",
      schedule,
      warning: undefined,
    };
  }, [motorcycle, paymentData, getPeriodsPerYear, financedAmount]);

  const formatAmount = useCallback(
    (amount: number) => {
      return formatPrice(amount, motorcycle?.currency || "ARS");
    },
    [motorcycle?.currency],
  );

  const installmentDetailsCalculation = useMemo((): InstallmentDetails => {
    if (paymentData.metodoPago === "cuenta_corriente") {
      return calculateInstallmentDetails();
    }
    // For cash or card, create a simple structure
    return {
      installmentAmount:
        finalPrice > 0 && paymentData.cuotas > 0 ? Math.ceil(finalPrice / paymentData.cuotas) : 0,
      schedule: [], // No detailed schedule for cash/card
      totalPayment: finalPrice,
      totalInterest: 0,
      currency: motorcycle?.currency || "ARS",
      warning: undefined,
    };
  }, [
    paymentData.metodoPago,
    paymentData.cuotas,
    finalPrice,
    calculateInstallmentDetails,
    motorcycle?.currency,
  ]);

  useEffect(() => {
    if (onExportPDF && motorcycle) {
      onExportPDF({
        motorcycle,
        paymentData,
        activeTab,
        basePrice,
        modifierAmount,
        finalPrice,
        financedAmount,
        installmentDetails: installmentDetailsCalculation,
        totalWithFinancing: installmentDetailsCalculation.totalPayment || 0,
        formatAmount,
        organizationLogoUrl,
        organizationName: organizationName || undefined,
      });
    }
  }, [
    paymentData,
    activeTab,
    basePrice,
    modifierAmount,
    finalPrice,
    financedAmount,
    installmentDetailsCalculation,
    formatAmount,
    onExportPDF,
    motorcycle,
    organizationLogoUrl,
    organizationName,
  ]);

  const handleTabChange = (tab: "efectivo" | "tarjeta" | "cuenta_corriente") => {
    setActiveTab(tab);
    setPaymentData({
      ...paymentData,
      metodoPago: tab,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (
      [
        "cuotas",
        "discountValue",
        "downPayment",
        "currentAccountInstallments",
        "annualInterestRate",
      ].includes(name)
    ) {
      parsedValue = Number.parseFloat(value) || 0;
    }
    setPaymentData({
      ...paymentData,
      [name]: parsedValue,
    });
  };

  const renderAmortizationTable = () => {
    const details = installmentDetailsCalculation;
    if (!details.schedule || details.schedule.length === 0) {
      return null;
    }
    return (
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
                  {formatAmount(item.capitalAtPeriodStart)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  {formatAmount(item.amortization)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  {formatAmount(item.interestForPeriod)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-semibold">
                  {formatAmount(item.calculatedInstallmentAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {details.warning && <p className="text-xs text-amber-600 mt-1">{details.warning}</p>}
      </div>
    );
  };

  return (
    <div className="py-4 space-y-6">
      <div className="flex space-x-2 border-b pb-2">
        <Button
          variant={activeTab === "efectivo" ? "default" : "outline"}
          onClick={() => handleTabChange("efectivo")}
        >
          Efectivo/Transferencia
        </Button>
        <Button
          variant={activeTab === "tarjeta" ? "default" : "outline"}
          onClick={() => handleTabChange("tarjeta")}
        >
          Tarjeta
        </Button>
        <Button
          variant={activeTab === "cuenta_corriente" ? "default" : "outline"}
          onClick={() => handleTabChange("cuenta_corriente")}
        >
          Financiación
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-3">Opciones de Precio</h3>
            <div className="mb-3 flex items-center space-x-2">
              <Checkbox
                id="isMayorista"
                checked={paymentData.isMayorista}
                onCheckedChange={(checked) =>
                  setPaymentData({ ...paymentData, isMayorista: !!checked })
                }
              />
              <Label htmlFor="isMayorista">Usar precio mayorista</Label>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="discountType">Tipo de ajuste</Label>
                <div className="flex items-center space-x-2">
                  <Label
                    htmlFor="discountType"
                    className={`text-xs px-2 py-1 rounded ${paymentData.discountType === "discount" ? "bg-green-100 text-green-800" : "bg-gray-100"} cursor-pointer`}
                  >
                    Descuento
                  </Label>
                  <Switch
                    id="discountType"
                    checked={paymentData.discountType === "discount"}
                    onCheckedChange={(checked) =>
                      handleInputChange({
                        target: {
                          name: "discountType",
                          value: checked ? "discount" : "surcharge",
                        },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  />
                  <Label
                    htmlFor="discountType"
                    className={`text-xs px-2 py-1 rounded ${paymentData.discountType === "surcharge" ? "bg-amber-100 text-amber-800" : "bg-gray-100"} cursor-pointer`}
                  >
                    Recargo
                  </Label>
                </div>
              </div>
              <Input
                id="discountValue"
                name="discountValue"
                type="number"
                min="0"
                max="100"
                value={paymentData.discountValue}
                onChange={handleInputChange}
                placeholder="Porcentaje"
                className={
                  paymentData.discountType === "discount"
                    ? "border-green-200 focus:border-green-500"
                    : "border-amber-200 focus:border-amber-500"
                }
              />
              <p className="text-xs text-muted-foreground">
                {paymentData.discountType === "discount" ? "Descuento" : "Recargo"} del
                {paymentData.discountValue}%
              </p>
            </div>
          </div>

          {activeTab === "tarjeta" && (
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3">Opciones de Tarjeta</h3>
              <div className="mb-3">
                <Label htmlFor="cuotas">Número de cuotas</Label>
                <Select
                  value={paymentData.cuotas.toString()}
                  onValueChange={(value) =>
                    handleInputChange({
                      target: { name: "cuotas", value },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                >
                  <SelectTrigger id="cuotas">
                    <SelectValue placeholder="Seleccione cuotas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 cuota</SelectItem>
                    <SelectItem value="3">3 cuotas</SelectItem>
                    <SelectItem value="6">6 cuotas</SelectItem>
                    <SelectItem value="12">12 cuotas</SelectItem>
                    <SelectItem value="18">18 cuotas</SelectItem>
                    <SelectItem value="24">24 cuotas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === "cuenta_corriente" && (
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3">Opciones de Financiación</h3>
              <div className="mb-3">
                <Label htmlFor="downPayment">Pago inicial</Label>
                <Input
                  id="downPayment"
                  name="downPayment"
                  type="number"
                  min="0"
                  value={paymentData.downPayment}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <Label htmlFor="currentAccountInstallments">Número de cuotas</Label>
                <Input
                  id="currentAccountInstallments"
                  name="currentAccountInstallments"
                  type="number"
                  min="1"
                  max="60"
                  value={paymentData.currentAccountInstallments}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <Label htmlFor="currentAccountFrequency">Frecuencia de pago</Label>
                <Select
                  value={paymentData.currentAccountFrequency.toString()}
                  onValueChange={(value) =>
                    handleInputChange({
                      target: {
                        name: "currentAccountFrequency",
                        value,
                      },
                    } as React.ChangeEvent<HTMLSelectElement>)
                  }
                >
                  <SelectTrigger id="currentAccountFrequency">
                    <SelectValue placeholder="Seleccione frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensual</SelectItem>
                    <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                    <SelectItem value="ANNUALLY">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-3">
                <Label htmlFor="annualInterestRate">Tasa de interés anual (%)</Label>
                <Input
                  id="annualInterestRate"
                  name="annualInterestRate"
                  type="number"
                  min="0"
                  max="200"
                  value={paymentData.annualInterestRate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-6 border rounded-md bg-secondary/20">
            <h3 className="text-xl font-semibold mb-4">Resumen de Presupuesto</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Vehículo:</span>
                <span>
                  {motorcycle?.brand?.name} {motorcycle?.model?.name} ({motorcycle?.year})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Precio base:</span>
                <span>{formatAmount(basePrice)}</span>
              </div>
              {paymentData.discountValue > 0 && (
                <div
                  className={`flex justify-between ${paymentData.discountType === "discount" ? "text-green-600" : "text-amber-600"}`}
                >
                  <span className="font-medium">
                    {paymentData.discountType === "discount" ? "Descuento" : "Recargo"} (
                    {paymentData.discountValue}%):
                  </span>
                  <span>
                    {paymentData.discountType === "discount" ? "-" : "+"}
                    {formatAmount(modifierAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Precio final:</span>
                <span>{formatAmount(finalPrice)}</span>
              </div>
              {activeTab === "tarjeta" && paymentData.cuotas > 1 && (
                <div className="mt-4 pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Cuotas:</span>
                    <span>{paymentData.cuotas}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-blue-600">
                    <span>Valor de cuota:</span>
                    <span>{formatAmount(Math.ceil(finalPrice / paymentData.cuotas))}</span>
                  </div>
                </div>
              )}
              {activeTab === "cuenta_corriente" && (
                <div className="mt-4 pt-2 border-t space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Pago inicial:</span>
                    <span>{formatAmount(paymentData.downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Monto a financiar:</span>
                    <span>{formatAmount(financedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cuotas:</span>
                    <span>
                      {paymentData.currentAccountInstallments} (
                      {paymentData.currentAccountFrequency.toLowerCase() === "monthly"
                        ? "mensuales"
                        : paymentData.currentAccountFrequency.toLowerCase() === "biweekly"
                          ? "quincenales"
                          : paymentData.currentAccountFrequency.toLowerCase() === "weekly"
                            ? "semanales"
                            : paymentData.currentAccountFrequency.toLowerCase() === "quarterly"
                              ? "trimestrales"
                              : "anuales"}
                      )
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tasa anual:</span>
                    <span>{paymentData.annualInterestRate}%</span>
                  </div>
                  <div className="flex justify-between font-semibold text-blue-600">
                    <span>Valor de cuota:</span>
                    <span>
                      {formatAmount(installmentDetailsCalculation.installmentAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total a pagar:</span>
                    <span>{formatAmount(installmentDetailsCalculation.totalPayment || 0)}</span>
                  </div>
                  {activeTab === "cuenta_corriente" &&
                    "totalInterest" in installmentDetailsCalculation &&
                    installmentDetailsCalculation.totalInterest !== undefined &&
                    installmentDetailsCalculation.totalInterest > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span className="font-medium">Intereses totales:</span>
                        <span>
                          {formatAmount(installmentDetailsCalculation.totalInterest || 0)}
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
          {activeTab === "cuenta_corriente" && (
            <div className="border rounded-md p-3 bg-white max-h-[300px] overflow-y-auto">
              {renderAmortizationTable()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MotorcycleDetailModal({
  isOpen,
  onClose,
  motorcycle,
  onToggleStatus,
  onSetEliminado,
  onAction,
  onCancelProcess,
  onNavigateToSale,
  onEdit,
  estadoVentaConfig,
}: Props) {
  const { mode } = usePriceDisplayStore();
  const [modelImages, setModelImages] = useState<ModelFileWithUrl[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const shouldShowWholesale = usePriceDisplayStore((s) => s.showWholesale());
  const shouldShowCost = usePriceDisplayStore((s) => s.showCost());

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quotePdfProps, setQuotePdfProps] = useState<QuotePDFProps | null>(null);
  const { organizationLogo, organizationName, userName, userImage } = useSessionStore();
  const [shouldExportPdf, setShouldExportPdf] = useState(false);

  const { clientId, rawReservationData } = useMemo(() => {
    if (!motorcycle) return { clientId: null, rawReservationData: null };
    if (motorcycle.state === MotorcycleState.PROCESANDO) {
      return { clientId: motorcycle.clientId ?? null, rawReservationData: null };
    }
    if (motorcycle.state === MotorcycleState.RESERVADO) {
      const active =
        motorcycle.reservations?.find((r) => r.status === "active") ?? motorcycle.reservation;
      return { clientId: active?.clientId ?? null, rawReservationData: active ?? null };
    }
    return { clientId: null, rawReservationData: null };
  }, [motorcycle]);

  useEffect(() => {
    if (isOpen && motorcycle?.model?.files) {
      const imageFiles = motorcycle.model.files
        .filter((file) => file.type === "image" || file.type.startsWith("image/"))
        .map(
          (file) =>
            ({
              ...file,
              url: file.s3Key
                ? `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_BUCKET_REGION}.amazonaws.com/${file.s3Key}`
                : "",
            }) as ModelFileWithUrl,
        );
      setModelImages(imageFiles);
      setIsLoadingImages(false);
    } else {
      setModelImages([]);
      setCurrentImageIndex(0);
    }
  }, [isOpen, motorcycle?.model?.files]);

  if (!isOpen || !motorcycle) return null;

  const { id, state, currency } = motorcycle;
  const isStock = state === MotorcycleState.STOCK;
  const isPausado = state === MotorcycleState.PAUSADO;
  const isReservado = state === MotorcycleState.RESERVADO;
  const isProcesando = state === MotorcycleState.PROCESANDO;
  const isEliminado = state === MotorcycleState.ELIMINADO;
  const canSell = isStock;
  const canPause = isStock || isPausado;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : modelImages.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < modelImages.length - 1 ? prev + 1 : 0));
  };

  const renderActions = () => {
    if (isEliminado)
      return (
        <Button
          variant="outline"
          size="sm"
          className="text-green-600 border-green-600 hover:bg-green-100"
          onClick={() => onToggleStatus(id, state)}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
        </Button>
      );
    if (isProcesando)
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-600 hover:bg-blue-100"
            onClick={() => onNavigateToSale(id.toString())}
          >
            <Play className="mr-2 h-4 w-4" /> Continuar proceso
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-100"
            onClick={() => onCancelProcess(id)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Cancelar proceso
          </Button>
        </>
      );
    if (isReservado)
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-100"
            onClick={() => onCancelProcess(id)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Quitar Reserva
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-600 hover:bg-blue-100"
            onClick={() => onNavigateToSale(id.toString())}
          >
            <Play className="mr-2 h-4 w-4" /> Continuar Compra
          </Button>
        </>
      );
    return (
      <>
        {canSell && (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600 hover:bg-green-100"
            onClick={() => onAction("vender", motorcycle)}
          >
            <DollarSign className="mr-2 h-4 w-4" /> Vender
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-violet-600 border-violet-600 hover:bg-violet-100"
          onClick={() => setIsQuoteModalOpen(true)}
        >
          <Calculator className="mr-2 h-4 w-4" /> Presupuesto
        </Button>
        {!isReservado && (
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-600 hover:bg-blue-100"
            disabled={isPausado}
            onClick={() => onAction("reservar", motorcycle)}
          >
            <BookmarkPlus className="mr-2 h-4 w-4" /> Reservar
          </Button>
        )}
        {canPause && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              isPausado
                ? "text-green-600 border-green-600 hover:bg-green-100"
                : "text-yellow-600 border-yellow-600 hover:bg-yellow-100",
            )}
            onClick={() => onToggleStatus(id, state)}
          >
            {isPausado ? (
              <>
                <Play className="mr-2 h-4 w-4" /> Activar
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" /> Pausar
              </>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-600 hover:bg-red-100"
          onClick={() => onSetEliminado(id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
        </Button>
      </>
    );
  };

  const renderClientSection = () => {
    if (!clientId) return null;
    return (
      <div className="p-4 border rounded-md bg-blue-50">
        <h3 className="text-base font-semibold mb-2 border-b pb-1 flex items-center">
          <Info className="mr-2 h-4 w-4 text-blue-600" />
          {isReservado ? "Detalles de la Reserva" : "En Proceso Para"}
        </h3>
        <ClientDetail
          clientId={clientId}
          currency={rawReservationData?.currency || "USD"}
          reservationData={useMemo(
            () =>
              rawReservationData
                ? {
                  ...rawReservationData,
                  currency: rawReservationData.currency || "USD",
                }
                : undefined,
            [],
          )}
        />
      </div>
    );
  };

  const handleExportPDF = (pdfProps: {
    motorcycle: MotorcycleWithDetails | null;
    paymentData: PaymentData;
    activeTab: string;
    basePrice: number;
    modifierAmount: number;
    finalPrice: number;
    financedAmount: number;
    installmentDetails: InstallmentDetails;
    totalWithFinancing: number;
    formatAmount: (amount: number) => string;
    organizationLogoUrl?: string | null;
    organizationName?: string | null;
  }) => {
    setQuotePdfProps({
      ...pdfProps,
      organizationName: pdfProps.organizationName || undefined,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="pr-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">Detalles de la Moto</DialogTitle>
              {userImage?.startsWith("data:image") && (
                <div className="flex items-center gap-2">
                  <img
                    src={userImage}
                    alt={userName || "Usuario"}
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                  <span className="text-sm font-medium">{userName}</span>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                  ID: {id} - {motorcycle.brand?.name} {motorcycle.model?.name} ({motorcycle.year})
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <DetailItem
                    label="Estado"
                    value={
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal whitespace-nowrap text-xs px-1.5 py-0.5",
                          estadoVentaConfig[state].className,
                        )}
                      >
                        {estadoVentaConfig[state].label}
                      </Badge>
                    }
                  />
                  <DetailItem label="Año" value={motorcycle.year} />
                  <DetailItem label="Kilometraje" value={`${motorcycle.mileage} km`} />
                  <DetailItem label="Cilindrada" value={`${motorcycle.displacement ?? "-"} cc`} />
                  <DetailItem label="Color" value={motorcycle.color?.name ?? "N/A"} />
                  <DetailItem label="Sucursal" value={motorcycle.branch?.name ?? "N/A"} />
                  <DetailItem label="Nro. Chasis" value={motorcycle.chassisNumber ?? "N/A"} />
                  <DetailItem label="Nro. Motor" value={motorcycle.engineNumber ?? "N/A"} />
                  <DetailItem label="Patente" value={motorcycle.licensePlate ?? "N/A"} />
                  <DetailItem
                    label="Precio"
                    value={formatPrice(motorcycle.retailPrice, currency)}
                  />
                  {shouldShowWholesale && motorcycle.wholesalePrice && (
                    <DetailItem
                      label="Precio Mayorista"
                      value={formatPrice(motorcycle.wholesalePrice, currency)}
                    />
                  )}
                  {shouldShowCost && motorcycle.costPrice && (
                    <DetailItem
                      label="Precio Costo"
                      value={formatPrice(motorcycle.costPrice, currency)}
                    />
                  )}
                </div>
              </div>
              {renderClientSection()}
            </div>
            <div className="md:col-span-1 flex flex-col">
              <div className="relative mb-4 rounded-lg overflow-hidden border aspect-video bg-gray-100">
                {isLoadingImages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                ) : modelImages.length > 0 ? (
                  <>
                    <img
                      src={modelImages[currentImageIndex].url}
                      alt={`${motorcycle.brand?.name} ${motorcycle.model?.name}`}
                      className="w-full h-full object-cover"
                    />
                    {modelImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                          title="Imagen anterior"
                          aria-label="Ver imagen anterior"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                          title="Siguiente imagen"
                          aria-label="Ver siguiente imagen"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                          {currentImageIndex + 1} / {modelImages.length}
                        </div>
                      </>
                    )}
                  </>
                ) : motorcycle.model?.imageUrl ? (
                  <img
                    src={motorcycle.model.imageUrl}
                    alt={`${motorcycle.brand?.name} ${motorcycle.model?.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : motorcycle.imageUrl ? (
                  <img
                    src={motorcycle.imageUrl}
                    alt={`Moto ID ${id}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Sin imagen disponible
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2 justify-start flex-grow">{renderActions()}</div>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Presupuesto: {motorcycle?.brand?.name} {motorcycle?.model?.name} ({motorcycle?.year})
            </DialogTitle>
          </DialogHeader>

          <PaymentQuoteSimulator
            motorcycle={motorcycle}
            onClose={() => setIsQuoteModalOpen(false)}
            onExportPDF={handleExportPDF}
            organizationLogoUrl={organizationLogo || undefined}
            organizationName={organizationName || undefined}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuoteModalOpen(false)}>
              Cerrar
            </Button>
            {motorcycle && quotePdfProps && (
              <Button
                variant="outline"
                onClick={() => setShouldExportPdf(true)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="mr-2 h-4 w-4" />
                Exportar a PDF
              </Button>
            )}
            {shouldExportPdf && motorcycle && quotePdfProps && (
              <QuoteBridgePdf
                {...quotePdfProps}
                organizationLogoKey={organizationLogo || undefined}
                fileName={`Presupuesto_${motorcycle?.brand?.name || ""}_${motorcycle?.model?.name || ""}_${new Date().toISOString().split("T")[0]}.pdf`}
                onReady={() => setShouldExportPdf(false)}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

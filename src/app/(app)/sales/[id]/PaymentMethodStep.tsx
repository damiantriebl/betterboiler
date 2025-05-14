"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { OrganizationPaymentMethodDisplay } from "@/types/payment-methods";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Loader2 } from "lucide-react";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import CurrentAccountPaymentFields from "./CurrentAccountPaymentFields";
import type { MotorcycleWithRelations, PaymentFormData } from "./types";
import {
  calculateFinalPrice,
  calculateRemainingAmount,
  formatPrice,
  getBestRatesByInstallment,
} from "./utils";

// Option type for merged installment plans
interface InstallmentOption {
  installments: number;
  interestRate: number;
}

interface PaymentMethodStepProps {
  moto: MotorcycleWithRelations;
  isReserved: boolean;
  reservationAmount: number;
  reservationCurrency: string;
  paymentData: PaymentFormData;
  organizationPaymentMethods: OrganizationPaymentMethodDisplay[];
  loadingOrgPaymentMethods: boolean;
  applicablePromotions: BankingPromotionDisplay[];
  loadingPromotions: boolean;
  availableInstallmentPlans: InstallmentOption[];
  onPaymentDataChange: (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onPromotionSelection: (promotionId: number) => void;
  onCheckboxChange: (name: string, checked: boolean) => void;
  onDateChange: (name: string, date: Date | undefined) => void;
}

export default function PaymentMethodStep({
  moto,
  isReserved,
  reservationAmount,
  reservationCurrency,
  paymentData,
  organizationPaymentMethods,
  loadingOrgPaymentMethods,
  applicablePromotions,
  loadingPromotions,
  availableInstallmentPlans,
  onPaymentDataChange,
  onPromotionSelection,
  onCheckboxChange,
  onDateChange,
}: PaymentMethodStepProps) {
  // Get selected promotions
  const selectedPromotions = (paymentData.selectedPromotions || [])
    .map((id) => applicablePromotions.find((p) => p.id === id))
    .filter((p): p is BankingPromotionDisplay => p !== undefined);
  // Best interest rates per installment across applicable promotions
  const bestRatesMap = getBestRatesByInstallment(applicablePromotions);

  const getBasePrice = () => {
    if (paymentData.isMayorista && moto?.wholesalePrice) {
      return moto.wholesalePrice;
    }
    return moto?.retailPrice || 0;
  };

  // Primero, añade una función que determina si las promociones son compatibles
  const arePromotionsCompatible = (
    currentPromo: BankingPromotionDisplay,
    selectedPromos: BankingPromotionDisplay[],
  ) => {
    // Si no hay promociones seleccionadas, siempre es compatible
    if (selectedPromos.length === 0) return true;

    // Regla 1: Verificar compatibilidad de cuotas (para tarjetas)
    if (paymentData.metodoPago === "tarjeta") {
      const hasInstallmentPlans = currentPromo.installmentPlans?.some(
        (plan) => plan?.isEnabled,
      );

      // Si la promoción actual tiene planes de cuotas, verificar compatibilidad
      if (hasInstallmentPlans) {
        const currentPromoPlans =
          currentPromo.installmentPlans
            ?.filter((plan) => plan?.isEnabled)
            ?.map((plan) => plan.installments) || [];

        for (const promo of selectedPromos) {
          const promoPlans =
            promo.installmentPlans
              ?.filter((plan) => plan?.isEnabled)
              ?.map((plan) => plan.installments) || [];

          // Verificar si tienen al menos un plan en común
          const hasCommonPlan = currentPromoPlans.some((plan) => promoPlans.includes(plan));
          if (!hasCommonPlan && promoPlans.length > 0) return false;
        }
      }
    }

    // Regla 2: No permitir mezclar descuentos con recargos
    const hasDiscount = currentPromo.discountRate && currentPromo.discountRate > 0;
    const hasSurcharge = currentPromo.surchargeRate && currentPromo.surchargeRate > 0;

    for (const promo of selectedPromos) {
      const promoHasDiscount = promo.discountRate && promo.discountRate > 0;
      const promoHasSurcharge = promo.surchargeRate && promo.surchargeRate > 0;

      // Si una tiene recargo y la otra descuento, son incompatibles
      if ((hasDiscount && promoHasSurcharge) || (hasSurcharge && promoHasDiscount)) {
        return false;
      }
    }

    // Las promociones son compatibles
    return true;
  };

  // Helper function to get payment method type from DB value
  const getPaymentMethodValue = (dbType?: string) => {
    if (!dbType) return "";
    const typeMap: Record<string, string> = {
      cash: "efectivo",
      transfer: "transferencia",
      credit: "tarjeta",
      debit: "tarjeta",
      mercadopago: "mercadopago",
      todopago: "todopago",
      rapipago: "rapipago",
      qr: "qr",
      check: "cheque",
      current_account: "cuenta_corriente",
    };
    return typeMap[dbType.toLowerCase()] || dbType.toLowerCase();
  };

  // Helper function to get payment method display name for the dropdown group
  const getGroupDisplayName = (
    groupValue: string,
    methodsInGroup: OrganizationPaymentMethodDisplay[],
  ) => {
    if (groupValue === "tarjeta") return "Tarjeta";
    return (
      methodsInGroup[0]?.card?.name || groupValue.charAt(0).toUpperCase() + groupValue.slice(1)
    );
  };

  // Group payment methods (e.g., combine credit and debit)
  const groupedMethods = (organizationPaymentMethods || []).reduce(
    (acc, orgMethod) => {
      if (!orgMethod.card || !orgMethod.card.type) return acc; // Skip if card details or type are missing
      const value = getPaymentMethodValue(orgMethod.card.type);
      if (!acc[value]) {
        acc[value] = [];
      }
      acc[value].push(orgMethod);
      return acc;
    },
    {} as Record<string, OrganizationPaymentMethodDisplay[]>,
  );

  // Final price calculation
  const finalPrice = calculateFinalPrice(
    getBasePrice(),
    paymentData.discountType,
    paymentData.discountValue,
    selectedPromotions,
  );

  const remainingAmount = calculateRemainingAmount(
    finalPrice,
    isReserved ? reservationAmount : 0,
    paymentData.downPayment,
  );

  // Reemplazar los onFocus y onBlur con funciones separadas
  const handleDateFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.type = "date";
  };

  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.type = "text";
  };

  return (
    <div className="space-y-6 mt-6">
      {loadingOrgPaymentMethods && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando métodos de pago...</span>
        </div>
      )}

      {!loadingOrgPaymentMethods &&
        (!organizationPaymentMethods || organizationPaymentMethods.length === 0) && (
          <p className="text-center text-muted-foreground">
            No hay métodos de pago configurados o no se pudieron cargar.
          </p>
        )}

      {!loadingOrgPaymentMethods &&
        organizationPaymentMethods &&
        organizationPaymentMethods.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda: Método de pago y campos específicos */}
              <div className="space-y-4">
                <div>
                  {" "}
                  {/* Encapsulate Label and Select for main payment method */}
                  <Label htmlFor="metodoPago">Método de Pago</Label>
                  <Select
                    name="metodoPago"
                    value={paymentData.metodoPago}
                    onValueChange={(value) =>
                      onPaymentDataChange({
                        target: { name: "metodoPago", value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                  >
                    <SelectTrigger id="metodoPago">
                      <SelectValue placeholder="Seleccione un método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Métodos Disponibles</SelectLabel>
                        {Object.entries(groupedMethods).map(([groupValue, methodsInGroup]) => (
                          <SelectItem key={groupValue} value={groupValue}>
                            {getGroupDisplayName(groupValue, methodsInGroup)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos específicos según el método de pago */}
                {paymentData.metodoPago === "tarjeta" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de Tarjeta</h3>
                    <Input
                      name="tarjetaNumero"
                      placeholder="Número de Tarjeta"
                      onChange={onPaymentDataChange}
                      value={paymentData.tarjetaNumero || ""}
                    />
                    <Input
                      name="tarjetaVencimiento"
                      placeholder="MM/AA"
                      onChange={onPaymentDataChange}
                      value={paymentData.tarjetaVencimiento || ""}
                    />
                    <Input
                      name="tarjetaCVV"
                      placeholder="CVV"
                      onChange={onPaymentDataChange}
                      value={paymentData.tarjetaCVV || ""}
                    />
                    <Select
                      name="tarjetaTipo"
                      value={paymentData.tarjetaTipo || ""}
                      onValueChange={(value) =>
                        onPaymentDataChange({
                          target: { name: "tarjetaTipo", value },
                        } as React.ChangeEvent<HTMLSelectElement>)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de Tarjeta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="mastercard">Mastercard</SelectItem>
                        <SelectItem value="amex">American Express</SelectItem>
                        <SelectItem value="cabal">Cabal</SelectItem>
                        <SelectItem value="naranja">Naranja</SelectItem>
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      name="banco"
                      value={paymentData.banco || ""}
                      onValueChange={(value) =>
                        onPaymentDataChange({
                          target: { name: "banco", value },
                        } as React.ChangeEvent<HTMLSelectElement>)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Banco Emisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="galicia">Galicia</SelectItem>
                        <SelectItem value="santander">Santander Río</SelectItem>
                        <SelectItem value="macro">Macro</SelectItem>
                        <SelectItem value="bbva">BBVA Francés</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      name="cuotas"
                      value={String(paymentData.cuotas || 1)}
                      onValueChange={(value) =>
                        onPaymentDataChange({
                          target: { name: "cuotas", value },
                        } as React.ChangeEvent<HTMLSelectElement>)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Cuotas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 cuota</SelectItem>
                        {availableInstallmentPlans.map((plan) => (
                          <SelectItem key={plan.installments} value={String(plan.installments)}>
                            {plan.installments} cuotas{" "}
                            {plan.interestRate === 0
                              ? "sin interés"
                              : `(${plan.interestRate}% interés)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentData.metodoPago === "transferencia" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de Transferencia</h3>
                    <Input
                      name="transferenciaCBU"
                      placeholder="CBU/CVU/Alias"
                      onChange={onPaymentDataChange}
                      value={paymentData.transferenciaCBU || ""}
                    />
                    <Input
                      name="transferenciaTitular"
                      placeholder="Nombre del Titular"
                      onChange={onPaymentDataChange}
                      value={paymentData.transferenciaTitular || ""}
                    />
                    <Input
                      name="transferenciaReferencia"
                      placeholder="Referencia (Opcional)"
                      onChange={onPaymentDataChange}
                      value={paymentData.transferenciaReferencia || ""}
                    />
                  </div>
                )}

                {paymentData.metodoPago === "cheque" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de Cheque</h3>
                    <Input
                      name="chequeNumero"
                      placeholder="Número de Cheque"
                      onChange={onPaymentDataChange}
                      value={paymentData.chequeNumero || ""}
                    />
                    <Input
                      name="chequeFecha"
                      placeholder="Fecha de Emisión/Pago"
                      onFocus={handleDateFocus}
                      onBlur={handleDateBlur}
                      onChange={onPaymentDataChange}
                      value={paymentData.chequeFecha || ""}
                    />
                    <Input
                      name="chequeEmisor"
                      placeholder="Nombre del Emisor"
                      onChange={onPaymentDataChange}
                      value={paymentData.chequeEmisor || ""}
                    />
                    <Input
                      name="chequeBanco"
                      placeholder="Banco"
                      onChange={onPaymentDataChange}
                      value={paymentData.chequeBanco || ""}
                    />
                  </div>
                )}

                {paymentData.metodoPago === "cuenta_corriente" && (
                  <CurrentAccountPaymentFields
                    paymentData={paymentData}
                    moto={moto}
                    onPaymentDataChange={onPaymentDataChange}
                    onDateChange={onDateChange}
                  />
                )}
              </div>{" "}
              {/* End Columna Izquierda */}
              {/* Columna Derecha: Resumen de precios, promociones */}
              <div className="space-y-4">
                <Card className="p-4 bg-secondary/50">
                  <h3 className="text-lg font-semibold mb-2">Resumen de Precios</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Precio Base:</span>
                      <span>{formatPrice(getBasePrice(), moto?.currency)}</span>
                    </div>
                    {isReserved && (
                      <div className="flex justify-between text-green-600">
                        <span>Reserva Pagada:</span>
                        <span>- {formatPrice(reservationAmount, reservationCurrency)}</span>
                      </div>
                    )}
                    {paymentData.downPayment &&
                      paymentData.downPayment > 0 &&
                      paymentData.metodoPago === "cuenta_corriente" && (
                        <div className="flex justify-between text-green-600">
                          <span>Adelanto Pagado:</span>
                          <span>- {formatPrice(paymentData.downPayment, moto?.currency)}</span>
                        </div>
                      )}
                    {selectedPromotions.map((promo) =>
                      promo.discountRate ? (
                        <div
                          key={`discount-${promo.id}`}
                          className="flex justify-between text-green-600"
                        >
                          <span>Descuento ({promo.name}):</span>
                          <span>
                            -{" "}
                            {formatPrice(
                              getBasePrice() * (promo.discountRate / 100),
                              moto?.currency,
                            )}
                          </span>
                        </div>
                      ) : promo.surchargeRate ? (
                        <div
                          key={`surcharge-${promo.id}`}
                          className="flex justify-between text-red-600"
                        >
                          <span>Recargo ({promo.name}):</span>
                          <span>
                            +{" "}
                            {formatPrice(
                              getBasePrice() * (promo.surchargeRate / 100),
                              moto?.currency,
                            )}
                          </span>
                        </div>
                      ) : null,
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Precio Final:</span>
                      <span>{formatPrice(finalPrice, moto?.currency)}</span>
                    </div>
                    {paymentData.metodoPago !== "cuenta_corriente" && (
                      <div className="flex justify-between font-medium text-base pt-1 text-blue-600">
                        <span>Monto a Pagar Hoy:</span>
                        <span>{formatPrice(remainingAmount, moto?.currency)}</span>
                      </div>
                    )}
                    {paymentData.metodoPago === "cuenta_corriente" && remainingAmount > 0 && (
                      <div className="flex justify-between font-medium text-base pt-1 text-blue-600">
                        <span>Monto a Financiar:</span>
                        <span>{formatPrice(remainingAmount, moto?.currency)}</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-3">Promociones Aplicables</h3>
                  {loadingPromotions ? (
                    <p>Cargando promociones...</p>
                  ) : applicablePromotions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay promociones aplicables para el método de pago seleccionado.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {applicablePromotions.map((promo) => {
                        const isSelected = paymentData.selectedPromotions?.includes(promo.id);
                        const isDisabled = !arePromotionsCompatible(promo, selectedPromotions);

                        return (
                          <div
                            key={promo.id}
                            className={`flex items-center space-x-3 p-3 border rounded-md ${isSelected ? "border-primary bg-primary/10" : ""} ${isDisabled && !isSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            onClick={() => !isDisabled && onPromotionSelection(promo.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                !isDisabled && onPromotionSelection(promo.id);
                              }
                            }}
                            role="button"
                            tabIndex={isDisabled ? -1 : 0}
                            aria-disabled={isDisabled}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={isDisabled && !isSelected}
                              onCheckedChange={() => !isDisabled && onPromotionSelection(promo.id)}
                              id={`promo-${promo.id}`}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`promo-${promo.id}`}
                                className={`text-sm font-medium leading-none ${isDisabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {promo.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {promo.description || "Descripción no disponible"}
                                {promo.discountRate && (
                                  <Badge variant="secondary" className="ml-2">
                                    -{promo.discountRate}%
                                  </Badge>
                                )}
                                {promo.surchargeRate && (
                                  <Badge variant="destructive" className="ml-2">
                                    +{promo.surchargeRate}%
                                  </Badge>
                                )}
                              </p>
                              {paymentData.metodoPago === "tarjeta" &&
                                promo.installmentPlans &&
                                promo.installmentPlans.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {promo.installmentPlans
                                      .filter((p) => p.isEnabled)
                                      .map((plan) => (
                                        <Badge key={plan.id} variant="outline" className="text-xs">
                                          {plan.installments}c{" "}
                                          {bestRatesMap[plan.installments]?.interestRate ===
                                            plan.interestRate ? (
                                            <Check className="h-3 w-3 ml-1 text-green-600" />
                                          ) : null}
                                          {plan.interestRate > 0
                                            ? `(${plan.interestRate}%)`
                                            : " s/i"}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>{" "}
              {/* End Columna Derecha */}
            </div>{" "}
            {/* End grid */}
          </>
        )}
    </div>
  );
}

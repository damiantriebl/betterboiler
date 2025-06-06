"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { OrganizationPaymentMethodDisplay } from "@/types/payment-methods";
import { Check, Loader2 } from "lucide-react";
import CurrentAccountPaymentFields from "./CurrentAccountPaymentFields";
import type {
  MotorcycleWithRelations,
  PaymentFormData,
  PaymentSegment,
} from "./types";
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
  paymentSegments: PaymentSegment[];
  onSegmentChange: (
    index: number,
    field: "metodoPago" | "monto",
    value: string | number,
  ) => void;
  onAddSegment: () => void;
  onRemoveSegment: (index: number) => void;
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
  paymentSegments,
  onSegmentChange,
  onAddSegment,
  onRemoveSegment,
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
  const selectedPromotions = (paymentData?.selectedPromotions || [])
    .map((id) => applicablePromotions.find((p) => p.id === id))
    .filter((p): p is BankingPromotionDisplay => p !== undefined);
  // Best interest rates per installment across applicable promotions
  const bestRatesMap = getBestRatesByInstallment(applicablePromotions);

  const getBasePrice = () => {
    if (paymentData?.isMayorista && moto?.wholesalePrice) {
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
    if (paymentData?.metodoPago === "tarjeta") {
      const hasInstallmentPlans = currentPromo.installmentPlans?.some((plan) => plan?.isEnabled);

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
    if (!dbType) return "cash"; // Fallback to cash if type is not defined
    const typeMap: Record<string, string> = {
      cash: "efectivo",
      transfer: "transferencia",
      deposit: "deposito",
      credit: "tarjeta",
      debit: "tarjeta",
      todopago: "todopago",
      rapipago: "rapipago",
      payway: "payway",
      mercadopago: "mercadopago",
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
    if (groupValue === "payway") return "PayWay";
    if (groupValue === "mercadopago") return "Mercado Pago";
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
    // Determinar el tipo de descuento basado en qué campo tiene valor
    paymentData?.discountPercentage && paymentData.discountPercentage > 0 ? "percentage" : "fixed",
    // Usar el valor correspondiente al tipo de descuento
    paymentData?.discountPercentage && paymentData.discountPercentage > 0
      ? paymentData.discountPercentage
      : paymentData?.discountValue || 0,
    selectedPromotions,
  );

  // Calcula el monto restante después de la reserva
  let amountAfterReservation = calculateRemainingAmount(
    finalPrice,
    moto?.currency || "USD", // totalCurrency
    isReserved ? reservationAmount : 0, // reservationAmount
    reservationCurrency, // reservationCurrency
    1, // exchangeRate por defecto - se puede mejorar con tipo de cambio real
  );

  // Si hay un downPayment, réstalo del monto después de la reserva
  if (paymentData?.downPayment && paymentData.downPayment > 0) {
    amountAfterReservation -= paymentData.downPayment;
  }
  const remainingAmount = Math.max(0, amountAfterReservation);
  const segmentsPaid = paymentSegments.reduce((acc, s) => acc + (s.monto || 0), 0);
  const outstandingAmount = Math.max(0, remainingAmount - segmentsPaid); // Asegurar que no sea negativo

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
                  <Label htmlFor="metodoPago">Método de Pago</Label>
                  <Select
                    name="metodoPago"
                    value={paymentData?.metodoPago}
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

                {(paymentData?.metodoPago === "mercadopago" ||
                  paymentData?.metodoPago?.toLowerCase().includes("mercado")) && (
                  <PointSmartIntegration
                    amount={remainingAmount}
                    description={`${moto?.brand?.name || ""} ${moto?.model?.name || ""} ${moto?.year || ""}`}
                    motorcycleId={moto?.id}
                    saleId={`sale-${Date.now()}`}
                    onPaymentSuccess={(paymentData: any) => {
                      console.log("✅ [PaymentMethodStep] Pago presencial exitoso:", paymentData);
                      // Aquí puedes manejar el éxito del pago presencial
                    }}
                    onPaymentError={(error: any) => {
                      console.error("❌ [PaymentMethodStep] Error en pago presencial:", error);
                      // Aquí puedes manejar errores del Point
                    }}
                  />
                )}

                {paymentData?.metodoPago === "tarjeta" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de Tarjeta</h3>
                    <Input
                      name="tarjetaNumero"
                      placeholder="Número de Tarjeta"
                      onChange={onPaymentDataChange}
                      value={paymentData?.tarjetaNumero || ""}
                    />
                    <Input
                      name="tarjetaVencimiento"
                      placeholder="MM/AA"
                      onChange={onPaymentDataChange}
                      value={paymentData?.tarjetaVencimiento || ""}
                    />
                    <Input
                      name="tarjetaCVV"
                      placeholder="CVV"
                      onChange={onPaymentDataChange}
                      value={paymentData?.tarjetaCVV || ""}
                    />
                    <Select
                      name="tarjetaTipo"
                      value={paymentData?.tarjetaTipo || ""}
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
                      value={paymentData?.banco || ""}
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
                      value={String(paymentData?.cuotas || 1)}
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
                            {plan.installments} cuotas
                            {plan.interestRate === 0
                              ? "sin interés"
                              : `(${plan.interestRate}% interés)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentData?.metodoPago === "transferencia" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de Transferencia</h3>
                    <Input
                      name="transferenciaCBU"
                      placeholder="CBU/CVU/Alias"
                      onChange={onPaymentDataChange}
                      value={paymentData?.transferenciaCBU || ""}
                    />
                    <Input
                      name="transferenciaTitular"
                      placeholder="Nombre del Titular"
                      onChange={onPaymentDataChange}
                      value={paymentData?.transferenciaTitular || ""}
                    />
                    <Input
                      name="transferenciaReferencia"
                      placeholder="Referencia (Opcional)"
                      onChange={onPaymentDataChange}
                      value={paymentData?.transferenciaReferencia || ""}
                    />
                  </div>
                )}

                {paymentData?.metodoPago === "cheque" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de Cheque</h3>
                    <Input
                      name="chequeNumero"
                      placeholder="Número de Cheque"
                      onChange={onPaymentDataChange}
                      value={paymentData?.chequeNumero || ""}
                    />
                    <Input
                      name="chequeFecha"
                      placeholder="Fecha de Emisión/Pago"
                      onFocus={handleDateFocus}
                      onBlur={handleDateBlur}
                      onChange={onPaymentDataChange}
                      value={paymentData?.chequeFecha || ""}
                    />
                    <Input
                      name="chequeEmisor"
                      placeholder="Nombre del Emisor"
                      onChange={onPaymentDataChange}
                      value={paymentData?.chequeEmisor || ""}
                    />
                    <Input
                      name="chequeBanco"
                      placeholder="Banco"
                      onChange={onPaymentDataChange}
                      value={paymentData?.chequeBanco || ""}
                    />
                  </div>
                )}

                {paymentData?.metodoPago === "payway" && (
                  <div className="space-y-4 p-4 border rounded-md mt-4">
                    <h3 className="text-sm font-medium">Detalles de PayWay</h3>
                    <Input
                      name="paywayCodigoPagador"
                      placeholder="Código de Pagador"
                      onChange={onPaymentDataChange}
                      value={paymentData?.paywayCodigoPagador || ""}
                    />
                    <Input
                      name="paywayDocumento"
                      placeholder="Documento (DNI/CUIT)"
                      onChange={onPaymentDataChange}
                      value={paymentData?.paywayDocumento || ""}
                    />
                    <Input
                      name="paywayTelefono"
                      placeholder="Teléfono"
                      onChange={onPaymentDataChange}
                      value={paymentData?.paywayTelefono || ""}
                    />
                    <Input
                      name="paywayEmail"
                      placeholder="Email"
                      type="email"
                      onChange={onPaymentDataChange}
                      value={paymentData?.paywayEmail || ""}
                    />
                    <Input
                      name="paywayReferencia"
                      placeholder="Referencia (Opcional)"
                      onChange={onPaymentDataChange}
                      value={paymentData?.paywayReferencia || ""}
                    />
                  </div>
                )}

                {paymentData?.metodoPago === "cuenta_corriente" && (
                  <CurrentAccountPaymentFields
                    paymentData={paymentData}
                    moto={moto}
                    onPaymentDataChange={onPaymentDataChange}
                    onDateChange={onDateChange}
                  />
                )}
              </div>
              {/* End Columna Izquierda */}

              {/* Columna Derecha: Resumen de precios, promociones */}
              <div className="space-y-4">
                <Card className="p-4 bg-secondary/50">
                  <h3 className="text-lg font-semibold mb-3">Resumen de Precios</h3>
                  <div className="space-y-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Precio Sugerido:</span>
                        <span>{formatPrice(getBasePrice(), moto?.currency)}</span>
                      </div>
                      {paymentData?.discountPercentage && paymentData.discountPercentage > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Descuento Personal ({paymentData.discountPercentage}%):</span>
                          <span>
                            -
                            {formatPrice(
                              getBasePrice() * (paymentData.discountPercentage / 100),
                              moto?.currency,
                            )}
                          </span>
                        </div>
                      )}
                      {paymentData?.discountValue &&
                        paymentData.discountValue > 0 &&
                        (!paymentData?.discountPercentage ||
                          paymentData.discountPercentage === 0) && (
                          <div className="flex justify-between text-green-600">
                            <span>Descuento Personal:</span>
                            <span>-{formatPrice(paymentData.discountValue, moto?.currency)}</span>
                          </div>
                        )}
                      {isReserved && (
                        <div className="flex justify-between text-green-600">
                          <span>Reserva Pagada:</span>
                          <span>- {formatPrice(reservationAmount, reservationCurrency)}</span>
                        </div>
                      )}
                      {paymentData?.downPayment &&
                        paymentData.downPayment > 0 &&
                        paymentData?.metodoPago === "cuenta_corriente" && (
                          <div className="flex justify-between text-green-600">
                            <span>Adelanto Pagado:</span>
                            <span>- {formatPrice(paymentData.downPayment, moto?.currency)}</span>
                          </div>
                        )}
                      {selectedPromotions &&
                        selectedPromotions.length > 0 &&
                        selectedPromotions
                          .filter((promo) => {
                            // Solo incluir promociones que realmente tienen descuentos o recargos válidos
                            return (
                              (promo?.discountRate && promo.discountRate > 0) ||
                              (promo?.surchargeRate && promo.surchargeRate > 0)
                            );
                          })
                          .map((promo) => {
                            if (promo?.discountRate && promo.discountRate > 0) {
                              return (
                                <div
                                  key={`discount-${promo.id}`}
                                  className="flex justify-between text-green-600"
                                >
                                  <span>Descuento ({promo.name}):</span>
                                  <span>
                                    -
                                    {formatPrice(
                                      getBasePrice() * (promo.discountRate / 100),
                                      moto?.currency,
                                    )}
                                  </span>
                                </div>
                              );
                            }
                            if (promo?.surchargeRate && promo.surchargeRate > 0) {
                              return (
                                <div
                                  key={`surcharge-${promo.id}`}
                                  className="flex justify-between text-red-600"
                                >
                                  <span>Recargo ({promo.name}):</span>
                                  <span>
                                    +
                                    {formatPrice(
                                      getBasePrice() * (promo.surchargeRate / 100),
                                      moto?.currency,
                                    )}
                                  </span>
                                </div>
                              );
                            }
                            // No debería llegar aquí debido al filter, pero por seguridad
                            return null;
                          })
                          .filter(Boolean)}{" "}
                      {/* Eliminar cualquier null que pueda quedar */}
                    </div>

                    {/* Controles de ajuste de precio */}
                    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-3">
                      <h4 className="text-sm font-medium text-blue-800">Ajustar Precio</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="descuentoPorcentaje" className="text-xs">
                            Descuento (%)
                          </Label>
                          <Input
                            id="descuentoPorcentaje"
                            name="discountPercentage"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="0"
                            value={
                              paymentData?.discountPercentage && paymentData.discountPercentage > 0
                                ? paymentData.discountPercentage.toString()
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              const discountPercentage =
                                value === "" ? 0 : Number.parseInt(value) || 0;

                              onPaymentDataChange({
                                target: {
                                  name: "discountPercentage",
                                  value: value === "" ? "" : discountPercentage.toString(),
                                },
                              } as React.ChangeEvent<HTMLInputElement>);

                              if (discountPercentage > 0) {
                                onPaymentDataChange({
                                  target: { name: "discountValue", value: "" },
                                } as React.ChangeEvent<HTMLInputElement>);
                              }
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="descuentoPersonalizado" className="text-xs">
                            Descuento en Monto Fijo ({moto?.currency})
                          </Label>
                          <Input
                            id="descuentoPersonalizado"
                            name="discountValue"
                            type="number"
                            min="0"
                            max={getBasePrice()}
                            step="100"
                            placeholder="0"
                            value={
                              paymentData?.discountValue && paymentData.discountValue > 0
                                ? paymentData.discountValue.toString()
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              const discountAmount = value === "" ? 0 : Number.parseInt(value) || 0;

                              onPaymentDataChange({
                                target: {
                                  name: "discountValue",
                                  value: value === "" ? "" : discountAmount.toString(),
                                },
                              } as React.ChangeEvent<HTMLInputElement>);

                              if (discountAmount > 0) {
                                onPaymentDataChange({
                                  target: { name: "discountPercentage", value: "" },
                                } as React.ChangeEvent<HTMLInputElement>);
                              }
                            }}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="precioFinalManual" className="text-xs">
                          Precio Final ({moto?.currency})
                        </Label>
                        <Input
                          id="precioFinalManual"
                          name="precioFinalManual"
                          type="number"
                          min="0"
                          step="100"
                          placeholder={formatPrice(finalPrice, moto?.currency)}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") return; // No hacer nada si está vacío

                            const nuevoPrecioFinal = Number.parseInt(value) || 0;
                            const precioBase = getBasePrice();

                            if (precioBase > 0 && nuevoPrecioFinal > 0) {
                              // Calcular el descuento en monto fijo basado en el nuevo precio final
                              const descuentoCalculado = precioBase - nuevoPrecioFinal;
                              const descuentoRedondeado = Math.max(
                                0,
                                Math.min(precioBase, descuentoCalculado),
                              );

                              // Limpiar porcentaje y usar monto fijo
                              onPaymentDataChange({
                                target: { name: "discountPercentage", value: "" },
                              } as React.ChangeEvent<HTMLInputElement>);
                              onPaymentDataChange({
                                target: {
                                  name: "discountValue",
                                  value:
                                    descuentoRedondeado > 0 ? descuentoRedondeado.toString() : "",
                                },
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          className="text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Monto final */}
                    <div className="border-t pt-3">
                      {paymentData?.metodoPago !== "cuenta_corriente" && (
                        <div className="flex justify-between font-medium text-lg text-blue-600">
                          <span>Monto Final:</span>
                          <span>{formatPrice(remainingAmount, moto?.currency)}</span>
                        </div>
                      )}
                      {paymentData?.metodoPago === "cuenta_corriente" && remainingAmount > 0 && (
                        <div className="flex justify-between font-medium text-lg text-blue-600">
                          <span>Monto a Financiar:</span>
                          <span>{formatPrice(remainingAmount, moto?.currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
                <Card className="p-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Medios de Pago</h3>
                  {paymentSegments.map((seg, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <Select value={seg.metodoPago} onValueChange={(val) => onSegmentChange(idx, "metodoPago", val)}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="Método" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="mercadopago">MercadoPago</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" className="w-24" value={seg.monto} onChange={(e) => onSegmentChange(idx, "monto", Number(e.target.value))} />
                      <Button variant="destructive" onClick={() => onRemoveSegment(idx)}>X</Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={onAddSegment}>Agregar medio de pago</Button>
                  {outstandingAmount > 0 && (
                    <p className="text-sm mt-2">Falta pagar: {formatPrice(outstandingAmount, moto?.currency)}</p>
                  )}
                  {outstandingAmount <= 0 && (
                    <p className="text-sm mt-2 text-green-600">Pago completo.</p>
                  )}
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
                        const isSelected = paymentData?.selectedPromotions?.includes(promo.id);
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
                              <div className="text-xs text-muted-foreground">
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
                              </div>
                              {paymentData?.metodoPago === "tarjeta" &&
                                promo.installmentPlans &&
                                promo.installmentPlans.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {promo.installmentPlans
                                      .filter((p) => p.isEnabled)
                                      .map((plan) => (
                                        <Badge key={plan.id} variant="outline" className="text-xs">
                                          {plan.installments}c
                                          {bestRatesMap[plan.installments] === plan.interestRate ? (
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
              </div>
              {/* End Columna Derecha */}
            </div>
            {/* End grid */}
          </>
        )}
    </div>
  );
}

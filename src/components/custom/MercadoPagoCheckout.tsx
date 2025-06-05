"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MercadoPagoCheckoutProps {
  amount: number;
  description: string;
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
  payerDocument: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: any) => void;
  onPending?: (payment: any) => void;
}

export default function MercadoPagoCheckout({
  amount,
  description,
  payerEmail,
  payerFirstName,
  payerLastName,
  payerDocument,
  onSuccess,
  onError,
  onPending,
}: MercadoPagoCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const processPayment = async () => {
    setLoading(true);

    try {
      // Crear el objeto de datos del pago
      const paymentData = {
        transaction_amount: amount,
        currency_id: "ARS",
        description,
        payer: {
          email: payerEmail,
          first_name: payerFirstName,
          last_name: payerLastName,
          identification: {
            type: "DNI",
            number: payerDocument,
          },
        },
      };

      // Enviar al backend para crear la preference
      const response = await fetch("/api/payments/mercadopago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirigir al usuario a Mercado Pago
        const checkoutUrl = result.sandbox_init_point || result.init_point;
        if (checkoutUrl) {
          toast.success("Redirigiendo a Mercado Pago...");
          window.location.href = checkoutUrl;
        } else {
          throw new Error("No se pudo obtener la URL de checkout");
        }
      } else {
        throw new Error(result.error || "Error al crear la preferencia de pago");
      }
    } catch (error) {
      console.error("Error procesando pago:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar el pago");
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return payerEmail && payerFirstName && payerLastName && payerDocument && amount > 0;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Procesar Pago con Mercado Pago</h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Resumen del Pago</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Monto:</span>
              <span className="font-medium">${amount.toLocaleString("es-AR")} ARS</span>
            </div>
            <div className="flex justify-between">
              <span>Descripción:</span>
              <span>{description}</span>
            </div>
            <div className="flex justify-between">
              <span>Comprador:</span>
              <span>
                {payerFirstName} {payerLastName}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md">
          <div className="text-xs font-medium text-blue-800 mb-1">ℹ️ Información</div>
          <div className="text-xs text-blue-700">
            • El pago se procesará directamente con Mercado Pago • Recibirás una confirmación del
            estado del pago • Si es aprobado, se registrará automáticamente
          </div>
        </div>

        <Button
          onClick={processPayment}
          disabled={loading || !isFormValid()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando Pago...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar con Mercado Pago
            </>
          )}
        </Button>

        {!isFormValid() && (
          <p className="text-sm text-muted-foreground text-center">
            Completa todos los datos del comprador para continuar
          </p>
        )}
      </div>
    </Card>
  );
}

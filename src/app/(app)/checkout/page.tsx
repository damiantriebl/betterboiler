"use client";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { Payment } from "@mercadopago/sdk-react";
import { useState } from "react";

// Inicializar MercadoPago.js con tu public key
// Asegúrate de que NEXT_PUBLIC_MP_PUBLIC_KEY esté definido en tu .env.local
if (process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) {
  initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY);
} else {
  console.warn(
    "NEXT_PUBLIC_MP_PUBLIC_KEY no está definida. El componente de pago de Mercado Pago podría no funcionar.",
  );
}

// Define un tipo para el resultado del pago si lo conoces, sino 'any' por ahora
type PaymentResultType = {
  status?: string;
  id?: string;
  // Agrega otras propiedades que esperas de tu backend
  error?: string;
  details?: Record<string, unknown>;
};

export default function CheckoutPage() {
  const [paymentResult, setPaymentResult] = useState<PaymentResultType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Para feedback visual

  return (
    <div>
      <h2>Completar Pago</h2>
      <Payment
        initialization={{
          amount: 10,
          payer: { email: "damiantriebl@gmail.com" },
          // preferenceId: "<ID_DE_PREFERENCIA>" // Si es necesario
        }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            ticket: "all",
            bankTransfer: "all",
            mercadoPago: "all",
            maxInstallments: 12,
          },
        }}
        onSubmit={async (params) => {
          // params es el objeto que nos da el Brick.
          // Contiene token, payment_method_id, issuer_id, installments, etc.
          // Los nombres exactos pueden variar ligeramente.
          console.log("Datos recibidos del Brick Payment (onSubmit):", params);
          setIsProcessing(true);
          setErrorMsg(null);
          setPaymentResult(null);

          try {
            // Mapear los 'params' del Brick a lo que espera tu backend
            const bodyPayload = {
              token: params.formData.token,
              paymentMethodId: params.formData.payment_method_id,
              issuerId: params.formData.issuer_id,
              payment_type: params.paymentType,
              installments: params.formData.installments,
              order_total_from_frontend: 10,
            };

            console.log("Payload que se enviará al backend:", bodyPayload);

            const res = await fetch("/api/mercadopago/process-payment", {
              method: "POST",
              body: JSON.stringify(bodyPayload), // Usamos el payload mapeado
              headers: { "Content-Type": "application/json" },
            });
            const result: PaymentResultType = await res.json();

            if (res.ok && result.id) {
              setPaymentResult(result);
            } else {
              setErrorMsg(result.error || "Error al procesar el pago en el backend.");
              setPaymentResult(result); // Incluso si hay error, guarda para ver detalles
              console.error("Error desde el backend:", result);
            }
          } catch (err) {
            console.error("Error en fetch o JSON.parse:", err);
            setErrorMsg("Error de comunicación al procesar el pago.");
          } finally {
            setIsProcessing(false);
          }
        }}
        // Puedes agregar onReady y onError para mejor feedback
        onReady={() => console.log("Componente Payment listo!")}
        onError={(error) => {
          console.error("Error en el componente Payment:", error);
          setErrorMsg("Error al inicializar el formulario de pago de Mercado Pago.");
          setIsProcessing(false);
        }}
      />

      {isProcessing && <p>Procesando pago...</p>}
      {paymentResult && !isProcessing && (
        <div>
          <p>
            Resultado: {paymentResult.status || "N/A"} - ID Transacción (si aplica):
            {paymentResult.id || "N/A"}
          </p>
          {paymentResult.error && (
            <p className="error">
              Error del backend: {paymentResult.error}
              {paymentResult.details ? JSON.stringify(paymentResult.details) : ""}
            </p>
          )}
        </div>
      )}
      {errorMsg && !isProcessing && <p className="error">Error: {errorMsg}</p>}
    </div>
  );
}

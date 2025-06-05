"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MercadoPagoBricksProps {
  organizationId: string;
  amount: number;
  description: string;
  payerInfo: {
    email: string;
    firstName: string;
    lastName: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: any) => void;
}

// Declarar las variables globales de MercadoPago
declare global {
  interface Window {
    MercadoPago?: any;
  }
}

export default function MercadoPagoBricks({
  organizationId,
  amount,
  description,
  payerInfo,
  onPaymentSuccess,
  onPaymentError,
}: MercadoPagoBricksProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cardFormRef = useRef<HTMLDivElement>(null);
  const bricksBuilderRef = useRef<any>(null);

  // Cargar el SDK de MercadoPago
  useEffect(() => {
    const loadMercadoPagoSDK = () => {
      return new Promise((resolve, reject) => {
        if (window.MercadoPago) {
          resolve(window.MercadoPago);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => resolve(window.MercadoPago);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeMercadoPago = async () => {
      try {
        setLoading(true);

        // Obtener la configuración OAuth específica de esta organización
        const configResponse = await fetch(
          `/api/configuration/mercadopago/organization/${organizationId}`,
        );
        if (!configResponse.ok) {
          throw new Error("No se pudo obtener la configuración de Mercado Pago");
        }

        const { publicKey: orgPublicKey, isConnected } = await configResponse.json();

        if (!isConnected) {
          throw new Error("Mercado Pago no está conectado para esta organización");
        }

        setPublicKey(orgPublicKey);

        // Cargar SDK
        await loadMercadoPagoSDK();

        // Inicializar MercadoPago con la public key de la organización
        const mp = new window.MercadoPago(orgPublicKey, {
          locale: "es-AR",
        });

        // Crear el Brick Builder
        const bricksBuilder = mp.bricks();
        bricksBuilderRef.current = bricksBuilder;

        // Obtener métodos de pago disponibles
        const methodsResponse = await fetch(
          `/api/payments/mercadopago/methods?organizationId=${organizationId}`,
        );
        if (methodsResponse.ok) {
          const methods = await methodsResponse.json();
          setPaymentMethods(methods.payment_methods || []);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error inicializando MercadoPago:", error);
        setError(error instanceof Error ? error.message : "Error desconocido");
        setLoading(false);
      }
    };

    initializeMercadoPago();
  }, [organizationId]);

  // Renderizar el brick de tarjeta cuando esté listo
  useEffect(() => {
    if (!loading && !error && bricksBuilderRef.current && cardFormRef.current && publicKey) {
      renderCardPaymentBrick();
    }
  }, [loading, error, publicKey]);

  const renderCardPaymentBrick = async () => {
    try {
      const bricksBuilder = bricksBuilderRef.current;

      await bricksBuilder.create("cardPayment", "mercadopago-card-form", {
        initialization: {
          amount: amount,
          payer: {
            email: payerInfo.email,
            firstName: payerInfo.firstName,
            lastName: payerInfo.lastName,
            identification: payerInfo.identification || undefined,
          },
        },
        customization: {
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            ...(amount >= 300 && {
              ticket: "all",
            }),
          },
          visual: {
            style: {
              theme: "default",
            },
          },
        },
        callbacks: {
          onReady: () => {
            console.log("Brick listo");
          },
          onSubmit: async (formData: any) => {
            setIsProcessing(true);
            try {
              // Procesar el pago usando la configuración OAuth de la organización
              const paymentResponse = await fetch("/api/payments/mercadopago/process", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  organizationId,
                  formData,
                  amount,
                  description,
                  payer: payerInfo,
                }),
              });

              const paymentResult = await paymentResponse.json();

              if (paymentResponse.ok && paymentResult.success) {
                onPaymentSuccess(paymentResult);
                toast({
                  title: "Pago Exitoso",
                  description: "El pago se procesó correctamente",
                });
              } else {
                throw new Error(paymentResult.error || "Error procesando el pago");
              }
            } catch (error) {
              console.error("Error procesando pago:", error);
              const errorMessage = error instanceof Error ? error.message : "Error desconocido";
              onPaymentError(errorMessage);
              toast({
                title: "Error en el Pago",
                description: errorMessage,
                variant: "destructive",
              });
            } finally {
              setIsProcessing(false);
            }
          },
          onError: (error: any) => {
            console.error("Error en el brick:", error);
            onPaymentError(error);
            toast({
              title: "Error en el Formulario",
              description: "Hubo un problema con el formulario de pago",
              variant: "destructive",
            });
          },
        },
      });
    } catch (error) {
      console.error("Error renderizando brick:", error);
      setError("Error cargando el formulario de pago");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando formulario de pago...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img
            src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.22/mercadopago/logo__large@2x.png"
            alt="Mercado Pago"
            className="h-6"
          />
          Pagar con Mercado Pago
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Monto: <span className="font-semibold">ARS ${amount.toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div id="mercadopago-card-form" ref={cardFormRef} className="min-h-[400px]" />

        {isProcessing && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Procesando pago...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

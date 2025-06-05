"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { AlertCircle, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MercadoPagoBrickProps {
  amount: number;
  description: string;
  motorcycleId?: number;
  saleId?: string;
  additionalInfo?: {
    brand?: string;
    model?: string;
    year?: number;
  };
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentError?: (error: any) => void;
  buyerData?: {
    email: string;
    firstName?: string;
    lastName?: string;
    dni?: string;
  };
}

export default function MercadoPagoBrick({
  amount,
  description,
  motorcycleId,
  saleId,
  additionalInfo,
  onPaymentSuccess,
  onPaymentError,
  buyerData,
}: MercadoPagoBrickProps) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false); // Ref para evitar inicialización múltiple
  const { toast } = useToast();

  // Inicializar SDK y crear preferencia - SOLO UNA VEZ
  useEffect(() => {
    // Evitar re-inicialización si ya se está ejecutando
    if (initializationRef.current || !amount || amount <= 0 || !description) {
      return;
    }

    const initializePayment = async () => {
      try {
        initializationRef.current = true; // Marcar como en proceso
        setIsLoading(true);
        setError(null);

        console.log("🚀 [MercadoPagoBrick] Inicializando pago...", {
          amount,
          description,
          motorcycleId,
        });

        // NUEVO: Primero obtener el organizationId de la sesión
        const sessionResponse = await fetch("/api/auth/session");
        if (!sessionResponse.ok) {
          throw new Error("No se pudo obtener la sesión del usuario");
        }
        const sessionData = await sessionResponse.json();
        const organizationId = sessionData?.user?.organizationId;

        if (!organizationId) {
          throw new Error("No se encontró organización asociada al usuario");
        }

        console.log("🏢 [MercadoPagoBrick] Organización obtenida:", organizationId);

        // Verificar configuración de MercadoPago para esta organización
        const configResponse = await fetch(
          `/api/configuration/mercadopago/organization/${organizationId}`,
        );
        if (!configResponse.ok) {
          const configError = await configResponse.json();
          throw new Error(
            configError.error || "No se pudo obtener la configuración de MercadoPago",
          );
        }

        const { publicKey: orgPublicKey, isConnected } = await configResponse.json();

        if (!isConnected || !orgPublicKey) {
          throw new Error("MercadoPago no está configurado correctamente para esta organización");
        }

        console.log("🔑 [MercadoPagoBrick] Public key obtenida:", {
          hasPublicKey: !!orgPublicKey,
          publicKeyStart: `${orgPublicKey.substring(0, 15)}...`,
        });

        // Crear preferencia
        const response = await fetch("/api/mercadopago/create-preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            description,
            motorcycleId,
            saleId,
            additionalInfo,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || "Error al crear preferencia");
        }

        const data = await response.json();

        if (!data.success || !data.preferenceId || !data.publicKey) {
          throw new Error("Respuesta inválida del servidor");
        }

        console.log("✅ [MercadoPagoBrick] Preferencia creada exitosamente:", {
          preferenceId: data.preferenceId,
          hasPublicKey: !!data.publicKey,
          publicKeyMatches: data.publicKey === orgPublicKey,
        });

        // Verificar que la public key coincida
        if (data.publicKey !== orgPublicKey) {
          console.warn(
            "⚠️ [MercadoPagoBrick] Public key de preferencia no coincide con organización",
          );
        }

        // Inicializar SDK de MercadoPago
        initMercadoPago(data.publicKey, {
          locale: "es-AR",
        });

        setPublicKey(data.publicKey);
        setPreferenceId(data.preferenceId);
        setIsInitialized(true);
      } catch (error) {
        console.error("❌ [MercadoPagoBrick] Error al inicializar:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setError(errorMessage);

        toast({
          title: "Error de Inicialización",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        initializationRef.current = false; // Permitir reintento
      }
    };

    initializePayment();
  }, [amount, description, motorcycleId, saleId, additionalInfo, toast]); // DEPENDENCIAS NECESARIAS

  // Configuración del Payment Brick
  const initialization = {
    amount,
  };

  const customization = {
    paymentMethods: {
      creditCard: "all" as const,
      debitCard: "all" as const,
      mercadoPago: "all" as const,
      ...(amount >= 300 && {
        ticket: "all" as const,
      }),
      bankTransfer: "none" as const,
    },
    visual: {
      style: {
        theme: "default" as const,
      },
    },
  };

  // Callback cuando se envía el pago
  const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
    try {
      console.log("💳 [MercadoPagoBrick] Procesando pago...", {
        selectedPaymentMethod,
        formData: {
          ...formData,
          token: formData.token ? "PRESENTE" : "AUSENTE",
        },
      });

      // Si es pago con MercadoPago Wallet, se redirige automáticamente
      if (selectedPaymentMethod === "wallet_purchase") {
        console.log("🔗 [MercadoPagoBrick] Redirigiendo a MercadoPago Wallet...");
        return;
      }

      // Para otros métodos de pago, procesar en nuestro backend
      const response = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount,
          description,
          external_reference: saleId || `sale-${Date.now()}`,
          metadata: {
            motorcycle_id: motorcycleId?.toString(),
            sale_id: saleId,
          },
          payer: {
            email: buyerData?.email || formData.payer?.email || "cliente@better.com",
            identification: formData.payer?.identification,
          },
        }),
      });

      const paymentResult = await response.json();

      if (paymentResult.success && paymentResult.payment) {
        console.log("✅ [MercadoPagoBrick] Pago exitoso:", paymentResult.payment);

        toast({
          title: "¡Pago Exitoso!",
          description: `Pago procesado correctamente. ID: ${paymentResult.payment.id}`,
          variant: "default",
        });

        onPaymentSuccess?.(paymentResult.payment);
      } else {
        console.error("❌ [MercadoPagoBrick] Error en el pago:", paymentResult);

        toast({
          title: "Error en el Pago",
          description: paymentResult.details || paymentResult.error || "Error al procesar el pago",
          variant: "destructive",
        });

        onPaymentError?.(paymentResult);
      }
    } catch (error) {
      console.error("❌ [MercadoPagoBrick] Error al procesar pago:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";

      toast({
        title: "Error de Procesamiento",
        description: errorMessage,
        variant: "destructive",
      });

      onPaymentError?.(error);
    }
  };

  // Callback cuando hay errores en el Brick
  const onError = async (error: any) => {
    console.error("❌ [MercadoPagoBrick] Error del Brick:", error);

    toast({
      title: "Error del Componente de Pago",
      description: "Ocurrió un error en el formulario de pago. Por favor, inténtelo nuevamente.",
      variant: "destructive",
    });

    onPaymentError?.(error);
  };

  // Callback cuando el Brick está listo
  const onReady = async () => {
    console.log("✅ [MercadoPagoBrick] Brick listo para usar");
  };

  // Renderizar estados de carga y error
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Checkout MercadoPago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Inicializando sistema de pagos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Error de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInitialized || !preferenceId || !publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurando Pago...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderizar Payment Brick
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Pagar con MercadoPago
        </CardTitle>
        <p className="text-sm text-muted-foreground">Pago seguro procesado por MercadoPago</p>
      </CardHeader>
      <CardContent>
        <div className="mercadopago-brick-container">
          <Payment
            initialization={initialization}
            customization={customization}
            onSubmit={onSubmit}
            onReady={onReady}
            onError={onError}
          />
        </div>
      </CardContent>
    </Card>
  );
}

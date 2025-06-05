"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { AlertCircle, CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MercadoPagoEnhancedBrickProps {
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
  // NUEVO: Opciones de personalización
  allowedPaymentMethods?: {
    creditCard?: boolean;
    debitCard?: boolean;
    mercadoPago?: boolean;
    ticket?: boolean;
    bankTransfer?: boolean;
  };
  showPaymentMethodSelector?: boolean;
  preferredPaymentMethod?: string;
  maxInstallments?: number;
  // NUEVO: Para manejar estado de pago completado externamente
  initialPaymentCompleted?: boolean;
  initialPaymentDetails?: any;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

export default function MercadoPagoEnhancedBrick({
  amount,
  description,
  motorcycleId,
  saleId,
  additionalInfo,
  onPaymentSuccess,
  onPaymentError,
  buyerData,
  allowedPaymentMethods = {
    creditCard: true,
    debitCard: true,
    mercadoPago: false,
    ticket: false,
    bankTransfer: false,
  },
  showPaymentMethodSelector = false,
  preferredPaymentMethod,
  maxInstallments = 12,
  // NUEVO: Para manejar estado de pago completado externamente
  initialPaymentCompleted,
  initialPaymentDetails,
}: MercadoPagoEnhancedBrickProps) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    preferredPaymentMethod || "all",
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentCompleted, setPaymentCompleted] = useState(initialPaymentCompleted || false);
  const [paymentDetails, setPaymentDetails] = useState<any>(initialPaymentDetails || null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentRejected, setPaymentRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const initializationRef = useRef(false);
  const { toast } = useToast();

  // Métodos de pago disponibles con iconos
  const availablePaymentMethods: PaymentMethod[] = [
    {
      id: "all",
      name: "Todos los métodos",
      icon: "💳",
      description: "Tarjetas, efectivo y más",
      enabled: true,
    },
    {
      id: "credit_card",
      name: "Tarjeta de Crédito",
      icon: "💳",
      description: "Hasta 12 cuotas sin interés",
      enabled: allowedPaymentMethods.creditCard || false,
    },
    {
      id: "debit_card",
      name: "Tarjeta de Débito",
      icon: "💳",
      description: "Pago inmediato",
      enabled: allowedPaymentMethods.debitCard || false,
    },
    {
      id: "account_money",
      name: "MercadoPago",
      icon: "🔵",
      description: "Dinero en cuenta",
      enabled: allowedPaymentMethods.mercadoPago || false,
    },
    {
      id: "ticket",
      name: "Efectivo",
      icon: "🧾",
      description: "Pago Fácil, Rapipago, etc.",
      enabled: allowedPaymentMethods.ticket || false,
    },
    {
      id: "bank_transfer",
      name: "Transferencia",
      icon: "🏦",
      description: "CBU o Alias",
      enabled: allowedPaymentMethods.bankTransfer || false,
    },
  ].filter((method) => method.enabled);

  useEffect(() => {
    setPaymentMethods(availablePaymentMethods);
  }, [availablePaymentMethods]);

  // NUEVO: Actualizar estado cuando cambien las props externas
  useEffect(() => {
    if (initialPaymentCompleted !== undefined) {
      setPaymentCompleted(initialPaymentCompleted);
    }
    if (initialPaymentDetails !== undefined) {
      setPaymentDetails(initialPaymentDetails);
    }
  }, [initialPaymentCompleted, initialPaymentDetails]);

  // Inicializar SDK y crear preferencia - SOLO UNA VEZ
  useEffect(() => {
    // NUEVO: No inicializar si el pago ya está completado
    if (paymentCompleted || paymentPending) {
      console.log("🎉 [MercadoPagoEnhancedBrick] Pago ya procesado, omitiendo inicialización");
      setIsLoading(false);
      return;
    }

    // REFORZADO: Prevenir múltiples inicializaciones
    if (initializationRef.current || !amount || amount <= 0 || !description) {
      console.log("⚠️ [MercadoPagoEnhancedBrick] Saltando inicialización:", {
        alreadyInitializing: initializationRef.current,
        amount,
        hasDescription: !!description,
      });
      return;
    }

    const initializePayment = async () => {
      try {
        initializationRef.current = true; // Marcar como en proceso
        setIsLoading(true);
        setError(null);

        console.log("🚀 [MercadoPagoEnhancedBrick] Inicializando pago directo...", {
          amount,
          description,
          motorcycleId,
          timestamp: Date.now(),
        });

        // Obtener el organizationId de la sesión
        const sessionResponse = await fetch("/api/auth/session");
        if (!sessionResponse.ok) {
          throw new Error("No se pudo obtener la sesión del usuario");
        }
        const sessionData = await sessionResponse.json();
        const organizationId = sessionData?.user?.organizationId;

        if (!organizationId) {
          throw new Error("No se encontró organización asociada al usuario");
        }

        console.log("🏢 [MercadoPagoEnhancedBrick] Organización obtenida:", organizationId);

        // Verificar configuración de MercadoPago
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

        console.log("🔑 [MercadoPagoEnhancedBrick] Public key obtenida:", {
          hasPublicKey: !!orgPublicKey,
          publicKeyStart: `${orgPublicKey.substring(0, 15)}...`,
        });

        // Inicializar SDK de MercadoPago directamente sin preferenceId
        initMercadoPago(orgPublicKey, {
          locale: "es-AR",
        });

        setPublicKey(orgPublicKey);
        setIsInitialized(true);
      } catch (error) {
        console.error("❌ [MercadoPagoEnhancedBrick] Error en inicialización:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido al inicializar MercadoPago";
        setError(errorMessage);

        toast({
          title: "Error de Inicialización",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        initializationRef.current = false;
      }
    };

    initializePayment();
  }, [paymentCompleted, paymentPending, amount, description, motorcycleId, toast]); // ACTUALIZADO: Agregar dependencias necesarias

  // Función para obtener métodos de pago excluidos
  const getExcludedPaymentMethods = () => {
    const excluded = [];
    if (!allowedPaymentMethods.creditCard) {
      excluded.push("visa", "master", "amex", "naranja", "cabal");
    }
    if (!allowedPaymentMethods.debitCard) {
      excluded.push("debvisa", "debmaster", "maestro", "debcabal");
    }
    if (!allowedPaymentMethods.mercadoPago) {
      excluded.push("account_money");
    }
    return excluded;
  };

  // Función para obtener tipos de pago excluidos
  const getExcludedPaymentTypes = () => {
    const excluded = [];
    if (!allowedPaymentMethods.ticket) excluded.push("ticket");
    if (!allowedPaymentMethods.bankTransfer) excluded.push("bank_transfer");
    return excluded;
  };

  // FIXED: Configuración correcta del Payment Brick sin preferenceId
  const getPaymentInitialization = () => {
    return {
      amount,
    };
  };

  // FIXED: Configuración simple sin propiedades inválidas - Solo tarjetas
  const customization: any = {
    paymentMethods: {
      creditCard: "all",
      debitCard: "all",
      // FIXED: Eliminado mercadoPago y ticket completamente para solo mostrar tarjetas
    },
    visual: {
      style: {
        theme: "default" as const,
      },
    },
  };

  // NUEVO: Función para obtener mensaje de error en español
  const getSpanishErrorMessage = (error: any) => {
    const errorCode = error?.cause?.[0]?.code || error?.message || "";
    const statusDetail = error?.status_detail || "";
    const holderName = buyerData?.firstName || "";

    console.log("🔍 [MercadoPagoEnhancedBrick] Analizando error:", {
      errorCode,
      statusDetail,
      holderName,
      fullError: error,
    });

    // Mapeo de códigos específicos a mensajes en español
    const errorMessages: { [key: string]: string } = {
      // Códigos de estado de MercadoPago
      cc_rejected_insufficient_amount: "Fondos insuficientes en la tarjeta",
      cc_rejected_bad_filled_card_number: "Número de tarjeta inválido",
      cc_rejected_bad_filled_security_code: "Código de seguridad (CVV) inválido",
      cc_rejected_bad_filled_date: "Fecha de vencimiento inválida",
      cc_rejected_call_for_authorize: "Debes autorizar el pago con tu banco",
      cc_rejected_card_disabled: "Tarjeta deshabilitada o bloqueada",
      cc_rejected_duplicate_payment: "Pago duplicado detectado",
      cc_rejected_high_risk: "Pago rechazado por seguridad",
      cc_rejected_invalid_installments: "Número de cuotas no válido",
      cc_rejected_max_attempts: "Máximo de intentos excedido",
      cc_rejected_other_reason: "Pago rechazado por el banco",

      // Mensajes basados en titular de tarjeta de prueba
      FUND: "Fondos insuficientes en la cuenta",
      SECU: "Código de seguridad inválido",
      EXPI: "Fecha de vencimiento incorrecta",
      FORM: "Error en los datos del formulario",
      OTHE: "Pago rechazado por motivo general",
      CALL: "Requiere autorización del banco",
      DUPL: "Pago duplicado detectado",
      CARD: "Datos de tarjeta incompletos",
      INST: "Número de cuotas no permitido",
      LOCK: "Tarjeta bloqueada o deshabilitada",
      CTNA: "Tipo de tarjeta no aceptado",
      ATTE: "Demasiados intentos de PIN",
      BLAC: "Tarjeta o usuario en lista negra",
      UNSU: "Método de pago no soportado",
      TEST: "Regla de test aplicada",
    };

    // PRIORIDAD 1: Verificar si es un caso de prueba basado en el titular
    if (holderName && errorMessages[holderName]) {
      return errorMessages[holderName];
    }

    // PRIORIDAD 2: Buscar mensaje específico en códigos de error
    for (const [key, message] of Object.entries(errorMessages)) {
      if (errorCode.includes(key) || statusDetail.includes(key) || error.message?.includes(key)) {
        return message;
      }
    }

    // PRIORIDAD 3: Fallback a patrones comunes
    if (errorCode.includes("insufficient") || statusDetail.includes("insufficient"))
      return "Fondos insuficientes en la tarjeta";
    if (
      errorCode.includes("security") ||
      errorCode.includes("cvv") ||
      statusDetail.includes("security")
    )
      return "Código de seguridad inválido";
    if (errorCode.includes("card_number") || statusDetail.includes("card_number"))
      return "Número de tarjeta inválido";
    if (errorCode.includes("expir") || statusDetail.includes("expir"))
      return "Fecha de vencimiento inválida";
    if (errorCode.includes("duplicate") || statusDetail.includes("duplicate"))
      return "Pago duplicado detectado";
    if (
      errorCode.includes("call") ||
      statusDetail.includes("call") ||
      statusDetail.includes("authorize")
    )
      return "Requiere autorización del banco";

    // PRIORIDAD 4: Mensaje genérico en español
    return "Pago rechazado. Por favor, verifica los datos e inténtalo de nuevo.";
  };

  // NUEVO: Función para reintentar pago
  const handleRetryPayment = () => {
    setPaymentRejected(false);
    setRejectionReason("");
    setPaymentDetails(null);
    // Reinicializar el brick
    setIsInitialized(false);
    setTimeout(() => {
      setIsInitialized(true);
    }, 100);
  };

  // Callback cuando se envía el pago
  const onSubmit = async ({ selectedPaymentMethod: paymentMethodId, formData }: any) => {
    try {
      console.log("💳 [MercadoPagoEnhancedBrick] Procesando pago...", {
        paymentMethodId,
        timestamp: Date.now(),
        amount: amount,
        hasToken: !!formData.token,
        formData: {
          ...formData,
          token: formData.token ? `${formData.token.substring(0, 10)}...` : "AUSENTE",
        },
      });

      if (paymentMethodId === "wallet_purchase") {
        console.log("🔗 [MercadoPagoEnhancedBrick] Redirigiendo a MercadoPago Wallet...");
        return;
      }

      const paymentPayload = {
        ...formData,
        amount,
        description,
        external_reference: saleId || `sale-${Date.now()}`,
        metadata: {
          motorcycle_id: motorcycleId?.toString(),
          sale_id: saleId,
          payment_method_selected: selectedPaymentMethod,
          timestamp: Date.now(),
        },
        payer: {
          email: buyerData?.email || formData.payer?.email || "comprador@better.com",
          first_name: buyerData?.firstName || formData.payer?.first_name || "Cliente",
          last_name: buyerData?.lastName || formData.payer?.last_name || "Better",
          identification: formData.payer?.identification || {
            type: "DNI",
            number: buyerData?.dni || "12345678",
          },
        },
      };

      console.log("📤 [MercadoPagoEnhancedBrick] Enviando a backend:", {
        amount: paymentPayload.amount,
        paymentMethodId: formData.payment_method_id,
        payerEmail: paymentPayload.payer.email,
        hasToken: !!paymentPayload.token,
      });

      const response = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      });

      const paymentResult = await response.json();

      console.log("📥 [MercadoPagoEnhancedBrick] Respuesta del backend:", {
        success: paymentResult.success,
        status: paymentResult.payment?.status,
        paymentId: paymentResult.payment?.id,
        error: paymentResult.error,
      });

      if (paymentResult.success && paymentResult.payment) {
        console.log("✅ [MercadoPagoEnhancedBrick] Pago exitoso:", paymentResult.payment);

        // CORREGIDO: Solo marcar como completado si está aprobado
        const paymentStatus = paymentResult.payment.status;
        if (paymentStatus === "approved") {
          setPaymentCompleted(true);
          setPaymentDetails(paymentResult.payment);

          toast({
            title: "¡Pago Exitoso!",
            description: `Tu pago ha sido aprobado correctamente. ID: ${paymentResult.payment.id}`,
            variant: "default",
          });

          onPaymentSuccess?.(paymentResult.payment);
        } else if (paymentStatus === "pending") {
          setPaymentPending(true);
          setPaymentDetails(paymentResult.payment);

          toast({
            title: "Pago en Proceso",
            description: `Tu pago está siendo verificado. ID: ${paymentResult.payment.id}`,
            variant: "default",
          });

          onPaymentSuccess?.(paymentResult.payment);
        } else if (paymentStatus === "rejected") {
          // NUEVO: Manejar rechazo con UI específica
          const spanishMessage = getSpanishErrorMessage(paymentResult.payment);
          setPaymentRejected(true);
          setRejectionReason(spanishMessage);
          setPaymentDetails(paymentResult.payment);

          toast({
            title: "Pago Rechazado",
            description: spanishMessage,
            variant: "destructive",
          });

          // No llamar onPaymentError para rechazos esperados
          console.log(
            "❌ [MercadoPagoEnhancedBrick] Pago rechazado (esperado):",
            paymentResult.payment,
          );
        } else {
          throw new Error(`Estado de pago inesperado: ${paymentStatus}`);
        }
      } else {
        console.error("❌ [MercadoPagoEnhancedBrick] Error en el resultado:", paymentResult);

        // Determinar el tipo de error y mostrar mensaje específico
        const spanishMessage = getSpanishErrorMessage(paymentResult);

        toast({
          title: "Error en el Pago",
          description: spanishMessage,
          variant: "destructive",
        });

        throw new Error(spanishMessage);
      }
    } catch (error) {
      console.error("❌ [MercadoPagoEnhancedBrick] Error al procesar pago:", error);
      const spanishMessage = getSpanishErrorMessage(error);

      toast({
        title: "Error en el Pago",
        description: spanishMessage,
        variant: "destructive",
      });

      onPaymentError?.(error);
    }
  };

  const onError = async (error: any) => {
    console.error("❌ [MercadoPagoEnhancedBrick] Error del Brick:", error);
    toast({
      title: "Error del Componente de Pago",
      description: "Ocurrió un error en el formulario de pago. Por favor, inténtelo nuevamente.",
      variant: "destructive",
    });
    onPaymentError?.(error);
  };

  const onReady = async () => {
    console.log("✅ [MercadoPagoEnhancedBrick] Brick listo para usar");
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

  if (!isInitialized || !publicKey) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Pagar con MercadoPago
          <Badge variant="secondary" className="ml-auto">
            ${amount.toLocaleString("es-AR")}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Pago seguro procesado por MercadoPago</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NUEVO: Mostrar estado de pago completado */}
        {paymentCompleted ? (
          <div className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">¡Pago Exitoso!</h3>
              <p className="text-green-700 mb-2">Tu pago ha sido aprobado correctamente</p>
              {paymentDetails?.id && (
                <p className="text-sm text-muted-foreground">ID del pago: {paymentDetails.id}</p>
              )}
              <Badge variant="default" className="mt-2 bg-green-500">
                Estado: APROBADO
              </Badge>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 ¡Gracias por tu compra! El pago se ha registrado correctamente.
              </p>
            </div>
          </div>
        ) : paymentPending ? (
          <div className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-yellow-800 mb-2">Pago en Proceso</h3>
              <p className="text-yellow-700 mb-2">Tu pago está siendo verificado</p>
              {paymentDetails?.id && (
                <p className="text-sm text-muted-foreground">ID del pago: {paymentDetails.id}</p>
              )}
              <Badge variant="secondary" className="mt-2 bg-yellow-500 text-white">
                Estado: PENDIENTE
              </Badge>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⏳ Estamos procesando tu pago. Te notificaremos cuando esté confirmado.
              </p>
            </div>
          </div>
        ) : (
          /* Payment Brick - Solo mostrar si no está pagado y no rechazado */
          !paymentRejected && (
            <div className="mercadopago-enhanced-brick-container">
              <Payment
                initialization={getPaymentInitialization()}
                customization={customization}
                onSubmit={onSubmit}
                onReady={onReady}
                onError={onError}
              />
            </div>
          )
        )}

        {/* NUEVO: UI para estado de rechazo */}
        {paymentRejected && (
          <div className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">Pago Rechazado</h3>
              <p className="text-red-700 mb-2">{rejectionReason}</p>
              {paymentDetails?.id && (
                <p className="text-sm text-muted-foreground">ID del intento: {paymentDetails.id}</p>
              )}
              <Badge variant="destructive" className="mt-2">
                Estado: RECHAZADO
              </Badge>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
                <p className="text-sm text-red-800">
                  ❌ {rejectionReason}. Verifica los datos de tu tarjeta e inténtalo nuevamente.
                </p>
              </div>
              <Button
                onClick={handleRetryPayment}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                🔄 Volver a Intentar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

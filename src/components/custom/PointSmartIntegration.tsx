"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, Loader2, Smartphone, Wifi, WifiOff, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface PointSmartIntegrationProps {
  amount: number;
  description: string;
  saleId?: string;
  motorcycleId?: number;
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentError?: (error: any) => void;
}

interface PointDevice {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "BUSY";
  battery?: number;
}

export default function PointSmartIntegration({
  amount,
  description,
  saleId,
  motorcycleId,
  onPaymentSuccess,
  onPaymentError,
}: PointSmartIntegrationProps) {
  const [devices, setDevices] = useState<PointDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<PointDevice | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "creating" | "waiting" | "processing" | "completed" | "failed"
  >("idle");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar dispositivos Point disponibles
  useEffect(() => {
    loadPointDevices();
  }, []);

  const loadPointDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mercadopago/point/devices");

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);

        // Auto-seleccionar el primer dispositivo online
        const onlineDevice = data.devices?.find((d: PointDevice) => d.status === "ONLINE");
        if (onlineDevice) {
          setSelectedDevice(onlineDevice);
        }
      } else {
        setError("No se pudieron cargar los dispositivos Point");
      }
    } catch (error) {
      console.error("Error cargando dispositivos Point:", error);
      setError("Error de conexión con los dispositivos Point");
    } finally {
      setLoading(false);
    }
  };

  // Crear intención de pago en Point Smart
  const createPointPayment = async () => {
    if (!selectedDevice) {
      toast({
        title: "Error",
        description: "Selecciona un dispositivo Point Smart",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaymentStatus("creating");
      setError(null);

      console.log("🏪 [PointSmart] Creando intención de pago:", {
        amount,
        description,
        deviceId: selectedDevice.id,
      });

      const response = await fetch("/api/mercadopago/point/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
          device_id: selectedDevice.id,
          external_reference: saleId || `sale-${Date.now()}`,
          metadata: {
            motorcycle_id: motorcycleId?.toString(),
            sale_id: saleId,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // ✅ Actualizado para Orders API - usar order_id en lugar de payment_intent_id
        setPaymentIntentId(data.order_id);
        setPaymentStatus("waiting");

        // 🆕 Capturar action_id si está disponible
        if (data.action_id) {
          setActionId(data.action_id);
          console.log("🎯 [PointSmart] Action ID capturado:", data.action_id);
        }

        toast({
          title: "¡Listo para cobrar!",
          description: `Pasa la tarjeta en el Point Smart "${selectedDevice.name}"`,
          variant: "default",
        });

        console.log("✅ [PointSmart] Order creada exitosamente:", {
          order_id: data.order_id,
          payment_id: data.payment_id,
          action_id: data.action_id,
          terminal_id: data.terminal_id,
          amount: data.amount,
        });

        // Comenzar a monitorear el estado de la order Y las acciones
        monitorPaymentStatus(data.order_id);
        if (data.action_id) {
          monitorActionStatus(data.action_id);
        }
      } else {
        throw new Error(data.error || "Error creando order");
      }
    } catch (error) {
      console.error("❌ [PointSmart] Error:", error);
      setPaymentStatus("failed");
      setError(error instanceof Error ? error.message : "Error desconocido");

      toast({
        title: "Error",
        description: "No se pudo conectar con el Point Smart",
        variant: "destructive",
      });
    }
  };

  // Monitorear estado del pago
  const monitorPaymentStatus = async (intentId: string) => {
    const maxAttempts = 60; // 5 minutos máximo
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/mercadopago/point/payment-status/${intentId}`);
        const data = await response.json();

        console.log(`🔍 [PointSmart] Estado de la order (intento ${attempts + 1}):`, {
          order_id: data.order_id,
          order_status: data.order_status,
          payment_id: data.payment_id,
          payment_status: data.payment_status,
          status: data.status,
        });

        if (data.status === "FINISHED") {
          setPaymentStatus("completed");

          toast({
            title: "¡Pago Exitoso!",
            description: `Pago aprobado por $${amount}`,
            variant: "default",
          });

          // Pasar toda la información de la order y el payment al callback
          onPaymentSuccess?.({
            order_id: data.order_id,
            payment_id: data.payment_id,
            total_amount: data.total_amount,
            paid_amount: data.paid_amount,
            order_status: data.order_status,
            payment_status: data.payment_status,
          });
          return;
        }
        if (data.status === "CANCELED" || data.status === "ERROR") {
          setPaymentStatus("failed");
          setError("Pago cancelado o error en el dispositivo");

          toast({
            title: "Pago Cancelado",
            description: "El pago fue cancelado en el dispositivo",
            variant: "destructive",
          });
          return;
        }
        if (data.status === "PROCESSING") {
          setPaymentStatus("processing");
        }

        // Continuar monitoreando si está pendiente
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Verificar cada 5 segundos
        } else {
          setPaymentStatus("failed");
          setError("Tiempo de espera agotado");

          toast({
            title: "Tiempo Agotado",
            description: "El pago tardó demasiado en procesarse",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error monitoreando pago:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          setPaymentStatus("failed");
          setError("Error de conexión");
        }
      }
    };

    checkStatus();
  };

  // 🆕 Monitorear estado de las acciones
  const monitorActionStatus = async (actionId: string) => {
    const maxAttempts = 60; // 5 minutos máximo
    let attempts = 0;

    const checkActionStatus = async () => {
      try {
        const response = await fetch(`/api/mercadopago/point/action-status/${actionId}`, {
          headers: {
            "x-debug-key": "DEBUG_KEY",
          },
        });
        const data = await response.json();

        console.log(`🎯 [PointSmart] Estado de la acción (intento ${attempts + 1}):`, {
          action_id: data.action_id,
          action_type: data.action_type,
          action_status: data.action_status,
          terminal_id: data.terminal_id,
        });

        // Actualizar estado de la acción en la UI
        setActionStatus(data.action_status);

        // Estados finales de acción
        if (data.action_status === "finished") {
          console.log("✅ [PointSmart] Acción completada exitosamente");
          return;
        }
        if (data.action_status === "canceled" || data.action_status === "error") {
          console.log("❌ [PointSmart] Acción cancelada o con error");
          return;
        }

        // Continuar monitoreando
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkActionStatus, 3000); // Verificar cada 3 segundos (más rápido que el pago)
        } else {
          console.log("⏰ [PointSmart] Timeout monitoreando acción");
        }
      } catch (error) {
        console.error("Error monitoreando acción:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkActionStatus, 3000);
        }
      }
    };

    checkActionStatus();
  };

  // Cancelar order/pago
  const cancelPayment = async () => {
    if (!paymentIntentId) return;

    try {
      // ✅ Actualizado para Orders API - usar endpoint correcto de cancelación
      const response = await fetch(`/api/mercadopago/point/cancel/${paymentIntentId}`, {
        method: "POST",
        headers: {
          "x-debug-key": "DEBUG_KEY",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentStatus("idle");
        setPaymentIntentId(null);
        setActionId(null);
        setActionStatus(null);
        setError(null);

        toast({
          title: "Order Cancelada",
          description: "La transacción ha sido cancelada exitosamente",
          variant: "default",
        });
      } else {
        console.error("Error cancelando order:", data);
        toast({
          title: "Error",
          description: "No se pudo cancelar la order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelando order:", error);
      toast({
        title: "Error",
        description: "Error de comunicación al cancelar",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "completed":
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case "failed":
        return <XCircle className="w-8 h-8 text-red-600" />;
      case "creating":
      case "waiting":
      case "processing":
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      default:
        return <CreditCard className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case "creating":
        return "Preparando el dispositivo...";
      case "waiting":
        return "Esperando que pases la tarjeta...";
      case "processing":
        return "Procesando el pago...";
      case "completed":
        return "¡Pago exitoso!";
      case "failed":
        return error || "Error en el pago";
      default:
        return "Listo para procesar el pago";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Pagar con Point Smart
          <Badge variant="secondary" className="ml-auto">
            ${amount.toLocaleString("es-AR")}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pago presencial con tarjeta en dispositivo Point Smart
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selección de dispositivo */}
        {devices.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Dispositivos Point disponibles:</h4>
            <div className="grid gap-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedDevice?.id === device.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  onClick={() => setSelectedDevice(device)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDevice(device);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Seleccionar dispositivo ${device.name}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {device.status === "ONLINE" ? (
                        <Wifi className="w-4 h-4 text-green-600" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium">{device.name}</span>
                    </div>
                    <Badge
                      variant={device.status === "ONLINE" ? "default" : "secondary"}
                      className={
                        device.status === "ONLINE"
                          ? "bg-green-500"
                          : device.status === "BUSY"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                      }
                    >
                      {device.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado del pago */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-50">
              {getStatusIcon()}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">{getStatusMessage()}</h3>

            {paymentStatus === "waiting" && (
              <p className="text-sm text-muted-foreground">
                El cliente puede pasar su tarjeta en el Point Smart "{selectedDevice?.name}"
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-center gap-3">
            {paymentStatus === "idle" && (
              <Button
                onClick={createPointPayment}
                disabled={!selectedDevice || selectedDevice.status !== "ONLINE"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Iniciar Pago en Point
              </Button>
            )}

            {["waiting", "processing"].includes(paymentStatus) && (
              <Button
                onClick={cancelPayment}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Cancelar Pago
              </Button>
            )}

            {paymentStatus === "failed" && (
              <Button
                onClick={() => {
                  setPaymentStatus("idle");
                  setError(null);
                  setPaymentIntentId(null);
                  setActionId(null);
                  setActionStatus(null);
                }}
                variant="outline"
              >
                🔄 Intentar de Nuevo
              </Button>
            )}
          </div>
        </div>

        {/* Información adicional */}
        {paymentStatus === "waiting" && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <strong>💳 Esperando pago de:</strong> ${amount.toLocaleString("es-AR")}
              </p>
              <p>
                <strong>📝 Concepto:</strong> {description}
              </p>
              <p>
                <strong>📱 Dispositivo:</strong> {selectedDevice?.name}
              </p>
              {paymentIntentId && (
                <p>
                  <strong>🆔 Order ID:</strong> {paymentIntentId}
                </p>
              )}
              {actionId && (
                <p>
                  <strong>🎯 Action ID:</strong> {actionId}
                </p>
              )}
              {actionStatus && (
                <p>
                  <strong>📡 Estado Acción:</strong>
                  <span className={`ml-1 font-semibold ${actionStatus === "finished" ? "text-green-700" :
                    actionStatus === "processing" ? "text-blue-700" :
                      actionStatus === "on_terminal" ? "text-yellow-700" :
                        actionStatus === "created" ? "text-purple-700" :
                          "text-red-700"
                    }`}>
                    {actionStatus.toUpperCase()}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">❌ {error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

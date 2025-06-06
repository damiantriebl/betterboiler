"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface MercadoPagoAccount {
  id: string;
  email: string;
  connected: boolean;
  webhookUrl: string;
  notificationUrl: string;
}

interface ManageMercadoPagoProps {
  organizationId: string;
}

export default function ManageMercadoPago({ organizationId }: ManageMercadoPagoProps) {
  const [account, setAccount] = useState<MercadoPagoAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [hasValidPublicKey, setHasValidPublicKey] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    loadMercadoPagoStatus();

    // Escuchar mensajes de ventanas popup OAuth
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "mp_oauth_success") {
        toast.success("🎉 OAuth Completado - MercadoPago conectado exitosamente");
        // Recargar el estado después de un OAuth exitoso
        setTimeout(() => {
          loadMercadoPagoStatus();
        }, 2000);
      } else if (event.data.type === "mp_oauth_error") {
        toast.error(
          `Error OAuth: ${event.data.error}${event.data.detail ? ` - ${event.data.detail}` : ""}`,
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const loadMercadoPagoStatus = async () => {
    try {
      setLoading(true);
      setConfigError(null); // Limpiar errores previos
      const response = await fetch("/api/configuration/mercadopago/status");

      if (response.ok) {
        const data = await response.json();

        // FIXED: Manejar caso cuando hay error de organización
        if (data.error && data.details) {
          console.warn("⚠️ [ManageMercadoPago] Error de configuración:", data.error, data.details);

          // Establecer error de configuración en lugar de falla crítica
          setConfigError(data.details || data.error);
          setAccount(null);
          setHasValidPublicKey(false);
          return;
        }

        // Mapear respuesta del endpoint de status al formato de account
        if (data.organizationConnected && data.oauthEmail) {
          setAccount({
            id: organizationId, // Usar organizationId como ID
            email: data.oauthEmail,
            connected: true,
            webhookUrl: `${window.location.origin}/api/webhooks/mercadopago`,
            notificationUrl: `${window.location.origin}/api/webhooks/mercadopago`,
          });
        } else {
          setAccount(null);
        }

        // NUEVO: Verificar si existe public key válida
        const hasValidKey =
          data.hasPublicKey &&
          data.publicKey &&
          data.publicKey !== "PLACEHOLDER_TOKEN" &&
          (data.publicKey.startsWith("TEST-") || data.publicKey.startsWith("APP_USR-"));

        setHasValidPublicKey(hasValidKey);
        console.log("🔑 [ManageMercadoPago] Public Key status:", {
          hasPublicKey: data.hasPublicKey,
          publicKeyPreview: data.publicKey ? `${data.publicKey.substring(0, 15)}...` : "NO_KEY",
          isValid: hasValidKey,
        });
      } else {
        // FIXED: Mejor manejo de errores HTTP
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        console.error("❌ [ManageMercadoPago] Error HTTP:", response.status, errorData);

        // Establecer error de configuración para errores esperados
        if (response.status === 401 || response.status === 403) {
          setConfigError("No tienes permisos para acceder a la configuración de MercadoPago");
        } else {
          throw new Error(errorData.error || `Error HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error("❌ [ManageMercadoPago] Error cargando estado:", error);
      // Solo mostrar toast para errores inesperados, no para problemas de sesión
      if (error instanceof Error && !error.message.includes("organización")) {
        console.error("Error cargando estado de Mercado Pago:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const connectMercadoPago = async () => {
    try {
      setConnecting(true);

      // Iniciar el flujo OAuth de Mercado Pago (sin parámetros adicionales)
      const response = await fetch("/api/configuration/mercadopago/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("🔗 Abriendo OAuth de MercadoPago:", data);

        // Abrir OAuth en nueva ventana/pestaña
        const authWindow = window.open(
          data.authUrl,
          "mercadopago-oauth-manage",
          "width=600,height=700,scrollbars=yes,resizable=yes",
        );

        if (authWindow) {
          toast.success(
            "🔗 OAuth Iniciado - Se abrió MercadoPago en nueva ventana. Completa la autorización.",
          );
        } else {
          // Fallback si el popup fue bloqueado
          window.location.href = data.authUrl;
        }
      } else {
        toast.error(data.error || "Error al conectar con Mercado Pago");
      }
    } catch (error) {
      console.error("Error conectando con Mercado Pago:", error);
      toast.error("Error al conectar con Mercado Pago");
    } finally {
      setConnecting(false);
    }
  };

  // NUEVO: Función para configurar método de pago
  const setupPaymentMethod = async () => {
    try {
      setConnecting(true);

      const response = await fetch("/api/configuration/mercadopago/setup-payment-method", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`✅ ${data.message}`);

        // Recargar el estado después de configurar el método de pago
        setTimeout(() => {
          loadMercadoPagoStatus();
          // También recargar la página para que aparezca en la lista de métodos de pago
          window.location.reload();
        }, 1000);
      } else {
        toast.error(`❌ ${data.error || "Error configurando método de pago"}`);
      }
    } catch (error) {
      console.error("Error configurando método de pago:", error);
      toast.error("Error al configurar método de pago");
    } finally {
      setConnecting(false);
    }
  };

  // NUEVO: Función para auto-detectar public key
  const autoDetectPublicKey = async () => {
    try {
      setAutoDetecting(true);

      const response = await fetch("/api/configuration/mercadopago/quick-auto-detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`✅ ${data.message}: ${data.publicKey || "Configurada"}`);

        // Recargar el estado después de auto-detección exitosa
        setTimeout(() => {
          loadMercadoPagoStatus();
        }, 1000);
      } else {
        toast.error(`❌ ${data.error || "Auto-detección falló"}`);

        // Sugerir acción específica basada en el resultado
        if (data.action === "manual_config") {
          setTimeout(() => {
            toast.info("💡 Intenta configurar manualmente");
          }, 2000);
        } else if (data.action === "connect_oauth" || data.action === "reconnect_oauth") {
          setTimeout(() => {
            toast.info("🔗 Necesitas conectar OAuth primero", {
              action: {
                label: "Conectar",
                onClick: () => connectMercadoPago(),
              },
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Error en auto-detección:", error);
      toast.error("Error al ejecutar auto-detección");
    } finally {
      setAutoDetecting(false);
    }
  };

  const disconnectMercadoPago = async () => {
    try {
      const response = await fetch("/api/configuration/mercadopago/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setAccount(null);
        toast.success("Mercado Pago desconectado exitosamente");
        await loadMercadoPagoStatus(); // Recargar estado
      } else {
        toast.error("Error al desconectar Mercado Pago");
      }
    } catch (error) {
      console.error("Error desconectando Mercado Pago:", error);
      toast.error("Error al desconectar Mercado Pago");
    }
  };

  const refreshConnection = async () => {
    try {
      setRefreshing(true);
      await loadMercadoPagoStatus();
      toast.success("Estado actualizado");
    } catch (error) {
      toast.error("Error al actualizar estado");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando configuración de Mercado Pago...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* NUEVO: Mostrar errores de configuración */}
      {configError && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Problema de Configuración
            </CardTitle>
            <CardDescription className="text-orange-700">{configError}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-orange-800">Posibles soluciones:</p>
              <ul className="text-sm text-orange-700 space-y-1 ml-4">
                <li>• Asegúrate de estar logueado con una cuenta válida</li>
                <li>• Verifica que tengas permisos en esta organización</li>
                <li>• Contacta al administrador si el problema persiste</li>
              </ul>
              <div className="flex gap-2">
                <Button
                  onClick={refreshConnection}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reintentar
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  Recargar Página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Mercado Pago
                {account?.connected ? (
                  <Badge variant="default" className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    No conectado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Conecta tu cuenta de Mercado Pago para procesar pagos automáticamente
              </CardDescription>
            </div>
            <Button onClick={refreshConnection} variant="outline" size="sm" disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FIXED: Deshabilitar funcionalidad cuando hay error de configuración */}
          {configError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No se puede acceder a la configuración de MercadoPago
              </p>
              <p className="text-sm text-muted-foreground">
                Soluciona el problema de configuración arriba para continuar
              </p>
            </div>
          ) : !account?.connected ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No tienes una cuenta de Mercado Pago conectada
              </p>
              <div className="flex flex-col gap-3 items-center">
                <Button
                  onClick={connectMercadoPago}
                  disabled={connecting}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Conectar con Mercado Pago
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground">
                  Si el método de pago no aparece en ventas, primero:
                </div>

                <Button
                  onClick={setupPaymentMethod}
                  disabled={connecting}
                  variant="outline"
                  size="sm"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Configurar Método de Pago
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cuenta conectada</p>
                  <p className="text-sm text-muted-foreground">{account.email}</p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Activo
                </Badge>
              </div>

              {!hasValidPublicKey && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">Configuración incompleta</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Detectamos que falta configurar algunos detalles
                      </p>
                    </div>
                    <Button
                      onClick={autoDetectPublicKey}
                      disabled={autoDetecting}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {autoDetecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Configurando...
                        </>
                      ) : (
                        "Completar configuración"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={disconnectMercadoPago}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Desconectar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

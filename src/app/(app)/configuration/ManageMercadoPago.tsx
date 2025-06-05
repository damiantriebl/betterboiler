"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
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
            toast.info("💡 Intenta configurar manualmente", {
              action: {
                label: "Ir a Debug",
                onClick: () => window.open("/debug/mercadopago-fix", "_blank"),
              },
            });
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

  // NUEVO: Función para probar pago en producción
  const testProductionPayment = async () => {
    try {
      setConnecting(true);

      // Mostrar advertencia antes de proceder
      const confirmResult = window.confirm(
        "⚠️ ADVERTENCIA: Esto creará un pago REAL con dinero real.\n\n" +
          "• Se usará tu tarjeta real\n" +
          "• Se cobrará $10 ARS\n" +
          "• El dinero se descontará realmente\n\n" +
          "¿Estás seguro de que quieres continuar?",
      );

      if (!confirmResult) {
        toast.info("Test de producción cancelado");
        return;
      }

      console.log("🏭 Iniciando test de pago en PRODUCCIÓN...");

      // Simular datos de una tarjeta real para el test
      const testData = {
        transaction_amount: 10, // Monto pequeño para test
        description: "Test de pago en PRODUCCIÓN - Better Motos",
        payment_method_id: "visa",
        payer: {
          email: "test@bettermotos.com",
          first_name: "Cliente",
          last_name: "Test",
          identification: {
            type: "DNI",
            number: "20123456789",
          },
        },
        installments: 1,
        // NOTA: En un test real necesitarías un token válido de tarjeta
        token: "fake_token_for_testing", // Esto fallará intencionalmente para mostrar el flujo
      };

      const response = await fetch("/api/payments/mercadopago/test-production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`✅ ${data.message}`);

        // Mostrar información detallada del pago real
        setTimeout(() => {
          toast.info(`💰 Pago ID: ${data.payment.id} - Estado: ${data.payment.status}`, {
            duration: 10000,
            action: {
              label: "Ver Detalles",
              onClick: () => window.open(`/debug/payment-details?id=${data.payment.id}`, "_blank"),
            },
          });
        }, 2000);
      } else {
        // Mostrar error específico para producción
        if (data.error?.includes("credenciales de PRODUCCIÓN")) {
          toast.error("❌ Necesitas credenciales de PRODUCCIÓN (APP_USR-)", {
            action: {
              label: "Configurar",
              onClick: () => window.open("/debug/production-only", "_blank"),
            },
          });
        } else {
          toast.error(`❌ ${data.error || "Error en test de producción"}`);

          // Mostrar recomendaciones si están disponibles
          if (data.recommendations) {
            setTimeout(() => {
              toast.info(
                "💡 Para un test completo, necesitas usar MercadoPago Brick con tarjeta real",
                {
                  duration: 8000,
                },
              );
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error("Error en test de producción:", error);
      toast.error("Error al probar pago de producción");
    } finally {
      setConnecting(false);
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
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
              <div>
                <Label>Cuenta conectada</Label>
                <p className="text-sm text-muted-foreground">{account.email}</p>
                <p className="text-xs text-muted-foreground">ID: {account.id}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Auto-Detectar Public Key</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {hasValidPublicKey
                        ? "Public key ya configurada correctamente"
                        : "Si el checkout no funciona, intenta detectar automáticamente la public key"}
                    </p>
                  </div>
                  {!hasValidPublicKey && (
                    <Button
                      onClick={autoDetectPublicKey}
                      disabled={autoDetecting}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      {autoDetecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Detectando...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Auto-Detectar
                        </>
                      )}
                    </Button>
                  )}
                  {hasValidPublicKey && (
                    <Badge variant="default" className="bg-green-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={account.webhookUrl} readOnly className="font-mono text-xs" />
                    <Button
                      onClick={() => copyToClipboard(account.webhookUrl, "Webhook URL")}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configura esta URL en tu aplicación de Mercado Pago
                  </p>
                </div>

                <div>
                  <Label>Notification URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={account.notificationUrl} readOnly className="font-mono text-xs" />
                    <Button
                      onClick={() => copyToClipboard(account.notificationUrl, "Notification URL")}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={testProductionPayment} variant="outline" size="sm">
                  Probar Pago en Producción
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={disconnectMercadoPago} variant="destructive" size="sm">
                  Desconectar Mercado Pago
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {account?.connected && !configError && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Configuración en Mercado Pago</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>1. Ve a tu panel de desarrolladores de Mercado Pago</p>
              <p>2. Selecciona tu aplicación</p>
              <p>3. Configura las URLs de webhook en la sección de notificaciones</p>
              <p>4. Los pagos se procesarán automáticamente</p>
            </div>
            <div className="mt-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://www.mercadopago.com.ar/developers/panel/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  Ir al Panel de Desarrolladores
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

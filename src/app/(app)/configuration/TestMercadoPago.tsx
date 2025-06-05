"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TestMercadoPagoProps {
  organizationId: string;
}

interface ConfigStatus {
  hasGlobalAccessToken: boolean;
  hasGlobalPublicKey: boolean;
  hasOAuthConfig: boolean;
  hasOAuthAccessToken: boolean;
  oauthEmail: string | null;
  environment: "sandbox" | "production" | "unknown";
  integrationMode: "oauth" | "direct" | "incomplete";
  organizationConnected: boolean;
  canConnectVendors: boolean;
}

export default function TestMercadoPago({ organizationId }: TestMercadoPagoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfigStatus();

    // Escuchar mensajes de ventanas popup OAuth
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "mp_oauth_success") {
        toast({
          title: "🎉 OAuth Completado",
          description: "MercadoPago conectado exitosamente. Actualizando configuración...",
          duration: 5000,
        });
        // Recargar el estado después de un OAuth exitoso
        setTimeout(() => {
          loadConfigStatus();
        }, 2000);
      } else if (event.data.type === "mp_oauth_error") {
        setError(
          `Error OAuth: ${event.data.error}${event.data.detail ? ` - ${event.data.detail}` : ""}`,
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast]);

  const loadConfigStatus = async () => {
    try {
      const response = await fetch("/api/configuration/mercadopago/status");
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data);
      }
    } catch (error) {
      console.log("Error verificando configuración:", error);
    }
  };

  const testGlobalCredentials = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDebugInfo(null);

    try {
      console.log("🔧 Testeando credenciales globales...");

      const response = await fetch("/api/configuration/mercadopago/validate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("✅ Credenciales globales válidas");
        setDebugInfo(data);
        toast({
          title: "Credenciales globales OK",
          description: `Aplicación conectada como: ${data.user?.email || "Usuario válido"}`,
        });
      } else {
        setError(`❌ Error: ${data.error || "Credenciales inválidas"}`);
        setDebugInfo(data);
      }
    } catch (error) {
      console.error("💥 Error validando credenciales globales:", error);
      setError(`💥 Error de red: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectPayment = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("🧪 Testeando pago directo...");

      const response = await fetch("/api/payments/mercadopago/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_amount: 100,
          description: "Test de Pago Directo - Mercado Pago",
          payer: {
            email: "test_user_1234@testuser.com",
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ Pago de prueba creado: ID ${data.payment?.id}`);
        setDebugInfo(data);
        toast({
          title: "Test de pago exitoso",
          description: `Pago ${data.payment?.status} por $${data.payment?.amount}`,
        });
      } else {
        setError(`❌ Error en pago: ${data.error}`);
        setDebugInfo(data);
      }
    } catch (error) {
      console.error("💥 Error en test de pago:", error);
      setError(`💥 Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const connectToMercadoPago = async () => {
    if (!configStatus?.canConnectVendors) {
      setError("No se pueden conectar organizaciones. Verifica la configuración global.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
          "mercadopago-oauth",
          "width=600,height=700,scrollbars=yes,resizable=yes",
        );

        if (authWindow) {
          toast({
            title: "🔗 OAuth Iniciado",
            description: "Se abrió MercadoPago en nueva ventana. Completa la autorización.",
            duration: 8000,
          });
        } else {
          // Fallback si el popup fue bloqueado
          window.location.href = data.authUrl;
        }
      } else {
        setError(data.error || "Error iniciando OAuth");
      }
    } catch (error) {
      setError(
        `Error conectando con MercadoPago: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const forceLogoutAndReconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Solo hacer disconnect - el usuario debe reconectar manualmente
      const disconnectResponse = await fetch("/api/configuration/mercadopago/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!disconnectResponse.ok) {
        throw new Error("Error desconectando MercadoPago");
      }

      toast({
        title: "🔌 Desconectado Exitosamente",
        description:
          "Organización desconectada de MercadoPago. Ahora puedes conectar una cuenta diferente.",
        duration: 5000,
      });

      // Recargar estado para mostrar botón de conexión
      await loadConfigStatus();
    } catch (error) {
      setError(
        `Error desconectando: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const manualLogoutInstructions = () => {
    const instructions = [
      "🌐 Logout desde MercadoPago:",
      "1. Ir a mercadopago.com → Cerrar sesión",
      "2. Esperar 30 segundos y reconectar",
      "",
      "🔒 Navegador Incógnito:",
      "1. Abrir ventana incógnita/privada",
      "2. Ir a tu app y conectar desde ahí",
      "",
      "🧹 Limpiar Cookies:",
      "1. DevTools (F12) → Application",
      "2. Storage → Cookies → mercadopago.com",
      "3. Eliminar todas las cookies de MP",
      "",
      "⚡ Solución Rápida:",
      "1. Ctrl+Shift+Del → Cookies del último día",
      "2. Reiniciar navegador y conectar",
      "",
      `🎯 URL Callback: ${window.location.origin}/api/configuration/mercadopago/callback`,
    ].join("\n");

    toast({
      title: "🔧 Soluciones para Logout de MercadoPago",
      description: instructions,
      duration: 15000,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado al portapapeles",
    });
  };

  const getStatusBadge = (hasItem: boolean, label: string, isOptional = false) => (
    <Badge
      variant={hasItem ? "default" : isOptional ? "secondary" : "destructive"}
      className="mr-2 mb-2"
    >
      {hasItem ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : (
        <AlertCircle className="w-3 h-3 mr-1" />
      )}
      {label}
    </Badge>
  );

  const getIntegrationModeInfo = () => {
    if (!configStatus) return null;

    switch (configStatus.integrationMode) {
      case "direct":
        return {
          title: "💳 Modo: Pagos Directos",
          description: "Tu aplicación puede procesar pagos usando credenciales globales",
          color: "bg-green-50 border-green-200",
          available: ["Procesar pagos directos", "Crear órdenes", "Webhooks", "Testing completo"],
          next: configStatus.organizationConnected
            ? []
            : ["Conectar organizaciones para marketplace"],
        };
      case "oauth":
        return {
          title: "🏢 Modo: Marketplace Completo",
          description: "Funcionalidad completa: pagos directos + organizaciones conectadas",
          color: "bg-blue-50 border-blue-200",
          available: [
            "Todo lo de pagos directos",
            "Organizaciones conectadas",
            "Marketplace completo",
          ],
          next: [],
        };
      default:
        return {
          title: "⚠️ Configuración Incompleta",
          description: "Faltan credenciales globales para funcionar",
          color: "bg-yellow-50 border-yellow-200",
          available: ["Configurar credenciales globales"],
          next: ["Agregar ACCESS_TOKEN y PUBLIC_KEY al .env"],
        };
    }
  };

  const modeInfo = getIntegrationModeInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            🧪 Test Mercado Pago
            <Badge variant="outline">
              {configStatus?.environment === "sandbox"
                ? "Sandbox"
                : configStatus?.environment === "production"
                  ? "Production"
                  : "Sin configurar"}
            </Badge>
          </div>
          <Button
            onClick={loadConfigStatus}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Actualizar estado"
          >
            🔄
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Modo de integración */}
        {modeInfo && (
          <div className={`p-4 rounded-lg border ${modeInfo.color}`}>
            <h4 className="font-medium mb-2">{modeInfo.title}</h4>
            <p className="text-sm text-muted-foreground mb-3">{modeInfo.description}</p>
            <div className="text-sm">
              <p className="font-medium mb-1">✅ Disponible:</p>
              <ul className="list-disc list-inside space-y-1 mb-3">
                {modeInfo.available.map((item, itemIndex) => (
                  <li key={`available-${itemIndex}-${item.substring(0, 20)}`} className="text-xs">
                    {item}
                  </li>
                ))}
              </ul>
              {modeInfo.next.length > 0 && (
                <div>
                  <p className="font-medium mb-1">🎯 Siguiente paso:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {modeInfo.next.map((item, nextIndex) => (
                      <li
                        key={`next-${nextIndex}-${item.substring(0, 20)}`}
                        className="text-xs text-blue-600"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estado de configuración */}
        {configStatus && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">📋 Estado de Credenciales</h4>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2">🌐 Credenciales Globales (.env):</p>
              <div className="flex flex-wrap">
                {getStatusBadge(configStatus.hasGlobalAccessToken, "ACCESS_TOKEN")}
                {getStatusBadge(configStatus.hasGlobalPublicKey, "PUBLIC_KEY")}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">🏢 Organización Conectada (BD):</p>
              <div className="flex flex-wrap">
                {getStatusBadge(configStatus.hasOAuthConfig, "OAuth Configurado", true)}
                {configStatus.oauthEmail && (
                  <Badge variant="default" className="mr-2 mb-2">
                    <Building className="w-3 h-3 mr-1" />
                    {configStatus.oauthEmail}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-2">
              <Badge variant={configStatus.environment === "sandbox" ? "secondary" : "outline"}>
                Entorno: {configStatus.environment}
              </Badge>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Organización ID: <code>{organizationId}</code>
        </div>

        {/* Sección OAuth */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">🏢 Estado OAuth</h4>
            <div className="flex items-center gap-2">
              {configStatus?.organizationConnected ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-600">No conectado</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={loadConfigStatus} disabled={loading}>
                🔄
              </Button>
            </div>
          </div>

          {configStatus?.organizationConnected ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-green-700">
                ✅ Esta organización está conectada a MercadoPago y puede procesar pagos como
                marketplace.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceLogoutAndReconnect}
                  disabled={loading}
                >
                  🔌 Desconectar
                </Button>
                <Button variant="outline" size="sm" onClick={manualLogoutInstructions}>
                  🔧 Ayuda Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
              <div className="space-y-2">
                <p className="text-sm text-orange-700">
                  <strong>⚠️ Siguiente paso:</strong> Conectar esta organización a MercadoPago
                </p>
                <ul className="text-sm text-orange-600 list-disc list-inside space-y-1">
                  <li>Conectar organizaciones para marketplace</li>
                  <li>Procesar pagos de terceros</li>
                  <li>Comisiones automáticas</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={connectToMercadoPago}
                  disabled={loading || !configStatus?.canConnectVendors}
                  size="sm"
                >
                  {loading ? "Conectando..." : "🔗 Conectar Organización"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceLogoutAndReconnect}
                  disabled={loading}
                >
                  🔌 Desconectar
                </Button>

                <Button variant="outline" size="sm" onClick={manualLogoutInstructions}>
                  🔧 Ayuda Logout
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción según configuración */}
        {configStatus && (
          <div className="flex flex-wrap gap-3">
            {configStatus.hasGlobalAccessToken && configStatus.hasGlobalPublicKey && (
              <>
                <Button
                  onClick={testGlobalCredentials}
                  disabled={loading}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  1. Test Credenciales
                </Button>

                <Button
                  onClick={testDirectPayment}
                  disabled={loading}
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  2. Test Pago Directo
                </Button>
              </>
            )}
          </div>
        )}

        {/* Alerts de estado */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Debug info */}
        {debugInfo && (
          <div className="mt-4">
            <details className="bg-gray-50 p-3 rounded">
              <summary className="font-medium cursor-pointer">📋 Debug Info</summary>
              <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          </div>
        )}

        {/* Guía de configuración */}
        <div className="bg-blue-50 p-4 rounded text-sm">
          <div className="font-medium mb-3 flex items-center gap-2">
            📝 Arquitectura de Credenciales
            <Button variant="ghost" size="sm" onClick={() => setShowCredentials(!showCredentials)}>
              {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-medium text-blue-900">🌐 Credenciales Globales (.env):</p>
              <p className="text-xs text-blue-700">Para que tu aplicación funcione</p>
            </div>

            <div>
              <p className="font-medium text-blue-900">🏢 Credenciales por Organización (BD):</p>
              <p className="text-xs text-blue-700">
                Se van agregando cuando las organizaciones se conectan via OAuth
              </p>
            </div>

            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <p className="font-medium text-yellow-800 mb-2">⚠️ Si OAuth da Error 400:</p>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>
                  1. Ve a: <strong>https://www.mercadopago.com.ar/developers/panel/app</strong>
                </p>
                <p>
                  2. Selecciona tu app con CLIENT_ID: <strong>8619959583573876</strong>
                </p>
                <p>3. Configuración → Redirect URIs → Agregar:</p>
                <p className="font-mono bg-white p-1 rounded">
                  https://apex-one-lemon.vercel.app/api/configuration/mercadopago/callback
                </p>
                <p>4. Guarda los cambios</p>
              </div>
            </div>

            {showCredentials && (
              <div className="bg-white p-3 rounded border">
                <p className="font-medium text-blue-900 mb-2">
                  Variables requeridas en .env.local:
                </p>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 p-1 rounded flex-1">
                      MERCADOPAGO_ACCESS_TOKEN=TEST-tu_access_token_global
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard("MERCADOPAGO_ACCESS_TOKEN=TEST-")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 p-1 rounded flex-1">
                      MERCADOPAGO_PUBLIC_KEY=TEST-tu_public_key_global
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard("MERCADOPAGO_PUBLIC_KEY=TEST-")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <p className="text-xs font-medium text-green-800">
                      ✅ CLIENT_ID y CLIENT_SECRET:
                    </p>
                    <p className="text-xs text-green-700">
                      Se almacenan automáticamente en la BD cuando cada organización se conecta
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="font-medium text-blue-900">🧪 Testing con datos de prueba:</p>
              <div className="text-xs space-y-1">
                <p>• Email: test@testuser.com</p>
                <p>• Tarjeta: 4509 9535 6623 3704 (Visa)</p>
                <p>• CVV: 123, Exp: 11/30</p>
                <p>• Titular: APRO (pago aprobado)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enlaces útiles */}
        <div className="bg-green-50 p-4 rounded text-sm">
          <div className="font-medium mb-2">🔗 Enlaces útiles:</div>
          <div className="space-y-1">
            <a
              href="https://www.mercadopago.com.ar/developers/es/docs/checkout-api-v2/integration-model"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-700 hover:underline"
            >
              📚 Documentación Checkout API
            </a>
            <a
              href="https://www.mercadopago.com.ar/developers/es/docs/checkout-api-v2/testing"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-700 hover:underline"
            >
              🧪 Guía de testing oficial
            </a>
            <a
              href="https://www.mercadopago.com.ar/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-700 hover:underline"
            >
              ⚙️ Panel de desarrolladores
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

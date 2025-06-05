"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Settings,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DiagnosticData {
  oauth: {
    exists: boolean;
    email?: string;
    hasAccessToken: boolean;
    accessTokenPreview?: string;
    accessTokenType?: string;
    hasRefreshToken: boolean;
    createdAt?: string;
    expiresAt?: string;
  };
  globalCredentials: {
    hasGlobalAccessToken: boolean;
    globalAccessTokenPreview?: string;
    globalAccessTokenType?: string;
    hasGlobalPublicKey: boolean;
    globalPublicKeyPreview?: string;
  };
}

// NUEVO: Componente para configurar credenciales de producción
function ProductionCredentialsForm() {
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken.trim() || !publicKey.trim()) {
      toast({
        title: "Error",
        description: "Ambos campos son requeridos",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken.startsWith("APP_USR-")) {
      toast({
        title: "Error",
        description: "Access Token debe empezar con APP_USR- (producción)",
        variant: "destructive",
      });
      return;
    }

    if (!publicKey.startsWith("APP_USR-")) {
      toast({
        title: "Error",
        description: "Public Key debe empezar con APP_USR- (producción)",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/configuration/mercadopago/update-production-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          publicKey: publicKey.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ Credenciales Configuradas",
          description: `Credenciales de producción guardadas para ${data.data.email}`,
          variant: "default",
        });

        // Limpiar formulario
        setAccessToken("");
        setPublicKey("");

        // Recargar página después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "Error configurando credenciales",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error configurando credenciales:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accessToken">Access Token (APP_USR-xxx)</Label>
        <Input
          id="accessToken"
          type="password"
          placeholder="APP_USR-1234567890-abcdef..."
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="publicKey">Public Key (APP_USR-xxx)</Label>
        <Input
          id="publicKey"
          type="password"
          placeholder="APP_USR-1234567890-abcdef..."
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          className="font-mono text-sm"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Key className="w-4 h-4 mr-2" />
        )}
        Configurar Credenciales de Producción
      </Button>
    </form>
  );
}

export default function MercadoPagoFixPage() {
  const [loading, setLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [fixing, setFixing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/debug/mercadopago-oauth");

      if (response.ok) {
        const data = await response.json();
        setDiagnosticData(data.debug);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los diagnósticos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cargando diagnósticos:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      setFixing(true);
      const response = await fetch("/api/debug/mercadopago-refresh-token", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ Token Renovado",
          description: `Access token renovado exitosamente (${data.data.accessTokenType})`,
          variant: "default",
        });

        // Recargar diagnósticos
        await loadDiagnostics();

        // Mostrar instrucciones para verificar
        setTimeout(() => {
          toast({
            title: "🔍 Próximo paso",
            description: "Ve a '/debug/point-permissions' para verificar que funcione",
            variant: "default",
          });
        }, 2000);
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "Error renovando token",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error renovando token:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  const reconnectOAuth = () => {
    // Redirigir a la página de configuración para reconectar
    window.location.href = "/configuration";
  };

  const getRecommendedAction = () => {
    if (!diagnosticData) return null;

    const { oauth, globalCredentials } = diagnosticData;

    if (!oauth.exists) {
      return {
        type: "error",
        title: "OAuth no configurado",
        description: "Necesitas conectar tu cuenta de MercadoPago",
        action: "reconnect",
        buttonText: "Conectar MercadoPago",
      };
    }

    if (!oauth.hasAccessToken) {
      return {
        type: "error",
        title: "Access Token faltante",
        description: "El OAuth se completó pero no se guardó el access token",
        action: "refresh",
        buttonText: "Renovar Token",
      };
    }

    if (oauth.hasAccessToken && oauth.accessTokenType === "TEST") {
      return {
        type: "error",
        title: "❌ Token de Testing - Point API NO funciona",
        description:
          "Point API requiere tokens de PRODUCCIÓN (APP_USR-xxx). Los tokens de testing (TEST-xxx) no funcionan.",
        action: "production",
        buttonText: "Activar Producción",
      };
    }

    if (oauth.hasAccessToken && !oauth.hasRefreshToken) {
      return {
        type: "warning",
        title: "Sin Refresh Token",
        description: "Tienes access token de producción pero no refresh token. Puede expirar.",
        action: "reconnect",
        buttonText: "Reconectar OAuth",
      };
    }

    if (oauth.hasAccessToken && oauth.hasRefreshToken && oauth.accessTokenType === "PROD") {
      return {
        type: "success",
        title: "✅ OAuth Configurado Correctamente para Point API",
        description:
          "Tienes access token de producción y refresh token. Point API debería funcionar.",
        action: "test",
        buttonText: "Probar Point API",
      };
    }

    return null;
  };

  const recommendation = getRecommendedAction();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Cargando diagnósticos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Wrench className="w-8 h-8 text-orange-600" />
          Reparar MercadoPago Point API
        </h1>
        <p className="text-muted-foreground mb-8">
          Diagnóstico y reparación automática de problemas de configuración
        </p>
      </div>

      {/* NUEVO: Alerta específica sobre Point API y producción */}
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-red-900">
                ⚠️ Point API requiere tokens de PRODUCCIÓN
              </h4>
              <p className="text-sm text-red-800">
                La API de Point Smart solo funciona con credenciales de producción (APP_USR-xxx), no
                con tokens de testing (TEST-xxx).
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded border text-sm text-red-800">
              <p className="font-medium mb-2">Para usar Point API necesitas:</p>
              <ul className="space-y-1 ml-4">
                <li>
                  • <strong>Access Token de producción</strong>: APP_USR-xxxxxxxxx
                </li>
                <li>
                  • <strong>Public Key de producción</strong>: APP_USR-xxxxxxxxx
                </li>
                <li>
                  • <strong>Aplicación activada</strong> en el panel de MercadoPago
                </li>
                <li>
                  • <strong>Dispositivos Point vinculados</strong> a tu cuenta real
                </li>
              </ul>
            </div>
            <div className="text-sm text-red-700">
              <p className="font-medium">Pasos para activar producción:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-2">
                <li>
                  Ve al{" "}
                  <a
                    href="https://www.mercadopago.com.ar/developers/panel/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    panel de desarrolladores
                  </a>
                </li>
                <li>Selecciona tu aplicación</li>
                <li>Ve a "Production" → "Production credentials"</li>
                <li>Completa información de tu negocio</li>
                <li>Activa las credenciales de producción</li>
                <li>Copia el nuevo access token (APP_USR-xxx)</li>
              </ol>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Diagnóstico actual */}
      {diagnosticData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Diagnóstico Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* OAuth Data */}
              <div className="space-y-3">
                <h4 className="font-semibold">Configuración OAuth</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>OAuth Configurado:</span>
                    <Badge variant={diagnosticData.oauth.exists ? "default" : "destructive"}>
                      {diagnosticData.oauth.exists ? "SÍ" : "NO"}
                    </Badge>
                  </div>
                  {diagnosticData.oauth.email && (
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-mono text-xs">{diagnosticData.oauth.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Access Token:</span>
                    <Badge
                      variant={diagnosticData.oauth.hasAccessToken ? "default" : "destructive"}
                    >
                      {diagnosticData.oauth.hasAccessToken ? "SÍ" : "NO"}
                    </Badge>
                  </div>
                  {diagnosticData.oauth.accessTokenPreview && (
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <Badge
                        variant={
                          diagnosticData.oauth.accessTokenType === "TEST" ? "secondary" : "default"
                        }
                      >
                        {diagnosticData.oauth.accessTokenType}
                        {diagnosticData.oauth.accessTokenType === "TEST" && (
                          <span className="ml-1 text-xs">⚠️ Point API NO funciona</span>
                        )}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Refresh Token:</span>
                    <Badge variant={diagnosticData.oauth.hasRefreshToken ? "default" : "secondary"}>
                      {diagnosticData.oauth.hasRefreshToken ? "SÍ" : "NO"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Global Credentials */}
              <div className="space-y-3">
                <h4 className="font-semibold">Credenciales Globales</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Access Token Global:</span>
                    <Badge
                      variant={
                        diagnosticData.globalCredentials.hasGlobalAccessToken
                          ? "default"
                          : "secondary"
                      }
                    >
                      {diagnosticData.globalCredentials.hasGlobalAccessToken ? "SÍ" : "NO"}
                    </Badge>
                  </div>
                  {diagnosticData.globalCredentials.globalAccessTokenType && (
                    <div className="flex justify-between">
                      <span>Tipo Global:</span>
                      <Badge
                        variant={
                          diagnosticData.globalCredentials.globalAccessTokenType === "TEST"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {diagnosticData.globalCredentials.globalAccessTokenType}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Public Key Global:</span>
                    <Badge
                      variant={
                        diagnosticData.globalCredentials.hasGlobalPublicKey
                          ? "default"
                          : "secondary"
                      }
                    >
                      {diagnosticData.globalCredentials.hasGlobalPublicKey ? "SÍ" : "NO"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendación de acción */}
      {recommendation && (
        <Alert
          className={
            recommendation.type === "error"
              ? "border-red-200 bg-red-50"
              : recommendation.type === "warning"
                ? "border-yellow-200 bg-yellow-50"
                : "border-green-200 bg-green-50"
          }
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">{recommendation.title}</h4>
                <p className="text-sm">{recommendation.description}</p>
              </div>
              <div className="flex gap-3">
                {recommendation.action === "refresh" && (
                  <Button
                    onClick={refreshAccessToken}
                    disabled={fixing}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {fixing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {recommendation.buttonText}
                  </Button>
                )}
                {recommendation.action === "reconnect" && (
                  <Button onClick={reconnectOAuth} size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {recommendation.buttonText}
                  </Button>
                )}
                {recommendation.action === "production" && (
                  <Button
                    onClick={() =>
                      window.open(
                        "https://www.mercadopago.com.ar/developers/panel/applications",
                        "_blank",
                      )
                    }
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {recommendation.buttonText}
                  </Button>
                )}
                {recommendation.action === "test" && (
                  <Button
                    onClick={() => window.open("/debug/point-permissions", "_blank")}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {recommendation.buttonText}
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Acciones manuales */}
      <Card>
        <CardHeader>
          <CardTitle>🛠️ Acciones de Reparación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* NUEVO: Sección para configurar credenciales de producción */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900">
                🔑 Configurar Credenciales de Producción
              </CardTitle>
              <CardDescription className="text-orange-800">
                Una vez que actives las credenciales en el panel de MercadoPago, ingrésalas aquí:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductionCredentialsForm />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">Renovar Access Token</h4>
                <p className="text-sm text-muted-foreground">
                  Usa el refresh token para obtener un nuevo access token
                </p>
              </div>
              <Button
                onClick={refreshAccessToken}
                disabled={fixing || !diagnosticData?.oauth.hasRefreshToken}
                variant="outline"
              >
                {fixing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Renovar
              </Button>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">Reconectar OAuth</h4>
                <p className="text-sm text-muted-foreground">
                  Volver a hacer el proceso completo de OAuth
                </p>
              </div>
              <Button onClick={reconnectOAuth} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Reconectar
              </Button>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">Recargar Diagnósticos</h4>
                <p className="text-sm text-muted-foreground">Actualizar la información mostrada</p>
              </div>
              <Button onClick={loadDiagnostics} disabled={loading} variant="outline">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Recargar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Pasos para Point Smart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-800 space-y-3 text-sm">
            <p>
              <strong>Una vez que tengas el access token funcionando:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                Ve a <code className="bg-blue-100 px-1 rounded">/debug/point-permissions</code> para
                verificar permisos
              </li>
              <li>
                Asegúrate de que en MercadoPago tengas los scopes:{" "}
                <code className="bg-blue-100 px-1 rounded">read</code>,{" "}
                <code className="bg-blue-100 px-1 rounded">write</code>,{" "}
                <code className="bg-blue-100 px-1 rounded">offline_access</code>
              </li>
              <li>Vincula tu Point Smart en el panel de MercadoPago</li>
              <li>
                Prueba la integración en{" "}
                <code className="bg-blue-100 px-1 rounded">/test-point-smart</code>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
  ShieldCheck,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ClearResult {
  success: boolean;
  message: string;
  actions: {
    deletedOAuthConfigs: number;
    remainingProdConfigs: number;
  };
  currentState: {
    globalCredentials: {
      accessToken: string;
      publicKey: string;
    };
    oauthState: string;
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
  }>;
}

export default function ProductionOnlyPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClearResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearTestCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log("🧹 Iniciando limpieza de credenciales de testing...");

      const response = await fetch("/api/configuration/mercadopago/clear-test-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        toast.success("✅ Credenciales de testing limpiadas exitosamente");
      } else {
        setError(data.error || "Error limpiando credenciales");
        toast.error(`❌ Error: ${data.error || "Error desconocido"}`);
      }
    } catch (err) {
      console.error("❌ Error interno:", err);
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Settings className="h-5 w-5 text-blue-500" />;
    }
  };

  const getRecommendationBadge = (type: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      success: "default",
      warning: "secondary",
      error: "destructive",
      info: "outline",
    };

    return variants[type] || "outline";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-orange-600" />
            Configurar Solo Producción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-2">
              🎯 Objetivo: Eliminar todas las credenciales de testing
            </h3>
            <div className="space-y-2 text-sm text-orange-800">
              <p>
                • <strong>Eliminar</strong> configuraciones OAuth con tokens TEST-
              </p>
              <p>
                • <strong>Mantener</strong> solo credenciales de producción (APP_USR-)
              </p>
              <p>
                • <strong>Solucionar</strong> problemas de pagos rechazados
              </p>
              <p>
                • <strong>Habilitar</strong> Point API y funcionalidad completa
              </p>
            </div>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ Importante:</strong> Esto eliminará permanentemente todas las
              configuraciones OAuth que usen tokens de testing (TEST-). Asegúrate de tener
              credenciales de producción configuradas.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button
              onClick={clearTestCredentials}
              disabled={loading}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              {loading ? "Limpiando..." : "Limpiar Credenciales de Testing"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <strong>Error:</strong> {error}
            </div>
            <div className="mt-2 text-sm">
              Verifica que tengas permisos de administrador y que las configuraciones existan.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {result && (
        <div className="space-y-6">
          {/* Resumen de Acciones */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle className="h-5 w-5" />
                Limpieza Completada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-green-800">{result.message}</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white p-3 rounded border border-green-200">
                  <h4 className="font-medium text-green-900">Configuraciones Eliminadas</h4>
                  <p className="text-2xl font-bold text-red-600">
                    {result.actions.deletedOAuthConfigs}
                  </p>
                  <p className="text-sm text-green-700">OAuth configs de testing</p>
                </div>

                <div className="bg-white p-3 rounded border border-green-200">
                  <h4 className="font-medium text-green-900">Configuraciones de Producción</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {result.actions.remainingProdConfigs}
                  </p>
                  <p className="text-sm text-green-700">OAuth configs mantenidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado Actual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Estado Actual de Credenciales
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Access Token Global</h4>
                <Badge
                  variant={
                    result.currentState.globalCredentials.accessToken === "PRODUCCIÓN"
                      ? "default"
                      : "destructive"
                  }
                >
                  {result.currentState.globalCredentials.accessToken}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Public Key Global</h4>
                <Badge
                  variant={
                    result.currentState.globalCredentials.publicKey === "PRODUCCIÓN"
                      ? "default"
                      : "destructive"
                  }
                >
                  {result.currentState.globalCredentials.publicKey}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Estado OAuth</h4>
                <Badge variant="default" className="bg-green-500">
                  {result.currentState.oauthState}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recomendaciones */}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Acciones Recomendadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.recommendations.map((rec, recIndex) => (
                  <Alert
                    key={`rec-${recIndex}-${rec.type}-${rec.title?.substring(0, 10) || recIndex}`}
                    className={`border-${rec.type === "success" ? "green" : rec.type === "warning" ? "yellow" : "red"}-200 bg-${rec.type === "success" ? "green" : rec.type === "warning" ? "yellow" : "red"}-50`}
                  >
                    {getRecommendationIcon(rec.type)}
                    <AlertDescription>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <strong>{rec.title}</strong>
                          <Badge variant={getRecommendationBadge(rec.type)}>
                            {rec.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm">{rec.description}</p>

                        {rec.action === "manual" && (
                          <div className="mt-3 p-3 bg-white rounded border">
                            <p className="font-medium text-sm mb-2">
                              Actualiza tu archivo .env.local:
                            </p>
                            <code className="block text-xs bg-gray-100 p-2 rounded">
                              # Reemplaza estas líneas:
                              <br />
                              MERCADOPAGO_ACCESS_TOKEN=APP_USR-tu_access_token_de_produccion
                              <br />
                              MERCADOPAGO_PUBLIC_KEY=APP_USR-tu_public_key_de_produccion
                            </code>
                          </div>
                        )}

                        {rec.action === "configure_production" && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open("/debug/mercadopago-fix", "_blank")}
                            >
                              Ir a Configuración
                            </Button>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

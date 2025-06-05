"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InvestigationResult {
  user_data: any;
  analysis: any;
  next_step: string;
  explanation: string;
  specific_recommendations: string[];
  activation_methods: any;
}

export default function ApplicationInvestigationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);

  const investigateApplication = async () => {
    try {
      setLoading(true);

      console.log("🔍 Investigando aplicación MercadoPago...");

      const response = await fetch("/api/debug/application-status", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success("✅ Investigación completada");
        console.log("📊 Resultado:", data);
      } else {
        toast.error(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("💥 Error investigando aplicación:", error);
      toast.error("Error al investigar aplicación");
    } finally {
      setLoading(false);
    }
  };

  const getStepColor = (step: string) => {
    switch (step) {
      case "ready":
        return "bg-green-100 text-green-800";
      case "activate_live_mode_application":
        return "bg-orange-100 text-orange-800";
      case "complete_account_setup":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case "ready":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "activate_live_mode_application":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case "complete_account_setup":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Search className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6 text-blue-500" />🔍 Investigación de Aplicación MercadoPago
            </CardTitle>
            <CardDescription>
              Análisis profundo para encontrar cómo activar Live Mode específicamente para tu
              aplicación
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Investigar */}
        <Card>
          <CardContent className="pt-6">
            <Button onClick={investigateApplication} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Investigando aplicación...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />🔍 Investigar Estado de Live Mode
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {result && (
          <>
            {/* Estado General */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(result.next_step)}
                  Estado de tu Aplicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded border ${getStepColor(result.next_step)}`}>
                  <h4 className="font-semibold mb-2">Diagnóstico:</h4>
                  <p className="text-sm">{result.explanation}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">Live Mode</p>
                    <Badge variant={result.user_data.live_mode ? "default" : "destructive"}>
                      {result.user_data.live_mode ? "ACTIVADO" : "DESACTIVADO"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Tipo de Cuenta</p>
                    <Badge variant="outline">
                      {result.user_data.account_type || "No especificado"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Usuario</p>
                    <Badge variant="outline">
                      {result.user_data.user_type || "No especificado"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Análisis Detallado */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Capacidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div
                    className={`p-3 rounded border ${result.analysis.can_sell ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      {result.analysis.can_sell ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Vender</span>
                    </div>
                    <p className="text-xs mt-1">
                      {result.analysis.can_sell ? "Permitido" : "Bloqueado"}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded border ${result.analysis.can_bill ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      {result.analysis.can_bill ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Facturar</span>
                    </div>
                    <p className="text-xs mt-1">
                      {result.analysis.can_bill ? "Permitido" : "Bloqueado"}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded border ${result.analysis.can_list ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      {result.analysis.can_list ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Listar</span>
                    </div>
                    <p className="text-xs mt-1">
                      {result.analysis.can_list ? "Permitido" : "Bloqueado"}
                    </p>
                  </div>
                </div>

                {result.analysis.blocking_issues.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <h5 className="font-medium text-red-900 mb-2">⚠️ Problemas Detectados:</h5>
                    <ul className="text-red-800 text-sm space-y-1">
                      {result.analysis.blocking_issues.map((issue: string, issueIndex: number) => (
                        <li key={`issue-${issueIndex}-${issue.substring(0, 30)}`}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recomendaciones Específicas */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">💡 Recomendaciones Específicas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-blue-800 space-y-2">
                  {result.specific_recommendations.map((rec: string, recIndex: number) => (
                    <li
                      key={`recommendation-${recIndex}-${rec.substring(0, 30)}`}
                      className="flex items-start gap-2"
                    >
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Métodos de Activación */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Formas de Activar Live Mode</CardTitle>
                <CardDescription>
                  Como no aparece la opción en el panel, estas son tus alternativas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Método 1: Panel Manual */}
                <div className="p-4 border rounded">
                  <div className="flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h5 className="font-medium">Panel de Desarrolladores</h5>
                      <p className="text-sm text-gray-600 mb-2">
                        {result.activation_methods.developer_panel.description}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={result.activation_methods.developer_panel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir Panel
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Método 2: Soporte MercadoPago */}
                <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-yellow-600 mt-1" />
                    <div className="flex-1">
                      <h5 className="font-medium text-yellow-900">
                        Contactar Soporte (RECOMENDADO)
                      </h5>
                      <p className="text-sm text-yellow-800 mb-3">
                        Si no aparece la opción "Go Live" en tu panel, es común contactar
                        directamente al soporte.
                      </p>

                      <div className="space-y-2">
                        <div className="bg-white p-3 rounded border">
                          <h6 className="font-medium text-sm mb-1">📧 Email de Soporte:</h6>
                          <p className="text-xs text-gray-600">developers@mercadopago.com</p>
                        </div>

                        <div className="bg-white p-3 rounded border">
                          <h6 className="font-medium text-sm mb-1">💬 Mensaje Sugerido:</h6>
                          <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded font-mono">
                            "Hola, tengo una aplicación con credenciales de producción (APP_USR-)
                            pero no aparece la opción para activar Live Mode en el panel. Mi
                            aplicación es para Better Motos (venta de motocicletas). ¿Pueden activar
                            Live Mode o indicarme cómo proceder?"
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" asChild>
                          <a href="mailto:developers@mercadopago.com?subject=Activación Live Mode - Better Motos">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Enviar Email
                          </a>
                        </Button>

                        <Button variant="outline" size="sm" asChild>
                          <a
                            href="https://www.mercadopago.com.ar/ayuda"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Centro de Ayuda
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Método 3: API (No disponible) */}
                <div className="p-4 border rounded bg-gray-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-gray-500 mt-1" />
                    <div>
                      <h5 className="font-medium text-gray-700">Activación por API</h5>
                      <p className="text-sm text-gray-600">
                        {result.activation_methods.api_method.note}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Próximos Pasos */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">🎯 Plan de Acción</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-green-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                      1
                    </span>
                    <span className="text-sm">
                      <strong>INMEDIATO:</strong> Contacta al soporte de MercadoPago por email
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                      2
                    </span>
                    <span className="text-sm">
                      Explícales que tienes credenciales de producción pero no ves "Go Live"
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                      3
                    </span>
                    <span className="text-sm">
                      Una vez activado, prueba pagos reales con `/debug/test-real-card`
                    </span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

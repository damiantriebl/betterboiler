"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, CreditCard, Loader2, Play, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RejectionAnalysis {
  credentialIssues: string[];
  dataIssues: string[];
  configurationIssues: string[];
  recommendations: string[];
}

interface DiagnosticResult {
  diagnosis: string;
  credentialStatus: {
    accessTokenType: string;
    publicKeyType: string;
  };
  appStatusCheck: any;
  rejectionAnalysis: RejectionAnalysis;
  improvedPayload: any;
  testingSteps: string[];
  productionTips: string[];
  urgentActions: string[];
  nextSteps: any;
}

export default function RejectedPaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [cardType, setCardType] = useState<"credit" | "debit">("credit");
  const [errorDetails, setErrorDetails] = useState("");

  const analyzeRejectedPayment = async () => {
    try {
      setLoading(true);

      console.log("🚫 Analizando pagos rechazados...");

      const response = await fetch("/api/debug/rejected-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardType,
          errorDetails,
          paymentData: {
            amount: 150,
            currency: "ARS",
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success("✅ Análisis completado");
        console.log("📊 Resultado del análisis:", data);
      } else {
        toast.error(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("💥 Error analizando pagos rechazados:", error);
      toast.error("Error al analizar pagos rechazados");
    } finally {
      setLoading(false);
    }
  };

  const testImprovedPayment = async () => {
    if (!result?.improvedPayload) return;

    try {
      toast.info("🧪 Testeando pago mejorado...", {
        description: "Esto usará el payload optimizado para mayor tasa de aprobación",
      });

      // Aquí podrías implementar el test con el payload mejorado
      window.open("/api/payments/mercadopago/test-production", "_blank");
    } catch (error) {
      toast.error("Error al testear pago mejorado");
    }
  };

  const getStatusIcon = (isPositive: boolean) => {
    return isPositive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-orange-500" />
              Análisis de Pagos Rechazados en Producción
            </CardTitle>
            <CardDescription>
              Diagnóstico avanzado para resolver problemas de pagos rechazados con tarjetas reales
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Configuración de Análisis */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Análisis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="cardType" className="text-sm font-medium">
                  Tipo de Tarjeta
                </label>
                <Select
                  value={cardType}
                  onValueChange={(value: "credit" | "debit") => setCardType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de tarjeta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">💳 Tarjeta de Crédito</SelectItem>
                    <SelectItem value="debit">🏦 Tarjeta de Débito</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Las tarjetas de crédito tienen mejor tasa de aprobación
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="errorDetails" className="text-sm font-medium">
                  Detalles del Error (Opcional)
                </label>
                <Textarea
                  id="errorDetails"
                  value={errorDetails}
                  onChange={(e) => setErrorDetails(e.target.value)}
                  placeholder="Pega aquí cualquier mensaje de error específico..."
                  className="h-20"
                />
              </div>
            </div>

            <Button onClick={analyzeRejectedPayment} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Analizar Problemas de Pago
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados del Análisis */}
        {result && (
          <>
            {/* Estado de Credenciales */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Credenciales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.credentialStatus.accessTokenType.includes("✅"))}
                    <span className="font-medium">Access Token:</span>
                    <Badge
                      variant={
                        result.credentialStatus.accessTokenType.includes("✅")
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.credentialStatus.accessTokenType}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.credentialStatus.publicKeyType.includes("✅"))}
                    <span className="font-medium">Public Key:</span>
                    <Badge
                      variant={
                        result.credentialStatus.publicKeyType.includes("✅")
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.credentialStatus.publicKeyType}
                    </Badge>
                  </div>
                </div>

                {result.appStatusCheck && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">Estado de Aplicación:</h5>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.appStatusCheck.success)}
                      <span className="text-sm text-blue-700">
                        {result.appStatusCheck.success
                          ? "Conectada correctamente"
                          : "Error de conexión"}
                      </span>
                    </div>
                    {result.appStatusCheck.data && (
                      <div className="text-xs text-blue-600 mt-1">
                        Live Mode:{" "}
                        {result.appStatusCheck.data.live_mode ? "✅ Activado" : "❌ Desactivado"}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Problemas Detectados */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Problemas de Credenciales */}
              {result.rejectionAnalysis.credentialIssues.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-800">Problemas de Credenciales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {result.rejectionAnalysis.credentialIssues.map((issue, issueIndex) => (
                        <li
                          key={`credential-${issueIndex}-${issue.substring(0, 30)}`}
                          className="text-red-700 text-sm flex items-start gap-1"
                        >
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Problemas de Datos */}
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-800">Problemas de Datos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.rejectionAnalysis.dataIssues.map((issue, dataIndex) => (
                      <li
                        key={`data-${dataIndex}-${issue.substring(0, 30)}`}
                        className="text-yellow-700 text-sm flex items-start gap-1"
                      >
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Problemas de Configuración */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800">Problemas de Configuración</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.rejectionAnalysis.configurationIssues.map((issue, configIndex) => (
                      <li
                        key={`config-${configIndex}-${issue.substring(0, 30)}`}
                        className="text-orange-700 text-sm flex items-start gap-1"
                      >
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recomendaciones */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">
                  Recomendaciones para Mejorar Aprobación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-2">
                    {result.rejectionAnalysis.recommendations
                      .slice(0, Math.ceil(result.rejectionAnalysis.recommendations.length / 2))
                      .map((rec, recIndex) => (
                        <li
                          key={`rec1-${recIndex}-${rec.substring(0, 30)}`}
                          className="text-green-700 text-sm flex items-start gap-2"
                        >
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                  </ul>
                  <ul className="space-y-2">
                    {result.rejectionAnalysis.recommendations
                      .slice(Math.ceil(result.rejectionAnalysis.recommendations.length / 2))
                      .map((rec, rec2Index) => (
                        <li
                          key={`rec2-${rec2Index}-${rec.substring(0, 30)}`}
                          className="text-green-700 text-sm flex items-start gap-2"
                        >
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Acciones Urgentes */}
            {result.urgentActions.length > 0 && (
              <Card className="border-red-300 bg-red-100">
                <CardHeader>
                  <CardTitle className="text-red-900">🚨 Acciones Urgentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.urgentActions.map((action, actionIndex) => (
                      <li
                        key={`action-${actionIndex}-${action.substring(0, 30)}`}
                        className="text-red-800 font-medium text-sm"
                      >
                        {action}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tips de Producción */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">💡 Tips para Producción</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.productionTips.map((tip, tipIndex) => (
                    <li
                      key={`tip-${tipIndex}-${tip.substring(0, 30)}`}
                      className="text-blue-700 text-sm"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pasos de Testing */}
            <Card>
              <CardHeader>
                <CardTitle>Pasos para Testear</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-2">
                  {result.testingSteps.map((step, stepIndex) => (
                    <li
                      key={`step-${stepIndex}-${step.substring(0, 30)}`}
                      className="text-sm flex items-start gap-2"
                    >
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {stepIndex + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                <div className="flex gap-3 pt-4">
                  <Button onClick={testImprovedPayment} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Probar Pago Mejorado
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.open(result.nextSteps.checkAppStatus, "_blank")}
                  >
                    📱 Panel MercadoPago
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.open(result.nextSteps.viewConfiguration, "_blank")}
                  >
                    ⚙️ Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payload Mejorado */}
            {result.improvedPayload && (
              <Card>
                <CardHeader>
                  <CardTitle>Payload Optimizado para Producción</CardTitle>
                  <CardDescription>
                    Este payload incluye todos los campos recomendados para mejorar la tasa de
                    aprobación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(result.improvedPayload, null, 2)}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Nota: Reemplaza el token simulado con un token real generado por MercadoPago
                    Brick
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

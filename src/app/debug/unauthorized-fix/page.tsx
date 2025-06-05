"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface CredentialAnalysis {
  accessToken: {
    type: string;
    value: string;
    valid: boolean;
  };
  publicKey: {
    type: string;
    value: string;
    valid: boolean;
  };
  consistent: boolean;
}

interface DiagnosticData {
  diagnosis: string;
  credentialAnalysis: CredentialAnalysis;
  mpApiTest: any;
  appConfigTest: any;
  problems: string[];
  solutions: string[];
  recommendations: {
    immediate: string[];
    production: string[];
  };
  nextSteps: {
    debug: string;
    testSandbox: string;
    testProduction: string;
    mpPanel: string;
  };
}

export default function UnauthorizedFixPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostic = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Cargando diagnóstico...");

      const response = await fetch("/api/debug/unauthorized-credentials");
      const result = await response.json();

      if (response.ok) {
        setData(result);
        console.log("✅ Diagnóstico cargado:", result);
      } else {
        setError(result.error || "Error al cargar diagnóstico");
      }
    } catch (err) {
      console.error("💥 Error cargando diagnóstico:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiagnostic();
  }, [loadDiagnostic]);

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "TEST":
        return "bg-blue-100 text-blue-800";
      case "PRODUCCIÓN":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Analizando configuración de MercadoPago...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                Error en Diagnóstico
              </CardTitle>
              <CardDescription className="text-red-700">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={loadDiagnostic}
                variant="outline"
                className="border-red-300 text-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              Diagnóstico: "Unauthorized use of live credentials"
            </CardTitle>
            <CardDescription>
              Análisis completo del error de credenciales de MercadoPago
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Análisis de Credenciales */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Credenciales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Access Token</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(data.credentialAnalysis.accessToken.valid)}
                  <Badge className={getTypeColor(data.credentialAnalysis.accessToken.type)}>
                    {data.credentialAnalysis.accessToken.type}
                  </Badge>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {data.credentialAnalysis.accessToken.value}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Public Key</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(data.credentialAnalysis.publicKey.valid)}
                  <Badge className={getTypeColor(data.credentialAnalysis.publicKey.type)}>
                    {data.credentialAnalysis.publicKey.type}
                  </Badge>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {data.credentialAnalysis.publicKey.value}
                  </code>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                {getStatusIcon(data.credentialAnalysis.consistent)}
                <span className="font-medium">
                  Consistencia: {data.credentialAnalysis.consistent ? "Correcta" : "Inconsistente"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test de API */}
        {data.mpApiTest && (
          <Card>
            <CardHeader>
              <CardTitle>Test de Conectividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {getStatusIcon(data.mpApiTest.success)}
                <span className="font-medium">
                  Estado API: {data.mpApiTest.success ? "Conectado" : "Error"}
                </span>
                <Badge variant={data.mpApiTest.success ? "default" : "destructive"}>
                  {data.mpApiTest.status}
                </Badge>
              </div>

              {data.mpApiTest.userData && (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <h5 className="font-medium text-green-800 mb-2">Datos de Usuario:</h5>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>ID: {data.mpApiTest.userData.id}</p>
                    <p>Email: {data.mpApiTest.userData.email}</p>
                    <p>País: {data.mpApiTest.userData.country_id}</p>
                    <p>Sitio: {data.mpApiTest.userData.site_id}</p>
                  </div>
                </div>
              )}

              {data.mpApiTest.error && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <h5 className="font-medium text-red-800 mb-2">Error:</h5>
                  <pre className="text-sm text-red-700 whitespace-pre-wrap">
                    {JSON.stringify(data.mpApiTest.error, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Problemas Detectados */}
        {data.problems.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Problemas Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.problems.map((problem, problemIndex) => (
                  <li
                    key={`problem-${problemIndex}-${problem.substring(0, 30)}`}
                    className="text-red-700 flex items-start gap-2"
                  >
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {problem}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Soluciones */}
        {data.solutions.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Soluciones Recomendadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.solutions.map((solution, solutionIndex) => (
                  <li
                    key={`solution-${solutionIndex}-${solution.substring(0, 30)}`}
                    className="text-blue-700 flex items-start gap-2"
                  >
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {solution}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recomendaciones */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-800">Acciones Inmediatas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.recommendations.immediate.map((rec, immIndex) => (
                  <li
                    key={`immediate-${immIndex}-${rec.substring(0, 30)}`}
                    className="text-orange-700 text-sm"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-800">Para Producción</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.recommendations.production.map((rec, prodIndex) => (
                  <li
                    key={`production-${prodIndex}-${rec.substring(0, 30)}`}
                    className="text-green-700 text-sm"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(data.nextSteps.debug, "_blank")}
              >
                🔧 Debug General
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(data.nextSteps.testSandbox, "_blank")}
              >
                🧪 Test Sandbox
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(data.nextSteps.testProduction, "_blank")}
              >
                🏭 Test Producción
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(data.nextSteps.mpPanel, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Panel MP
              </Button>
            </div>

            <div className="pt-3 border-t">
              <Button onClick={loadDiagnostic} variant="outline" className="mr-3">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar Diagnóstico
              </Button>

              <Button
                onClick={() =>
                  toast.info("Diagnóstico copiado al portapapeles", {
                    description: "Puedes compartir esta información con soporte técnico",
                  })
                }
                variant="outline"
              >
                📋 Copiar Diagnóstico
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

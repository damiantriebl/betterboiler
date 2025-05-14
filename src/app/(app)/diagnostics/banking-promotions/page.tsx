"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { diagnoseBankingPromotionQueries } from "@/lib/fix-banking-promotion-queries";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

export default function BankingPromotionDiagnostics() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    count?: number;
    sample?: Record<string, unknown>;
  }>({});

  const handleRunDiagnostic = async () => {
    setIsLoading(true);
    try {
      const response = await diagnoseBankingPromotionQueries();
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Diagnóstico de Consultas BankingPromotion</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ejecutar diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunDiagnostic} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Ejecutar diagnóstico"
            )}
          </Button>
        </CardContent>
      </Card>

      {result.success !== undefined && (
        <Alert variant={result.success ? "default" : "destructive"} className="mb-6">
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? "Consulta exitosa" : "Error en la consulta"}</AlertTitle>
          </div>
          <AlertDescription>
            {result.message || result.error}
            {result.count !== undefined && (
              <p className="mt-2">Cantidad de registros: {result.count}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {result.sample && (
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo de promoción</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-secondary p-4 rounded-md overflow-auto">
              {JSON.stringify(result.sample, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

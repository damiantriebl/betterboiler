"use client";

import { setupCurrentAccountMethod } from "@/actions/util";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

export default function PaymentMethodDiagnostics() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    message?: string;
  }>({});

  const handleFixPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const response = await setupCurrentAccountMethod();
      setResult(response);

      if (response.success) {
        setResult({
          success: true,
          message:
            "¡Método de pago 'Cuenta Corriente' configurado correctamente! Regresa a la página de ventas y debería aparecer en el selector.",
        });
      }
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
    <div className="container max-w-none py-8">
      <h1 className="text-3xl font-bold mb-6">Diagnóstico de Métodos de Pago</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Cuenta Corriente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Usa este asistente para configurar correctamente el método de pago "Cuenta Corriente".
              Esto asegurará que el método aparezca en el selector durante el proceso de venta.
            </p>

            <Button onClick={handleFixPaymentMethods} disabled={isLoading} className="mb-4">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                "Configurar Método Cuenta Corriente"
              )}
            </Button>

            {result.success !== undefined && (
              <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{result.success ? "Éxito" : "Error"}</AlertTitle>
                <AlertDescription>
                  {result.message ||
                    result.error ||
                    (result.success
                      ? "Configuración completada"
                      : "Ha ocurrido un error durante la configuración")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instrucciones adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Intenta primero usar el botón de arriba para configurar automáticamente.</li>
              <li>
                Si sigue sin aparecer en la página de ventas, verifica la consola del navegador para
                ver mensajes de error.
              </li>
              <li>Asegúrate de que estás usando la misma organización en ambas páginas.</li>
              <li>
                Si el problema persiste, puede ser necesario revisar la configuración de la base de
                datos.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

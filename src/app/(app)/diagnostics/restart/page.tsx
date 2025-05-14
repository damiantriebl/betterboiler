"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

export default function RestartPage() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      // No podemos reiniciar el servidor desde el cliente,
      // pero podemos indicar al usuario que lo haga manualmente
      setTimeout(() => {
        setResult({
          success: true,
          message:
            'Para aplicar los cambios, detén el servidor con Ctrl+C y reinícialo con "pnpm run dev"',
        });
        setIsRestarting(false);
      }, 1500);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
      setIsRestarting(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Reiniciar Servidor de Desarrollo</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Aplicar cambios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Después de corregir los errores en las consultas, es necesario reiniciar el servidor de
            desarrollo para que los cambios surtan efecto.
          </p>

          <Button onClick={handleRestart} disabled={isRestarting}>
            {isRestarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparando...
              </>
            ) : (
              "Preparar reinicio"
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
            <AlertTitle>{result.success ? "Listo para reiniciar" : "Error"}</AlertTitle>
          </div>
          <AlertDescription>
            {result.message}
            {result.success && (
              <div className="mt-4 p-3 bg-secondary rounded-md">
                <code>pnpm run dev</code>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cambios aplicados</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Corregida la consulta en <code>getEnabledBankingPromotions</code>
            </li>
            <li>
              Corregida la consulta en <code>getPromotionsForDay</code>
            </li>
            <li>Añadidos mensajes de log para diagnóstico</li>
            <li>Creadas páginas de diagnóstico para verificar las consultas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard, Smartphone, XCircle, X, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function TestPointMigrationPage() {
  const [completedTests, setCompletedTests] = useState<string[]>([]);
  const [failedTests, setFailedTests] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<any>(null);

  const handleCancelDeviceIntents = async () => {
    setIsCancelling(true);
    setCancelResult(null);

    try {
      const response = await fetch('/api/mercadopago/point/cancel-device-intents/PAX_A910__SMARTPOS1495357742', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-debug-key': 'DEBUG_KEY',
        },
      });

      const result = await response.json();
      setCancelResult(result);

      if (response.ok) {
        console.log('✅ Dispositivo limpiado exitosamente:', result);
      } else {
        console.error('❌ Error cancelando payment intents:', result);
      }
    } catch (error) {
      console.error('❌ Error en cancelación:', error);
      setCancelResult({
        success: false,
        error: 'Error de comunicación',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleTestSuccess = (testId: string, paymentData: any) => {
    console.log(`✅ Test ${testId} exitoso:`, paymentData);
    setCompletedTests((prev) => [...prev.filter((id) => id !== testId), testId]);
    setFailedTests((prev) => prev.filter((id) => id !== testId));
  };

  const handleTestError = (testId: string, error: any) => {
    console.error(`❌ Test ${testId} falló:`, error);
    setFailedTests((prev) => [...prev.filter((id) => id !== testId), testId]);
    setCompletedTests((prev) => prev.filter((id) => id !== testId));
  };

  const getTestStatus = (testId: string) => {
    if (completedTests.includes(testId)) return "success";
    if (failedTests.includes(testId)) return "error";
    return "pending";
  };

  const TestStatusIcon = ({ testId }: { testId: string }) => {
    const status = getTestStatus(testId);
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-blue-600" />
          Test de Migración a Point Smart
        </h1>
        <p className="text-muted-foreground mb-8">
          Verificación completa del funcionamiento de pagos presenciales con Point Smart
        </p>
      </div>

      {/* Estado de la migración */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-900">🎯 Estado de la Migración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTests.length}</div>
              <div className="text-green-800">Tests Exitosos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedTests.length}</div>
              <div className="text-red-800">Tests Fallidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">3</div>
              <div className="text-blue-800">Total Tests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información importante */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900">⚠️ Importante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-yellow-800 space-y-2 text-sm">
            <p>
              <strong>Migración completa realizada:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>✅ Componente MercadoPagoEnhancedBrick reemplazado por PointSmartIntegration</li>
              <li>✅ API de Point Smart ya configurada</li>
              <li>✅ Páginas de venta actualizadas para pagos presenciales</li>
              <li>⚠️ Necesitas credenciales de PRODUCCIÓN (no TEST) para Point</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Cancelación */}
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            🚨 Limpiar Dispositivo Point Smart
          </CardTitle>
          <p className="text-sm text-red-700">
            Si un test falla con "There is already a queued intent for the device", limpia el dispositivo antes de continuar.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleCancelDeviceIntents}
              disabled={isCancelling}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {isCancelling ? 'Limpiando dispositivo...' : 'Limpiar Point Smart'}
            </Button>

            {cancelResult && (
              <div className={`p-4 rounded-lg border ${cancelResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-100 border-red-300 text-red-800'
                }`}>
                <h4 className="font-semibold mb-2">
                  {cancelResult.success ? '✅ Dispositivo limpiado' : '❌ Error en limpieza'}
                </h4>
                <p className="text-sm mb-2">{cancelResult.message || cancelResult.error}</p>
                {cancelResult.details && (
                  <p className="text-xs opacity-75">{cancelResult.details}</p>
                )}
                {cancelResult.device_id && (
                  <p className="text-xs mt-2">
                    <strong>Dispositivo:</strong> {cancelResult.device_id}
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-red-600 bg-red-100 p-3 rounded-lg">
              <strong>🔄 Proceso recomendado:</strong>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                <li>Limpiar dispositivo antes de comenzar los tests</li>
                <li>Ejecutar tests uno a uno</li>
                <li>Si aparece error 2205, limpiar nuevamente</li>
                <li>Verificar que todos los tests pasen exitosamente</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de integración */}
      <div className="grid gap-8">
        {/* Test 1: Venta completa de moto */}
        <Card className="relative">
          <div className="absolute top-4 right-4">
            <TestStatusIcon testId="moto-complete" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-600" />
              Test 1: Prueba Completa Point Smart
              <Badge variant="secondary" className="ml-auto bg-green-50 text-green-700">
                $25.00
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prueba completa de Point Smart con monto pequeño
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={2500}
              description="Test Completo Point Smart - $25.00 (TEST MIGRACIÓN)"
              saleId="test-migration-completo-001"
              motorcycleId={1}
              onPaymentSuccess={(data) => handleTestSuccess("moto-complete", data)}
              onPaymentError={(error) => handleTestError("moto-complete", error)}
            />
          </CardContent>
        </Card>

        {/* Test 2: Anticipo/Reserva */}
        <Card className="relative">
          <div className="absolute top-4 right-4">
            <TestStatusIcon testId="reservation" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Test 2: Prueba Intermedia
              <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-700">
                $20.00
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prueba intermedia de Point Smart con monto medio
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={2000}
              description="Test Intermedio Point Smart - $20.00 (TEST MIGRACIÓN)"
              saleId="test-migration-intermedio-002"
              motorcycleId={2}
              onPaymentSuccess={(data) => handleTestSuccess("reservation", data)}
              onPaymentError={(error) => handleTestError("reservation", error)}
            />
          </CardContent>
        </Card>

        {/* Test 3: Venta menor (accesorios) */}
        <Card className="relative">
          <div className="absolute top-4 right-4">
            <TestStatusIcon testId="accessories" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              Test 3: Prueba Mínima
              <Badge variant="secondary" className="ml-auto bg-purple-50 text-purple-700">
                $15.00
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prueba mínima de Point Smart con monto básico
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={1500}
              description="Test Mínimo Point Smart - $15.00 (TEST MIGRACIÓN)"
              saleId="test-migration-minimo-003"
              onPaymentSuccess={(data) => handleTestSuccess("accessories", data)}
              onPaymentError={(error) => handleTestError("accessories", error)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Información técnica post-migración */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Post-Migración Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-800 space-y-3 text-sm">
            <h4 className="font-semibold">✅ Cambios Realizados:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                PaymentMethodStep.tsx → Reemplazado MercadoPagoEnhancedBrick por
                PointSmartIntegration
              </li>
              <li>Flujo de pago cambió de online a presencial</li>
              <li>APIs de Point Smart ya configuradas y funcionando</li>
              <li>Componente PointSmartIntegration completo con monitoreo en tiempo real</li>
            </ul>

            <h4 className="font-semibold mt-4">🔄 Flujo Nuevo:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Cliente llega a tu local físico</li>
              <li>Vendedor procesa venta en el sistema</li>
              <li>Sistema envía intención de pago al Point Smart</li>
              <li>Cliente pasa tarjeta en Point Smart</li>
              <li>Confirmación automática en tiempo real</li>
            </ol>

            <h4 className="font-semibold mt-4">⚠️ Requisitos:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Credenciales de PRODUCCIÓN configuradas</li>
              <li>Point Smart vinculado y online</li>
              <li>Conexión WiFi estable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

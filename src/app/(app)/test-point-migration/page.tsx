"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard, Smartphone, XCircle } from "lucide-react";
import { useState } from "react";

export default function TestPointMigrationPage() {
  const [completedTests, setCompletedTests] = useState<string[]>([]);
  const [failedTests, setFailedTests] = useState<string[]>([]);

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
              Test 1: Venta Completa de Motocicleta
              <Badge variant="secondary" className="ml-auto bg-green-50 text-green-700">
                $500,000
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Simula una venta completa de motocicleta con Point Smart
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={500000}
              description="Venta Honda CB250 - 2024 (TEST MIGRACIÓN)"
              saleId="test-migration-moto-001"
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
              Test 2: Anticipo/Reserva
              <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-700">
                $100,000
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Simula pago de anticipo para reserva con Point Smart
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={100000}
              description="Anticipo Yamaha FZ - Reserva (TEST MIGRACIÓN)"
              saleId="test-migration-reservation-002"
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
              Test 3: Venta de Accesorios
              <Badge variant="secondary" className="ml-auto bg-purple-50 text-purple-700">
                $25,000
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Simula venta de accesorios con Point Smart
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={25000}
              description="Casco + Guantes + Protecciones (TEST MIGRACIÓN)"
              saleId="test-migration-accessories-003"
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

"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Smartphone, Wifi, X, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function TestPointSmartPage() {
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-blue-600" />
          Prueba Point Smart Integration
        </h1>
        <p className="text-muted-foreground mb-8">
          Integración con dispositivos Point Smart de MercadoPago para pagos presenciales
        </p>
      </div>

      {/* Información sobre Point Smart */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📱 ¿Qué es Point Smart?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">✨ Características:</h4>
              <ul className="space-y-1">
                <li>• Terminal de punto de venta de MercadoPago</li>
                <li>• Acepta tarjetas de crédito y débito</li>
                <li>• Conexión WiFi y Bluetooth</li>
                <li>• Integración directa con la aplicación</li>
                <li>• Pagos seguros y validados</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔄 Flujo de Pago:</h4>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Se selecciona monto en la app</li>
                <li>Se envía intención al Point Smart</li>
                <li>Cliente pasa su tarjeta</li>
                <li>Confirmación automática</li>
                <li>Actualización en tiempo real</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Cancelación */}
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            🚨 Cancelar Pagos Activos
          </CardTitle>
          <p className="text-sm text-red-700">
            Si aparece el error "There is already a queued intent for the device", usa este botón para limpiar el dispositivo.
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
              {isCancelling ? 'Cancelando...' : 'Cancelar Todos los Payment Intents'}
            </Button>

            {cancelResult && (
              <div className={`p-4 rounded-lg border ${cancelResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-100 border-red-300 text-red-800'
                }`}>
                <h4 className="font-semibold mb-2">
                  {cancelResult.success ? '✅ Éxito' : '❌ Error'}
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
              <strong>💡 Cuándo usar:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Cuando aparece "There is already a queued intent for the device"</li>
                <li>Si un pago quedó colgado en el dispositivo</li>
                <li>Para limpiar el dispositivo antes de pruebas</li>
                <li>Si el Point Smart muestra una transacción pendiente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Casos de prueba */}
      <div className="grid gap-8">
        {/* Caso 1: Venta básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Caso 1: Test Básico - $25.00
              <Badge variant="secondary" className="ml-auto bg-green-50 text-green-700">
                Monto Prueba
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prueba con monto pequeño para testing
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={2500}
              description="Test Básico Point Smart - $25.00"
              saleId="test-basic-001"
              motorcycleId={1}
              onPaymentSuccess={(data) => {
                console.log("✅ Test básico exitoso:", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error en test básico:", error);
              }}
            />
          </CardContent>
        </Card>

        {/* Caso 2: Venta mediana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Caso 2: Test Medio - $20.00
              <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-700">
                Monto Prueba
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prueba con monto intermedio para testing
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={2000}
              description="Test Medio Point Smart - $20.00"
              saleId="test-medio-002"
              motorcycleId={2}
              onPaymentSuccess={(data) => {
                console.log("✅ Test medio exitoso:", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error en test medio:", error);
              }}
            />
          </CardContent>
        </Card>

        {/* Caso 3: Venta pequeña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Caso 3: Test Mínimo - $15.00
              <Badge variant="secondary" className="ml-auto bg-purple-50 text-purple-700">
                Monto Prueba
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Prueba con monto mínimo para testing</p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={1500}
              description="Test Mínimo Point Smart - $15.00"
              saleId="test-minimo-003"
              onPaymentSuccess={(data) => {
                console.log("✅ Test mínimo exitoso:", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error en test mínimo:", error);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Información técnica */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800">🔧 Información Técnica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-3">📡 Conectividad:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span>WiFi 2.4GHz/5GHz</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full" />
                  <span>Bluetooth 4.2</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full" />
                  <span>4G LTE (opcional)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">💳 Métodos de Pago:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Tarjetas de crédito (Visa, Mastercard, Amex)</li>
                <li>• Tarjetas de débito</li>
                <li>• Tarjetas prepagas</li>
                <li>• Contactless (NFC)</li>
                <li>• Chip y PIN</li>
                <li>• Banda magnética</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">🚀 Ventajas de la Integración:</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <strong>⚡ Automatización:</strong>
                <p>El precio se envía directamente al dispositivo sin intervención manual.</p>
              </div>
              <div>
                <strong>🔒 Seguridad:</strong>
                <p>Validación real de tarjetas con los bancos emisores.</p>
              </div>
              <div>
                <strong>📊 Trazabilidad:</strong>
                <p>Registro automático de todas las transacciones en la aplicación.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estados de debugging */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900">🔍 Debugging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>
              <strong>Estados posibles del Point Smart:</strong>
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-1">
                <li>
                  • <span className="text-green-600 font-semibold">ONLINE</span> - Disponible para
                  pagos
                </li>
                <li>
                  • <span className="text-red-600 font-semibold">OFFLINE</span> - Sin conexión
                </li>
                <li>
                  • <span className="text-yellow-600 font-semibold">BUSY</span> - Procesando otro
                  pago
                </li>
              </ul>
              <ul className="space-y-1">
                <li>
                  • <span className="text-blue-600 font-semibold">PENDING</span> - Esperando tarjeta
                </li>
                <li>
                  • <span className="text-purple-600 font-semibold">PROCESSING</span> - Validando
                  pago
                </li>
                <li>
                  • <span className="text-green-600 font-semibold">FINISHED</span> - Pago completado
                </li>
              </ul>
            </div>
            <p className="mt-4">
              <strong>💡 Nota:</strong> Abre las DevTools (F12) para ver logs detallados de la
              comunicación con Point Smart.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

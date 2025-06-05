"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Smartphone, Wifi } from "lucide-react";

export default function TestPointSmartPage() {
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

      {/* Casos de prueba */}
      <div className="grid gap-8">
        {/* Caso 1: Venta básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Caso 1: Venta de Moto - $500,000
              <Badge variant="secondary" className="ml-auto bg-green-50 text-green-700">
                Monto Alto
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Simulación de venta de motocicleta con monto alto
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={500000}
              description="Venta Moto Honda CB250 - 2024"
              saleId="test-moto-001"
              motorcycleId={1}
              onPaymentSuccess={(data) => {
                console.log("✅ Venta de moto exitosa:", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error en venta de moto:", error);
              }}
            />
          </CardContent>
        </Card>

        {/* Caso 2: Venta mediana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Caso 2: Anticipo - $50,000
              <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-700">
                Monto Medio
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pago de anticipo para reserva de motocicleta
            </p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={50000}
              description="Anticipo Reserva Moto Yamaha FZ"
              saleId="test-anticipo-002"
              motorcycleId={2}
              onPaymentSuccess={(data) => {
                console.log("✅ Anticipo exitoso:", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error en anticipo:", error);
              }}
            />
          </CardContent>
        </Card>

        {/* Caso 3: Venta pequeña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Caso 3: Accesorios - $15,000
              <Badge variant="secondary" className="ml-auto bg-purple-50 text-purple-700">
                Monto Bajo
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Venta de accesorios y repuestos</p>
          </CardHeader>
          <CardContent>
            <PointSmartIntegration
              amount={15000}
              description="Casco + Guantes + Protecciones"
              saleId="test-accesorios-003"
              onPaymentSuccess={(data) => {
                console.log("✅ Venta de accesorios exitosa:", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error en venta de accesorios:", error);
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

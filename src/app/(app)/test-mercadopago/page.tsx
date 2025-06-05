"use client";

import MercadoPagoEnhancedBrick from "@/components/custom/MercadoPagoEnhancedBrick";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestMercadoPagoPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Prueba MercadoPago - Solo Tarjetas</h1>
        <p className="text-muted-foreground mb-8">
          Esta página prueba la configuración simplificada del Payment Brick - Solo tarjetas de
          crédito y débito
        </p>
      </div>

      <div className="grid gap-8">
        {/* Prueba con monto bajo */}
        <Card>
          <CardHeader>
            <CardTitle>Prueba 1: Monto Bajo ($250) - Solo Tarjetas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Debe mostrar solo tarjetas de crédito y débito
            </p>
          </CardHeader>
          <CardContent>
            <MercadoPagoEnhancedBrick
              amount={250}
              description="Prueba pago monto bajo - Solo tarjetas"
              saleId="test-low-amount"
              buyerData={{
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
                dni: "12345678",
              }}
              onPaymentSuccess={(data) => {
                console.log("✅ Pago exitoso (monto bajo):", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error de pago (monto bajo):", error);
              }}
            />
          </CardContent>
        </Card>

        {/* Prueba con monto alto */}
        <Card>
          <CardHeader>
            <CardTitle>Prueba 2: Monto Alto ($1000) - Solo Tarjetas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Debe mostrar solo tarjetas de crédito y débito (sin efectivo)
            </p>
          </CardHeader>
          <CardContent>
            <MercadoPagoEnhancedBrick
              amount={1000}
              description="Prueba pago monto alto - Solo tarjetas"
              saleId="test-high-amount"
              buyerData={{
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
                dni: "12345678",
              }}
              onPaymentSuccess={(data) => {
                console.log("✅ Pago exitoso (monto alto):", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error de pago (monto alto):", error);
              }}
            />
          </CardContent>
        </Card>

        {/* Prueba de UI simplificada */}
        <Card>
          <CardHeader>
            <CardTitle>Prueba 3: UI Simplificada ($5000)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Payment Brick directo sin selector de métodos
            </p>
          </CardHeader>
          <CardContent>
            <MercadoPagoEnhancedBrick
              amount={5000}
              description="Prueba UI simplificada"
              saleId="test-simplified-ui"
              buyerData={{
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
                dni: "12345678",
              }}
              onPaymentSuccess={(data) => {
                console.log("✅ Pago exitoso (UI simplificada):", data);
              }}
              onPaymentError={(error) => {
                console.error("❌ Error de pago (UI simplificada):", error);
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">✅ Cambios Implementados</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Solo tarjetas de crédito y débito habilitadas</li>
          <li>• Eliminado efectivo (ticket) y MercadoPago wallet</li>
          <li>• Selector de métodos de pago oculto por defecto</li>
          <li>• UI simplificada - Payment Brick directo</li>
          <li>• Order de steps cambiado: Cliente → Pago</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Información de Pruebas</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• **Montos mínimos**: MercadoPago requiere mínimo $150-250 ARS para tarjetas</li>
          <li>• **Tarjetas válidas para APROBACIÓN GARANTIZADA**:</li>
          <li className="ml-4">- Visa: 4509 9535 6623 3704 (CVV: 123, Titular: APRO)</li>
          <li className="ml-4">- Mastercard: 5031 7557 3453 0604 (CVV: 123, Titular: APRO)</li>
          <li>• **Vencimiento**: 11/25 o cualquier fecha futura</li>
          <li>• **Titular**: APRO (importante para aprobación)</li>
          <li>• **Montos de prueba**: $250, $1000, $5000 son seguros</li>
          <li className="text-red-700">⚠️ Si usa otro titular o CVV, puede ser rechazado</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">🔍 Debug - Si el pago es rechazado:</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Abre DevTools (F12) y ve a Console</li>
          <li>• Busca logs que empiecen con "💳 [MercadoPagoEnhancedBrick]"</li>
          <li>• Verifica que hasToken sea true</li>
          <li>• Confirma que el titular sea "APRO"</li>
          <li>• El webhook se dispara igual aunque sea rechazado</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Instrucciones de Prueba</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Abre las herramientas de desarrollador (F12)</li>
          <li>• Verifica que no aparezcan errores 422 en la consola</li>
          <li>• NO debe mostrar opciones de efectivo en ningún caso</li>
          <li>• NO debe mostrar MercadoPago wallet</li>
          <li>• Solo debe aparecer formulario de tarjetas</li>
          <li>• Los Payment Bricks deben cargar directamente</li>
        </ul>
      </div>
    </div>
  );
}

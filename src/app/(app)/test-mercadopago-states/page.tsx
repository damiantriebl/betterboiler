"use client";

import MercadoPagoEnhancedBrick from "@/components/custom/MercadoPagoEnhancedBrick";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

const testCases = [
  // CASOS DE APROBACIÓN
  {
    id: "APRO",
    title: "APRO - Pago Aprobado",
    status: "approved",
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    color: "green",
    cardNumber: "4509 9535 6623 3704",
    cvv: "123",
    expiry: "11/25",
    holder: "APRO",
    dni: "12345678",
    description: "Pago aprobado exitosamente",
    amount: 1000,
  },

  // CASOS DE RECHAZO
  {
    id: "OTHE",
    title: "OTHE - Rechazado por Error General",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0002",
    cvv: "123",
    expiry: "11/25",
    holder: "OTHE",
    dni: "12345678",
    description: "Rechazado por motivo general",
    amount: 1000,
  },
  {
    id: "FUND",
    title: "FUND - Fondos Insuficientes",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 9995",
    cvv: "123",
    expiry: "11/25",
    holder: "FUND",
    dni: "12345678",
    description: "Rechazado por fondos insuficientes",
    amount: 1000,
  },
  {
    id: "SECU",
    title: "SECU - Código de Seguridad Inválido",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0010",
    cvv: "123",
    expiry: "11/25",
    holder: "SECU",
    dni: "12345678",
    description: "Rechazado por CVV inválido",
    amount: 1000,
  },
  {
    id: "EXPI",
    title: "EXPI - Problema Fecha Vencimiento",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0069",
    cvv: "123",
    expiry: "11/25",
    holder: "EXPI",
    dni: "12345678",
    description: "Rechazado por fecha de vencimiento",
    amount: 1000,
  },
  {
    id: "FORM",
    title: "FORM - Error de Formulario",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0077",
    cvv: "123",
    expiry: "11/25",
    holder: "FORM",
    dni: "12345678",
    description: "Rechazado por error en formulario",
    amount: 1000,
  },

  // CASOS PENDIENTES
  {
    id: "CONT",
    title: "CONT - Pendiente de Pago",
    status: "pending",
    icon: <Clock className="w-4 h-4 text-yellow-600" />,
    color: "yellow",
    cardNumber: "4000 0000 0000 0051",
    cvv: "123",
    expiry: "11/25",
    holder: "CONT",
    dni: "12345678",
    description: "Pago pendiente de confirmación",
    amount: 1000,
  },

  // CASOS ESPECIALES
  {
    id: "CALL",
    title: "CALL - Requiere Autorización",
    status: "rejected",
    icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
    color: "orange",
    cardNumber: "4000 0000 0000 0036",
    cvv: "123",
    expiry: "11/25",
    holder: "CALL",
    dni: "12345678",
    description: "Rechazado - requiere validación",
    amount: 1000,
  },
  {
    id: "DUPL",
    title: "DUPL - Pago Duplicado",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0019",
    cvv: "123",
    expiry: "11/25",
    holder: "DUPL",
    dni: "12345678",
    description: "Rechazado por pago duplicado",
    amount: 1000,
  },
];

export default function TestMercadoPagoStatesPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Casos de Prueba MercadoPago</h1>
        <p className="text-muted-foreground mb-8">
          Prueba todos los estados posibles de pago con tarjetas específicas de MercadoPago
        </p>
      </div>

      {/* Información general */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Instrucciones de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">Cómo usar cada caso:</h4>
              <ul className="space-y-1">
                <li>• Usa el número de tarjeta exacto</li>
                <li>• CVV: siempre 123</li>
                <li>• Vencimiento: 11/25</li>
                <li>• Titular: usa el código del caso (APRO, FUND, etc.)</li>
                <li>• DNI: 12345678</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Estados esperados:</h4>
              <ul className="space-y-1">
                <li>
                  🟢 <strong>APRO</strong>: Muestra "¡Pago Exitoso!"
                </li>
                <li>
                  🔴 <strong>Rechazos</strong>: Muestra error específico
                </li>
                <li>
                  🟡 <strong>CONT</strong>: Muestra "Pago en Proceso"
                </li>
                <li>
                  🟠 <strong>CALL</strong>: Muestra "Requiere autorización"
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de casos de prueba */}
      <div className="grid gap-6">
        {testCases.map((testCase) => (
          <Card key={testCase.id} className={`border-l-4 border-l-${testCase.color}-500`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {testCase.icon}
                  <div>
                    <CardTitle className="text-lg">{testCase.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{testCase.description}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    testCase.status === "approved"
                      ? "default"
                      : testCase.status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                  className={
                    testCase.status === "approved"
                      ? "bg-green-500"
                      : testCase.status === "pending"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }
                >
                  {testCase.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Información de la tarjeta */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Datos de Prueba:</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm font-mono">
                    <div>
                      <strong>Tarjeta:</strong> {testCase.cardNumber}
                    </div>
                    <div>
                      <strong>CVV:</strong> {testCase.cvv}
                    </div>
                    <div>
                      <strong>Vencimiento:</strong> {testCase.expiry}
                    </div>
                    <div>
                      <strong>Titular:</strong> {testCase.holder}
                    </div>
                    <div>
                      <strong>DNI:</strong> {testCase.dni}
                    </div>
                    <div>
                      <strong>Monto:</strong> ${testCase.amount}
                    </div>
                  </div>
                </div>

                {/* Payment Brick */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Probar Pago:</h4>
                  <MercadoPagoEnhancedBrick
                    amount={testCase.amount}
                    description={`Test ${testCase.id} - ${testCase.description}`}
                    saleId={`test-${testCase.id.toLowerCase()}-${Date.now()}`}
                    buyerData={{
                      email: "test@better.com",
                      firstName: testCase.holder,
                      lastName: "Test",
                      dni: testCase.dni,
                    }}
                    onPaymentSuccess={(data) => {
                      console.log(`✅ ${testCase.id} - Pago exitoso:`, data);
                    }}
                    onPaymentError={(error) => {
                      console.log(`❌ ${testCase.id} - Error esperado:`, error);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Casos adicionales */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800">📋 Casos Adicionales Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Más casos de rechazo:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • <strong>CARD</strong>: Sin número de tarjeta
                </li>
                <li>
                  • <strong>INST</strong>: Cuotas inválidas
                </li>
                <li>
                  • <strong>LOCK</strong>: Tarjeta deshabilitada
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Casos especiales:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • <strong>CTNA</strong>: Tipo de tarjeta no permitida
                </li>
                <li>
                  • <strong>ATTE</strong>: Intentos PIN excedidos
                </li>
                <li>
                  • <strong>BLAC</strong>: Lista negra
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Estados técnicos:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • <strong>UNSU</strong>: No soportado
                </li>
                <li>
                  • <strong>TEST</strong>: Regla de montos
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

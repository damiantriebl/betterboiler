"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  Play,
  Shield,
  TestTube,
  XCircle,
} from "lucide-react";
import Link from "next/link";

const testStates = {
  success: [
    {
      code: "APRO",
      name: "Pago Aprobado",
      description: "Pago procesado exitosamente",
      icon: "✅",
      color: "green",
    },
  ],
  pending: [
    {
      code: "CONT",
      name: "Pendiente de Pago",
      description: "Esperando confirmación del pago",
      icon: "⏳",
      color: "yellow",
    },
  ],
  rejected: [
    {
      code: "OTHE",
      name: "Error General",
      description: "Rechazado por motivo general",
      icon: "❌",
      color: "red",
    },
    {
      code: "FUND",
      name: "Fondos Insuficientes",
      description: "No hay fondos suficientes",
      icon: "💰",
      color: "red",
    },
    {
      code: "SECU",
      name: "CVV Inválido",
      description: "Código de seguridad incorrecto",
      icon: "🔐",
      color: "red",
    },
    {
      code: "EXPI",
      name: "Fecha Vencida",
      description: "Problema con fecha de vencimiento",
      icon: "📅",
      color: "red",
    },
    {
      code: "FORM",
      name: "Error Formulario",
      description: "Datos del formulario incorrectos",
      icon: "📝",
      color: "red",
    },
    {
      code: "CARD",
      name: "Tarjeta Inválida",
      description: "Número de tarjeta faltante o inválido",
      icon: "💳",
      color: "red",
    },
    {
      code: "INST",
      name: "Cuotas Inválidas",
      description: "Número de cuotas no permitido",
      icon: "🔢",
      color: "red",
    },
    {
      code: "LOCK",
      name: "Tarjeta Bloqueada",
      description: "Tarjeta deshabilitada",
      icon: "🔒",
      color: "red",
    },
    {
      code: "CTNA",
      name: "Tipo No Permitido",
      description: "Tipo de tarjeta no aceptado",
      icon: "🚫",
      color: "red",
    },
    {
      code: "ATTE",
      name: "PIN Excedido",
      description: "Demasiados intentos de PIN",
      icon: "🔑",
      color: "red",
    },
    {
      code: "BLAC",
      name: "Lista Negra",
      description: "Tarjeta/usuario en lista negra",
      icon: "🖤",
      color: "red",
    },
    {
      code: "DUPL",
      name: "Pago Duplicado",
      description: "Transacción duplicada detectada",
      icon: "🔄",
      color: "red",
    },
    {
      code: "UNSU",
      name: "No Soportado",
      description: "Método de pago no soportado",
      icon: "❓",
      color: "gray",
    },
  ],
  special: [
    {
      code: "CALL",
      name: "Requiere Autorización",
      description: "Necesita validación telefónica",
      icon: "📞",
      color: "orange",
    },
    {
      code: "TEST",
      name: "Regla de Montos",
      description: "Para aplicar reglas específicas",
      icon: "🧪",
      color: "blue",
    },
  ],
};

const quickTests = [
  {
    name: "Pago Exitoso Básico",
    description: "Prueba rápida de pago aprobado",
    amount: 1000,
    card: "4509 9535 6623 3704",
    holder: "APRO",
    expected: "✅ Pago Exitoso",
    color: "green",
  },
  {
    name: "Fondos Insuficientes",
    description: "Simular rechazo por fondos",
    amount: 1000,
    card: "4000 0000 0000 9995",
    holder: "FUND",
    expected: "❌ Error: Fondos insuficientes",
    color: "red",
  },
  {
    name: "Pago Pendiente",
    description: "Simular estado pendiente",
    amount: 1000,
    card: "4000 0000 0000 0051",
    holder: "CONT",
    expected: "⏳ Pago en Proceso",
    color: "yellow",
  },
];

export default function MercadoPagoTestSuitePage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🧪 MercadoPago Test Suite
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Suite completa de testing para todos los estados de pago de MercadoPago
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="bg-green-50">
            ✅ 1 Estado Exitoso
          </Badge>
          <Badge variant="outline" className="bg-red-50">
            ❌ 12 Estados de Rechazo
          </Badge>
          <Badge variant="outline" className="bg-yellow-50">
            ⏳ 1 Estado Pendiente
          </Badge>
          <Badge variant="outline" className="bg-orange-50">
            📞 2 Estados Especiales
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Play className="w-5 h-5" />🚀 Pruebas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/test-mercadopago">
                  <TestTube className="w-4 h-4 mr-2" />
                  Pruebas Básicas
                </Link>
              </Button>
              <p className="text-xs text-blue-700">3 casos principales con UI simplificada</p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                <Link href="/test-mercadopago-states">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Estados Principales
                </Link>
              </Button>
              <p className="text-xs text-purple-700">9 casos más comunes organizados</p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Link href="/test-mercadopago-states-extended">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Suite Completa
                </Link>
              </Button>
              <p className="text-xs text-emerald-700">Todos los 16 estados posibles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Cases Overview */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Estados de Éxito */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />✅ Estados de Éxito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testStates.success.map((state) => (
                <div
                  key={state.code}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{state.icon}</span>
                    <div>
                      <div className="font-medium text-green-900">
                        {state.code} - {state.name}
                      </div>
                      <div className="text-sm text-green-700">{state.description}</div>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">APPROVED</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estados Pendientes */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />⏳ Estados Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testStates.pending.map((state) => (
                <div
                  key={state.code}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{state.icon}</span>
                    <div>
                      <div className="font-medium text-yellow-900">
                        {state.code} - {state.name}
                      </div>
                      <div className="text-sm text-yellow-700">{state.description}</div>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500 text-white">PENDING</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estados de Rechazo */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <XCircle className="w-5 h-5" />❌ Estados de Rechazo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {testStates.rejected.map((state) => (
              <div
                key={state.code}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{state.icon}</span>
                  <div>
                    <div className="font-medium text-red-900">
                      {state.code} - {state.name}
                    </div>
                    <div className="text-xs text-red-700">{state.description}</div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">
                  REJECTED
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estados Especiales */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />🎭 Estados Especiales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testStates.special.map((state) => (
              <div
                key={state.code}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{state.icon}</span>
                  <div>
                    <div className="font-medium text-orange-900">
                      {state.code} - {state.name}
                    </div>
                    <div className="text-sm text-orange-700">{state.description}</div>
                  </div>
                </div>
                <Badge
                  className={state.code === "CALL" ? "bg-orange-500" : "bg-blue-500"}
                  variant="secondary"
                >
                  {state.code === "CALL" ? "NEEDS_AUTH" : "TEST_RULE"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pruebas Rápidas con Datos */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <TestTube className="w-5 h-5" />⚡ Datos para Pruebas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickTests.map((test, testIndex) => (
              <div
                key={`test-${testIndex}-${test.name.replace(/\s+/g, "-").toLowerCase()}`}
                className={`p-4 rounded-lg border-l-4 border-l-${test.color}-500 bg-white`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{test.name}</h4>
                  <Badge variant="outline" className={`bg-${test.color}-50`}>
                    {test.expected}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{test.description}</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <strong>Tarjeta:</strong> <span className="text-blue-600">{test.card}</span>
                    <br />
                    <strong>CVV:</strong> <span className="text-green-600">123</span>
                    <br />
                    <strong>Vencimiento:</strong> <span className="text-purple-600">11/25</span>
                  </div>
                  <div>
                    <strong>Titular:</strong> <span className="text-orange-600">{test.holder}</span>
                    <br />
                    <strong>DNI:</strong> <span className="text-gray-600">12345678</span>
                    <br />
                    <strong>Monto:</strong> <span className="text-green-700">${test.amount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📖 Guía de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-3">🎯 Cómo usar los casos de prueba:</h4>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Selecciona una página de pruebas</li>
                <li>Usa EXACTAMENTE los números de tarjeta mostrados</li>
                <li>Titular debe ser el código del caso (ej: APRO, FUND)</li>
                <li>CVV siempre 123, vencimiento 11/25, DNI 12345678</li>
                <li>Observa el resultado esperado en la UI</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-3">🔍 Debugging y validación:</h4>
              <ul className="space-y-2">
                <li>• Abre DevTools (F12) para ver logs detallados</li>
                <li>• Busca logs que empiecen con el código del caso</li>
                <li>• El webhook se dispara para todos los casos</li>
                <li>• Verifica el status devuelto en la respuesta</li>
                <li>• Cada estado tiene una UI específica</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enlaces útiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />🔗 Enlaces Útiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Documentación MercadoPago:</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <a
                    href="https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/test/test-cards"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Tarjetas de Prueba <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/test"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Testing Payment Brick <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Configuración Local:</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/configuration" className="text-blue-600 hover:underline">
                    Configurar MercadoPago
                  </Link>
                </li>
                <li>
                  <Link href="/sales" className="text-blue-600 hover:underline">
                    Crear Venta de Prueba
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

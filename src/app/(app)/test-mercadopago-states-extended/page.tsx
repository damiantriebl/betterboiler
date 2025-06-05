"use client";

import MercadoPagoEnhancedBrick from "@/components/custom/MercadoPagoEnhancedBrick";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Shield,
  XCircle,
} from "lucide-react";

const allTestCases = [
  // ✅ CASO DE APROBACIÓN
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
    description: "✅ Pago aprobado exitosamente",
    amount: 1000,
    category: "success",
  },

  // ❌ CASOS DE RECHAZO GENERAL
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
    description: "❌ Rechazado por motivo general no especificado",
    amount: 1000,
    category: "rejected",
  },

  // 💰 CASOS DE FONDOS
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
    description: "💰 Rechazado por fondos insuficientes en la tarjeta",
    amount: 1000,
    category: "rejected",
  },

  // 🔐 CASOS DE SEGURIDAD
  {
    id: "SECU",
    title: "SECU - Código de Seguridad Inválido",
    status: "rejected",
    icon: <Shield className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0010",
    cvv: "123",
    expiry: "11/25",
    holder: "SECU",
    dni: "12345678",
    description: "🔐 Rechazado por código CVV inválido",
    amount: 1000,
    category: "security",
  },

  // 📅 CASOS DE FECHA
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
    description: "📅 Rechazado por problema en fecha de vencimiento",
    amount: 1000,
    category: "rejected",
  },

  // 📝 CASOS DE FORMULARIO
  {
    id: "FORM",
    title: "FORM - Error de Formulario",
    status: "rejected",
    icon: <AlertCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0077",
    cvv: "123",
    expiry: "11/25",
    holder: "FORM",
    dni: "12345678",
    description: "📝 Rechazado por error en los datos del formulario",
    amount: 1000,
    category: "form",
  },

  // 💳 CASOS DE TARJETA
  {
    id: "CARD",
    title: "CARD - Falta Número de Tarjeta",
    status: "rejected",
    icon: <CreditCard className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0093",
    cvv: "123",
    expiry: "11/25",
    holder: "CARD",
    dni: "12345678",
    description: "💳 Rechazado por falta de número de tarjeta válido",
    amount: 1000,
    category: "card",
  },

  // 🔢 CASOS DE CUOTAS
  {
    id: "INST",
    title: "INST - Cuotas Inválidas",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0101",
    cvv: "123",
    expiry: "11/25",
    holder: "INST",
    dni: "12345678",
    description: "🔢 Rechazado por número de cuotas inválidas",
    amount: 1000,
    category: "installments",
  },

  // 🔒 CASOS DE BLOQUEO
  {
    id: "LOCK",
    title: "LOCK - Tarjeta Deshabilitada",
    status: "rejected",
    icon: <Shield className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0119",
    cvv: "123",
    expiry: "11/25",
    holder: "LOCK",
    dni: "12345678",
    description: "🔒 Rechazado por tarjeta deshabilitada o bloqueada",
    amount: 1000,
    category: "security",
  },

  // 🚫 CASOS DE RESTRICCIÓN
  {
    id: "CTNA",
    title: "CTNA - Tipo de Tarjeta No Permitida",
    status: "rejected",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0135",
    cvv: "123",
    expiry: "11/25",
    holder: "CTNA",
    dni: "12345678",
    description: "🚫 Rechazado por tipo de tarjeta no permitida",
    amount: 1000,
    category: "restriction",
  },

  // 🔑 CASOS DE PIN
  {
    id: "ATTE",
    title: "ATTE - Intentos PIN Excedidos",
    status: "rejected",
    icon: <Shield className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0143",
    cvv: "123",
    expiry: "11/25",
    holder: "ATTE",
    dni: "12345678",
    description: "🔑 Rechazado por exceder intentos de PIN",
    amount: 1000,
    category: "security",
  },

  // 🖤 CASOS DE LISTA NEGRA
  {
    id: "BLAC",
    title: "BLAC - En Lista Negra",
    status: "rejected",
    icon: <Shield className="w-4 h-4 text-red-600" />,
    color: "red",
    cardNumber: "4000 0000 0000 0151",
    cvv: "123",
    expiry: "11/25",
    holder: "BLAC",
    dni: "12345678",
    description: "🖤 Rechazado por estar en lista negra",
    amount: 1000,
    category: "security",
  },

  // ⏳ CASOS PENDIENTES
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
    description: "⏳ Pago pendiente de confirmación",
    amount: 1000,
    category: "pending",
  },

  // 📞 CASOS DE AUTORIZACIÓN
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
    description: "📞 Rechazado - requiere validación telefónica",
    amount: 1000,
    category: "auth",
  },

  // 🔄 CASOS DE DUPLICACIÓN
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
    description: "🔄 Rechazado por pago duplicado detectado",
    amount: 1000,
    category: "duplicate",
  },

  // ❓ CASOS ESPECIALES
  {
    id: "UNSU",
    title: "UNSU - No Soportado",
    status: "rejected",
    icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
    color: "gray",
    cardNumber: "4000 0000 0000 0176",
    cvv: "123",
    expiry: "11/25",
    holder: "UNSU",
    dni: "12345678",
    description: "❓ Método de pago no soportado",
    amount: 1000,
    category: "unsupported",
  },

  // 🧪 CASOS DE TESTING
  {
    id: "TEST",
    title: "TEST - Regla de Montos",
    status: "rejected",
    icon: <AlertCircle className="w-4 h-4 text-blue-600" />,
    color: "blue",
    cardNumber: "4000 0000 0000 0184",
    cvv: "123",
    expiry: "11/25",
    holder: "TEST",
    dni: "12345678",
    description: "🧪 Usado para aplicar reglas específicas de montos",
    amount: 1000,
    category: "test",
  },
];

// Agrupar casos por categoría
const categorizedCases = {
  success: allTestCases.filter((c) => c.category === "success"),
  rejected: allTestCases.filter((c) => c.category === "rejected"),
  security: allTestCases.filter((c) => c.category === "security"),
  card: allTestCases.filter((c) => c.category === "card"),
  form: allTestCases.filter((c) => c.category === "form"),
  pending: allTestCases.filter((c) => c.category === "pending"),
  auth: allTestCases.filter((c) => c.category === "auth"),
  special: allTestCases.filter((c) =>
    ["duplicate", "restriction", "installments", "unsupported", "test"].includes(c.category),
  ),
};

export default function TestMercadoPagoStatesExtendedPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">🧪 Casos de Prueba MercadoPago - Completo</h1>
        <p className="text-muted-foreground mb-8">
          Suite completa de testing con TODOS los estados posibles de MercadoPago
        </p>
      </div>

      {/* Resumen de casos */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📊 Resumen de Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {categorizedCases.success.length}
              </div>
              <div className="text-sm text-green-700">Exitosos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {categorizedCases.rejected.length +
                  categorizedCases.security.length +
                  categorizedCases.card.length +
                  categorizedCases.form.length +
                  categorizedCases.special.length}
              </div>
              <div className="text-sm text-red-700">Rechazados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {categorizedCases.pending.length}
              </div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {categorizedCases.auth.length}
              </div>
              <div className="text-sm text-orange-700">Autorización</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Instrucciones Completas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">🎯 Datos de Prueba:</h4>
              <ul className="space-y-1">
                <li>
                  • <strong>CVV:</strong> Siempre 123
                </li>
                <li>
                  • <strong>Vencimiento:</strong> 11/25
                </li>
                <li>
                  • <strong>DNI:</strong> 12345678
                </li>
                <li>
                  • <strong>Titular:</strong> Código del caso
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎨 Estados Visuales:</h4>
              <ul className="space-y-1">
                <li>
                  🟢 <strong>APRO</strong>: UI verde de éxito
                </li>
                <li>
                  🔴 <strong>Rechazos</strong>: Toast de error
                </li>
                <li>
                  🟡 <strong>CONT</strong>: UI amarilla pendiente
                </li>
                <li>
                  🟠 <strong>CALL</strong>: Requiere acción
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔍 Debugging:</h4>
              <ul className="space-y-1">
                <li>• Abre DevTools (F12)</li>
                <li>• Busca logs con prefijo del caso</li>
                <li>• Webhook se dispara siempre</li>
                <li>• Verifica status devuelto</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Casos Exitosos */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-green-700">✅ Casos de Éxito</h2>
        <div className="grid gap-4">
          {categorizedCases.success.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>

      {/* Casos de Seguridad */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-red-700">🔐 Casos de Seguridad</h2>
        <div className="grid gap-4">
          {categorizedCases.security.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>

      {/* Casos de Tarjeta */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-red-700">💳 Casos de Tarjeta</h2>
        <div className="grid gap-4">
          {categorizedCases.card.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>

      {/* Casos Pendientes */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-yellow-700">⏳ Casos Pendientes</h2>
        <div className="grid gap-4">
          {categorizedCases.pending.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>

      {/* Casos de Autorización */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-orange-700">📞 Casos de Autorización</h2>
        <div className="grid gap-4">
          {categorizedCases.auth.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>

      {/* Casos Especiales */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-purple-700">🎭 Casos Especiales</h2>
        <div className="grid gap-4">
          {categorizedCases.special.map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>

      {/* Casos Restantes */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-700">❌ Otros Rechazos</h2>
        <div className="grid gap-4">
          {[...categorizedCases.rejected, ...categorizedCases.form].map((testCase) => (
            <TestCaseCard key={testCase.id} testCase={testCase} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Componente para cada caso de prueba
function TestCaseCard({ testCase }: { testCase: any }) {
  return (
    <Card className={`border-l-4 border-l-${testCase.color}-500`}>
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
            <h4 className="font-semibold text-sm">📋 Datos de Prueba:</h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm font-mono">
              <div>
                <strong>Tarjeta:</strong>{" "}
                <span className="text-blue-600">{testCase.cardNumber}</span>
              </div>
              <div>
                <strong>CVV:</strong> <span className="text-green-600">{testCase.cvv}</span>
              </div>
              <div>
                <strong>Vencimiento:</strong>{" "}
                <span className="text-purple-600">{testCase.expiry}</span>
              </div>
              <div>
                <strong>Titular:</strong> <span className="text-orange-600">{testCase.holder}</span>
              </div>
              <div>
                <strong>DNI:</strong> <span className="text-gray-600">{testCase.dni}</span>
              </div>
              <div>
                <strong>Monto:</strong> <span className="text-green-700">${testCase.amount}</span>
              </div>
            </div>
          </div>

          {/* Payment Brick */}
          <div>
            <h4 className="font-semibold text-sm mb-3">💳 Probar Pago:</h4>
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
                console.log(`✅ ${testCase.id} - Pago procesado:`, data);
              }}
              onPaymentError={(error) => {
                console.log(`❌ ${testCase.id} - Error (esperado):`, error);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

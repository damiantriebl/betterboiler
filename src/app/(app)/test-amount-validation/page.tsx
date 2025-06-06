"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DollarSign, Smartphone } from "lucide-react";
import { useState } from "react";

export default function TestAmountValidationPage() {
  const [customAmount, setCustomAmount] = useState("");
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const handleCustomTest = () => {
    const amount = Number.parseInt(customAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({
        title: "❌ Monto inválido",
        description: "Ingresa un monto válido en centavos",
        variant: "destructive",
      });
      return;
    }

    setTestResults((prev) => ({
      ...prev,
      custom: {
        amount: amount,
        amountInPesos: amount / 100,
        timestamp: new Date().toISOString(),
      },
    }));
  };

  const testCases = [
    {
      id: "too_low_150",
      title: "Bajo: 150 centavos",
      amount: 150,
      expectedResult: "❌ Error - Mínimo $15.00",
      description: "150 centavos = $1.50 (menor al mínimo)",
      color: "red",
    },
    {
      id: "minimum_valid",
      title: "Mínimo Válido: 1500 centavos",
      amount: 1500,
      expectedResult: "✅ Válido - $15.00",
      description: "1500 centavos = $15.00 (mínimo aceptado)",
      color: "green",
    },
    {
      id: "normal_2000",
      title: "Normal: 2000 centavos",
      amount: 2000,
      expectedResult: "✅ Válido - $20.00",
      description: "2000 centavos = $20.00 (válido)",
      color: "green",
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          Test Validación de Montos Point Smart
        </h1>
        <p className="text-muted-foreground mb-8">
          Pruebas para validar el manejo correcto de montos mínimos en Point Smart ($15.00)
        </p>
      </div>

      {/* Información importante */}
      <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />📊 Conversión de Montos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-yellow-800">
            <div>
              <h4 className="font-semibold mb-2">💰 Sistema de Montos:</h4>
              <ul className="space-y-1">
                <li>
                  • <strong>Frontend:</strong> Envía montos en CENTAVOS
                </li>
                <li>
                  • <strong>Backend:</strong> Convierte a PESOS (÷100)
                </li>
                <li>
                  • <strong>Point Smart:</strong> Requiere mínimo $15.00
                </li>
                <li>
                  • <strong>Equivalencia:</strong> 1500 centavos = $15.00
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔄 Ejemplos de Conversión:</h4>
              <ul className="space-y-1">
                <li>• 150 centavos → $1.50 ❌</li>
                <li>• 1000 centavos → $10.00 ❌</li>
                <li>• 1500 centavos → $15.00 ✅</li>
                <li>• 2000 centavos → $20.00 ✅</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test personalizado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600" />🧪 Test Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="customAmount" className="block text-sm font-medium mb-2">
                Monto en centavos:
              </label>
              <input
                id="customAmount"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Ej: 150, 1500, 2500..."
                className="w-full px-3 py-2 border rounded-lg"
                min="1"
              />
              {customAmount && (
                <p className="text-xs text-gray-600 mt-1">
                  = ${(Number.parseInt(customAmount) / 100).toFixed(2)} pesos
                </p>
              )}
            </div>
            <Button
              onClick={handleCustomTest}
              disabled={!customAmount}
              className="bg-purple-600 hover:bg-purple-700"
            >
              🧪 Probar Monto
            </Button>
          </div>

          {testResults.custom && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold mb-2">📊 Resultado del Test:</h4>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Monto enviado:</strong> {testResults.custom.amount} centavos
                </p>
                <p>
                  <strong>Equivale a:</strong> ${testResults.custom.amountInPesos.toFixed(2)} pesos
                </p>
                <p>
                  <strong>Estado:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      testResults.custom.amountInPesos >= 15
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {testResults.custom.amountInPesos >= 15 ? "✅ VÁLIDO" : "❌ INSUFICIENTE"}
                  </span>
                </p>
                {testResults.custom.amountInPesos < 15 && (
                  <p className="text-red-600 text-xs">
                    <strong>Mínimo requerido:</strong> 1500 centavos ($15.00)
                  </p>
                )}
              </div>

              {testResults.custom.amountInPesos >= 15 && (
                <div className="mt-4">
                  <PointSmartIntegration
                    amount={testResults.custom.amount}
                    description={`Test personalizado - ${testResults.custom.amountInPesos.toFixed(2)} pesos`}
                    saleId={`custom-test-${Date.now()}`}
                    onPaymentSuccess={(data) => {
                      console.log("✅ Test personalizado exitoso:", data);
                      toast({
                        title: "✅ Pago exitoso",
                        description: `Monto: $${testResults.custom.amountInPesos.toFixed(2)}`,
                        variant: "default",
                      });
                    }}
                    onPaymentError={(error) => {
                      console.error("❌ Error en test personalizado:", error);
                      toast({
                        title: "❌ Error en pago",
                        description: error.error || "Error desconocido",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tests de casos específicos */}
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">🧪 Casos de Prueba</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {testCases.map((testCase) => (
            <Card
              key={testCase.id}
              className={`${testCase.color === "red" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{testCase.title}</span>
                  <Badge
                    className={
                      testCase.color === "red"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }
                  >
                    ${(testCase.amount / 100).toFixed(2)}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">{testCase.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs space-y-1">
                    <p>
                      <strong>Monto:</strong> {testCase.amount} centavos
                    </p>
                    <p>
                      <strong>Equivale a:</strong> ${(testCase.amount / 100).toFixed(2)} pesos
                    </p>
                    <p>
                      <strong>Resultado esperado:</strong> {testCase.expectedResult}
                    </p>
                  </div>

                  {testCase.amount >= 1500 ? (
                    <PointSmartIntegration
                      amount={testCase.amount}
                      description={`${testCase.title} - $${(testCase.amount / 100).toFixed(2)}`}
                      saleId={`test-${testCase.id}`}
                      onPaymentSuccess={(data) => {
                        console.log(`✅ ${testCase.id} exitoso:`, data);
                        toast({
                          title: "✅ Test exitoso",
                          description: `${testCase.title}`,
                          variant: "default",
                        });
                      }}
                      onPaymentError={(error) => {
                        console.error(`❌ Error en ${testCase.id}:`, error);
                        toast({
                          title: "❌ Error en test",
                          description: error.error || "Error desconocido",
                          variant: "destructive",
                        });
                      }}
                    />
                  ) : (
                    <div className="p-3 bg-red-100 border border-red-200 rounded text-center">
                      <p className="text-red-800 text-sm font-medium">
                        ❌ Monto insuficiente para Point Smart
                      </p>
                      <p className="text-red-600 text-xs mt-1">
                        Mínimo requerido: $15.00 (1500 centavos)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, HelpCircle, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentFailurePage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card className="text-center">
        <CardHeader className="pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Pago No Procesado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">No pudimos procesar tu pago</p>
            <p className="text-muted-foreground">
              El pago fue rechazado o cancelado. No se ha efectuado ningún cargo.
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Posibles causas:
            </h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Fondos insuficientes en la tarjeta</li>
              <li>• Datos de tarjeta incorrectos</li>
              <li>• Tarjeta vencida o bloqueada</li>
              <li>• Límite de compra superado</li>
              <li>• Pago cancelado por el usuario</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">¿Qué puedes hacer?</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Verificar los datos de tu tarjeta</li>
              <li>• Intentar con otro método de pago</li>
              <li>• Contactar a tu banco para verificar el estado</li>
              <li>• Intentar el pago nuevamente</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/sales" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al Catálogo
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sales" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Intentar Nuevamente
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

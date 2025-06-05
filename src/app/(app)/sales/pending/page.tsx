import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PaymentPendingPage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card className="text-center">
        <CardHeader className="pb-6">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl text-yellow-600">Pago Pendiente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Tu pago está siendo procesado</p>
            <p className="text-muted-foreground">
              Estamos esperando la confirmación del pago. Te notificaremos cuando se complete.
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">¿Qué significa pago pendiente?</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• El pago está siendo verificado por el banco</li>
              <li>• Puede tardar unos minutos en confirmarse</li>
              <li>• Recibirás una notificación cuando se complete</li>
              <li>• No es necesario realizar el pago nuevamente</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">¿Qué sigue ahora?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Mantén esta ventana abierta unos minutos</li>
              <li>• Verifica tu email para actualizaciones</li>
              <li>• Puedes seguir el estado desde tu cuenta</li>
              <li>• Si no se confirma, contacta soporte</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/sales" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al Catálogo
              </Link>
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar Estado
            </Button>
            <Button asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Ir al Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

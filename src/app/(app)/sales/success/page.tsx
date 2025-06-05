import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Home } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card className="text-center">
        <CardHeader className="pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">¡Pago Exitoso!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Tu pago se ha procesado correctamente</p>
            <p className="text-muted-foreground">
              Recibirás un email de confirmación con los detalles de tu compra.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">¿Qué sigue ahora?</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Tu orden está siendo procesada</li>
              <li>• Te contactaremos para coordinar la entrega</li>
              <li>• Puedes seguir el estado desde tu cuenta</li>
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

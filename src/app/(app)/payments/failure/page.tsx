"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FailureContent() {
    const searchParams = useSearchParams();
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-red-600">
                        Pago No Procesado
                    </CardTitle>
                    <CardDescription>
                        Hubo un problema al procesar tu pago
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {paymentId && (
                        <div className="text-sm">
                            <span className="font-medium">ID de Pago:</span> {paymentId}
                        </div>
                    )}
                    {status && (
                        <div className="text-sm">
                            <span className="font-medium">Estado:</span> {status}
                        </div>
                    )}
                    {externalReference && (
                        <div className="text-sm">
                            <span className="font-medium">Referencia:</span> {externalReference}
                        </div>
                    )}

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800">
                            No se realizó ningún cargo. Puedes intentar nuevamente con otro método de pago.
                        </p>
                    </div>

                    <div className="pt-4 space-y-2">
                        <Button asChild className="w-full">
                            <Link href="/sales">
                                Intentar Nuevamente
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard">
                                Ir al Dashboard
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function PaymentFailurePage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <FailureContent />
        </Suspense>
    );
} 
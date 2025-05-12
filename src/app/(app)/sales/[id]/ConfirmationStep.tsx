"use client";

import { Loader2 } from "lucide-react";
import { formatPrice } from "./utils";

interface ConfirmationStepProps {
    loading: boolean;
    moto: {
        brand?: { name: string } | null;
        model?: { name: string } | null;
        year?: number | null;
        retailPrice?: number;
        currency?: string;
    };
    isReserved: boolean;
    reservationAmount: number;
    buyerData: {
        nombre: string;
        apellido: string;
    };
    paymentData: {
        metodoPago: string;
        cuotas?: number;
    };
}

export default function ConfirmationStep({
    loading,
    moto,
    isReserved,
    reservationAmount,
    buyerData,
    paymentData,
}: ConfirmationStepProps) {
    return (
        <div className="text-center space-y-4">
            {loading ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Procesando la venta con la API del gobierno...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-green-600">¡Felicitaciones!</h3>
                    <p className="text-lg">
                        La moto {moto?.brand?.name} {moto?.model?.name} fue vendida exitosamente.
                    </p>
                    {isReserved && (
                        <div className="p-4 bg-blue-50 rounded-lg mb-4">
                            <p>
                                Se aplicó un monto de reserva de{" "}
                                <span className="font-bold">{formatPrice(reservationAmount)}</span>.
                            </p>
                        </div>
                    )}
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="font-medium mb-2">Resumen de la venta:</p>
                        <p>
                            <span className="font-medium">Cliente:</span> {buyerData.nombre}{" "}
                            {buyerData.apellido}
                        </p>
                        <p>
                            <span className="font-medium">Moto:</span> {moto?.brand?.name}{" "}
                            {moto?.model?.name} ({moto?.year})
                        </p>
                        <p>
                            <span className="font-medium">Precio:</span>{" "}
                            {formatPrice(moto?.retailPrice ?? 0, moto?.currency)}
                        </p>
                        <p>
                            <span className="font-medium">Método de pago:</span>{" "}
                            {paymentData.metodoPago}
                        </p>
                        {paymentData.metodoPago === "tarjeta" && paymentData.cuotas && paymentData.cuotas > 1 && (
                            <p>
                                <span className="font-medium">Cuotas:</span> {paymentData.cuotas}
                            </p>
                        )}
                        <p className="mt-2">
                            Los documentos de la venta serán enviados al email registrado.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
} 
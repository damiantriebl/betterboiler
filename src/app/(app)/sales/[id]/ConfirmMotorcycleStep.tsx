"use client";

import type { MotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id";
import { Button } from "@/components/ui/button";
import { formatPrice } from "./utils";

interface ConfirmMotorcycleStepProps {
  moto: MotorcycleWithRelations;
  isReserved: boolean;
  reservationAmount: number;
  reservationCurrency: string;
  onEditInfo: () => void;
}

export default function ConfirmMotorcycleStep({
  moto,
  isReserved,
  reservationAmount,
  reservationCurrency,
  onEditInfo,
}: ConfirmMotorcycleStepProps) {
  return (
    <div className="space-y-6">
      {isReserved && (
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mb-4">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Moto Reservada</h3>
          <p>
            Esta moto tiene una reserva de{" "}
            <span className="font-bold">{formatPrice(reservationAmount)}</span>.
          </p>
          <p className="text-sm text-blue-600">
            El monto de la reserva será descontado del precio final.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Detalles de la Moto</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Marca:</span> {moto?.brand?.name || "No disponible"}
            </p>
            <p>
              <span className="font-medium">Modelo:</span> {moto?.model?.name || "No disponible"}
            </p>
            <p>
              <span className="font-medium">Año:</span> {moto?.year || "No disponible"}
            </p>
            <p>
              <span className="font-medium">Cilindrada:</span>{" "}
              {moto?.displacement || "No disponible"}cc
            </p>
            <p>
              <span className="font-medium">Número de Chasis:</span>{" "}
              {moto?.chassisNumber || "No disponible"}
            </p>
            <p>
              <span className="font-medium">Color:</span> {moto?.color?.name || "No disponible"}
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Estado y Ubicación</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Estado:</span>{" "}
              {moto?.state === "STOCK" ? "Disponible" : moto?.state}
            </p>
            <p>
              <span className="font-medium">Kilometraje:</span> {moto?.mileage || 0}km
            </p>
            <p>
              <span className="font-medium">Estado de Venta:</span> {moto?.state || "No disponible"}
            </p>
            <p>
              <span className="font-medium">Ubicación:</span>{" "}
              {moto?.branch?.name || "No disponible"}
            </p>
            <p>
              <span className="font-medium">Precio:</span> {formatPrice(moto?.retailPrice ?? 0)}
            </p>
          </div>
        </div>
      </div>
      <Button onClick={onEditInfo} variant="outline" className="mt-4">
        Editar Información
      </Button>
    </div>
  );
}

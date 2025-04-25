"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import {
  type Motorcycle,
  MotorcycleState,
  type Brand,
  type Model,
  type Sucursal,
  type MotoColor,
  type Reservation,
} from "@prisma/client";
import {
  X,
  RotateCcw,
  Play,
  Pause,
  DollarSign,
  Trash2,
  BookmarkPlus,
  Pencil,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePriceDisplayStore } from "@/stores/price-display-store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";
import { ClientDetail } from "./ClientDetail";

export interface MotorcycleWithDetails extends Motorcycle {
  brand?: Brand | null;
  model?: Model | null;
  branch?: Sucursal | null;
  color?: MotoColor | null;
  reservations?: (Reservation & {
    clientId: string;
    amount?: number;
    createdAt?: Date | string;
    status: string;
    paymentMethod?: string | null;
    notes?: string | null
  })[];
  reservation?: {
    id: number;
    clientId: string;
    amount?: number;
    createdAt?: Date | string;
    status: string;
    paymentMethod?: string | null;
    notes?: string | null
  } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  motorcycle: MotorcycleWithDetails | null;
  onToggleStatus: (id: number, status: MotorcycleState) => void;
  onSetEliminado: (id: number) => void;
  onAction: (action: "vender" | "reservar" | "eliminarLogico", moto: MotorcycleWithDetails) => void;
  onCancelProcess: (id: number) => void;
  onNavigateToSale: (id: string) => void;
  onEdit: (id: number) => void;
  estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }>;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <span className="text-sm font-medium text-muted-foreground">{label}:</span>{" "}
    <span className="text-sm">{value ?? "N/A"}</span>
  </div>
);

export function MotorcycleDetailModal({
  isOpen,
  onClose,
  motorcycle,
  onToggleStatus,
  onSetEliminado,
  onAction,
  onCancelProcess,
  onNavigateToSale,
  onEdit,
  estadoVentaConfig,
}: Props) {
  if (!isOpen || !motorcycle) return null;

  console.log('MotorcycleDetailModal - Full motorcycle data:', JSON.stringify(motorcycle, null, 2));

  const { id, state, currency } = motorcycle;
  const isStock = state === MotorcycleState.STOCK;
  const isPausado = state === MotorcycleState.PAUSADO;
  const isReservado = state === MotorcycleState.RESERVADO;
  const isProcesando = state === MotorcycleState.PROCESANDO;
  const isEliminado = state === MotorcycleState.ELIMINADO;
  const canSell = isStock;
  const canPause = isStock || isPausado;

  const { clientId, rawReservationData } = useMemo(() => {
    let derivedClientId: string | null = null;
    let derivedReservationData = null;
    if (isProcesando) {
      derivedClientId = motorcycle.clientId ?? null;
    } else if (isReservado) {
      const active = motorcycle.reservations?.find(r => r.status === 'active') ?? motorcycle.reservation;
      derivedClientId = active?.clientId ?? null;
      derivedReservationData = active ?? null;
    }
    return { clientId: derivedClientId, rawReservationData: derivedReservationData };
  }, [isProcesando, isReservado, motorcycle]);

  const shouldShowWholesale = usePriceDisplayStore(s => s.showWholesale());
  const shouldShowCost = usePriceDisplayStore(s => s.showCost());

  const renderActions = () => {
    if (isEliminado) return (
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-100" onClick={() => onToggleStatus(id, state)}>
        <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
      </Button>
    );
    if (isProcesando) return (
      <>
        <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-100" onClick={() => onNavigateToSale(id.toString())}>
          <Play className="mr-2 h-4 w-4" /> Continuar proceso
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-100" onClick={() => onCancelProcess(id)}>
          <Trash2 className="mr-2 h-4 w-4" /> Cancelar proceso
        </Button>
      </>
    );
    if (isReservado) return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-600 hover:bg-red-100"
          onClick={() => onCancelProcess(id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Quitar Reserva
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-600 hover:bg-blue-100"
          onClick={() => onNavigateToSale(id.toString())}
        >
          <Play className="mr-2 h-4 w-4" /> Continuar Compra
        </Button>
      </>
    );

    return (
      <>
        {canSell && <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-100" onClick={() => onAction('vender', motorcycle)}>
          <DollarSign className="mr-2 h-4 w-4" /> Vender
        </Button>}
        {!isReservado && <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-100" disabled={isPausado} onClick={() => onAction('reservar', motorcycle)}>
          <BookmarkPlus className="mr-2 h-4 w-4" /> Reservar
        </Button>}
        {canPause && <Button variant="outline" size="sm" className={cn(isPausado ? 'text-green-600 border-green-600 hover:bg-green-100' : 'text-yellow-600 border-yellow-600 hover:bg-yellow-100')} onClick={() => onToggleStatus(id, state)}>
          {isPausado ? <><Play className="mr-2 h-4 w-4" /> Activar</> : <><Pause className="mr-2 h-4 w-4" /> Pausar</>}
        </Button>}
        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-100" onClick={() => onSetEliminado(id)}>
          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
        </Button>
      </>
    );
  };

  const renderClientSection = () => {
    if (!clientId) return null;
    return (
      <div className="p-4 border rounded-md bg-blue-50">
        <h3 className="text-base font-semibold mb-2 border-b pb-1 flex items-center">
          <Info className="mr-2 h-4 w-4 text-blue-600" />
          {isReservado ? 'Detalles de la Reserva' : 'En Proceso Para'}
        </h3>
        <ClientDetail
          clientId={clientId}
          currency={rawReservationData?.currency || "USD"}
          reservationData={useMemo(() => rawReservationData ? {
            amount: rawReservationData.amount,
            createdAt: rawReservationData.createdAt,
            paymentMethod: rawReservationData.paymentMethod,
            notes: rawReservationData.notes
          } : undefined, [rawReservationData])}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-bold">Detalles de la Moto</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 border-b pb-1">ID: {id} - {motorcycle.brand?.name} {motorcycle.model?.name} ({motorcycle.year})</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <DetailItem label="Estado" value={<Badge variant="outline" className={cn("font-normal whitespace-nowrap text-xs px-1.5 py-0.5", estadoVentaConfig[state].className)}>{estadoVentaConfig[state].label}</Badge>} />
                <DetailItem label="Año" value={motorcycle.year} />
                <DetailItem label="Kilometraje" value={`${motorcycle.mileage} km`} />
                <DetailItem label="Cilindrada" value={`${motorcycle.displacement ?? '-'} cc`} />
                <DetailItem label="Color" value={motorcycle.color?.name} />
                <DetailItem label="Ubicación" value={motorcycle.branch?.name} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2 border-b pb-1">Precios ({currency})</h3>
              <div className="space-y-1">
                <DetailItem label="Precio Venta" value={formatPrice(motorcycle.retailPrice, currency)} />
                {shouldShowWholesale && motorcycle.wholesalePrice && <DetailItem label="Precio Mayorista" value={formatPrice(motorcycle.wholesalePrice)} />}
                {shouldShowCost && motorcycle.costPrice && <DetailItem label="Precio Costo" value={formatPrice(motorcycle.costPrice)} />}
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2 border-b pb-1">Identificación</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <DetailItem label="Nro. Chasis" value={motorcycle.chassisNumber} />
                <DetailItem label="Nro. Motor" value={motorcycle.engineNumber ?? 'N/A'} />
                <DetailItem label="Patente" value={motorcycle.licensePlate} />
              </div>
            </div>
            {(isReservado || isProcesando) && renderClientSection()}
            {motorcycle.observations && (
              <div>
                <h3 className="text-base font-semibold mb-2 border-b pb-1">Observaciones</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{motorcycle.observations}</p>
              </div>
            )}
          </div>
          <div className="md:col-span-1 flex flex-col">
            {motorcycle.imageUrl ? (
              <div className="mb-4 rounded-lg overflow-hidden border aspect-video">
                <img src={motorcycle.imageUrl} alt={`Moto ID ${id}`} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mb-4 rounded-lg border aspect-video bg-muted flex items-center justify-center text-muted-foreground">Sin imagen</div>
            )}
            <div className="mt-auto pt-4 border-t">
              <h4 className="mb-3 text-base font-semibold">Acciones Rápidas</h4>
              <div className="flex flex-col gap-2">{renderActions()}</div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          {!isEliminado && <Button variant="outline" size="sm" onClick={() => onEdit(id)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

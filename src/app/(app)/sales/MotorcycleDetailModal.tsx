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
  type ModelFile,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePriceDisplayStore } from "@/stores/price-display-store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState, useEffect } from "react";
import { ClientDetail } from "./ClientDetail";
import { type ModelFileWithUrl, type MotorcycleWithDetails } from "@/types/motorcycle";

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
  const [modelImages, setModelImages] = useState<ModelFileWithUrl[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const shouldShowWholesale = usePriceDisplayStore(s => s.showWholesale());
  const shouldShowCost = usePriceDisplayStore(s => s.showCost());

  const { clientId, rawReservationData } = useMemo(() => {
    if (!motorcycle) return { clientId: null, rawReservationData: null };

    if (motorcycle.state === MotorcycleState.PROCESANDO) {
      return {
        clientId: motorcycle.clientId ?? null,
        rawReservationData: null
      };
    }

    if (motorcycle.state === MotorcycleState.RESERVADO) {
      const active = motorcycle.reservations?.find(r => r.status === 'active') ?? motorcycle.reservation;
      return {
        clientId: active?.clientId ?? null,
        rawReservationData: active ?? null
      };
    }

    return { clientId: null, rawReservationData: null };
  }, [motorcycle]);

  useEffect(() => {
    if (isOpen && motorcycle?.model?.files) {
      // Filter only image files
      const imageFiles = motorcycle.model.files
        .filter(file => file.type === "image" || file.type.startsWith('image/'))
        .map(file => ({
          ...file,
          url: file.s3Key ? `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_BUCKET_REGION}.amazonaws.com/${file.s3Key}` : "",
        } as ModelFileWithUrl));

      setModelImages(imageFiles);
      setIsLoadingImages(false);
    } else {
      // If there are no model files or the modal is closed, reset the state
      setModelImages([]);
      setCurrentImageIndex(0);
    }
  }, [isOpen, motorcycle?.model?.files]);

  if (!isOpen || !motorcycle) return null;

  const { id, state, currency } = motorcycle;
  const isStock = state === MotorcycleState.STOCK;
  const isPausado = state === MotorcycleState.PAUSADO;
  const isReservado = state === MotorcycleState.RESERVADO;
  const isProcesando = state === MotorcycleState.PROCESANDO;
  const isEliminado = state === MotorcycleState.ELIMINADO;
  const canSell = isStock;
  const canPause = isStock || isPausado;

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : modelImages.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev < modelImages.length - 1 ? prev + 1 : 0));
  };

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
                <DetailItem label="Color" value={motorcycle.color?.name ?? 'N/A'} />
                <DetailItem label="Sucursal" value={motorcycle.branch?.name ?? 'N/A'} />
                <DetailItem label="Nro. Chasis" value={motorcycle.chassisNumber ?? 'N/A'} />
                <DetailItem label="Nro. Motor" value={motorcycle.engineNumber ?? 'N/A'} />
                <DetailItem label="Patente" value={motorcycle.licensePlate ?? 'N/A'} />
                <DetailItem label="Precio" value={formatPrice(motorcycle.retailPrice, currency)} />
                {shouldShowWholesale && motorcycle.wholesalePrice && (
                  <DetailItem label="Precio Mayorista" value={formatPrice(motorcycle.wholesalePrice, currency)} />
                )}
                {shouldShowCost && motorcycle.costPrice && (
                  <DetailItem label="Precio Costo" value={formatPrice(motorcycle.costPrice, currency)} />
                )}
              </div>
            </div>
            {renderClientSection()}
          </div>
          <div className="md:col-span-1 flex flex-col">
            <div className="relative mb-4 rounded-lg overflow-hidden border aspect-video bg-gray-100">
              {isLoadingImages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : modelImages.length > 0 ? (
                <>
                  <img
                    src={modelImages[currentImageIndex].url}
                    alt={`${motorcycle.brand?.name} ${motorcycle.model?.name}`}
                    className="w-full h-full object-cover"
                  />
                  {modelImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        title="Imagen anterior"
                        aria-label="Ver imagen anterior"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        title="Siguiente imagen"
                        aria-label="Ver siguiente imagen"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                        {currentImageIndex + 1} / {modelImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : motorcycle.model?.imageUrl ? (
                <img
                  src={motorcycle.model.imageUrl}
                  alt={`${motorcycle.brand?.name} ${motorcycle.model?.name}`}
                  className="w-full h-full object-cover"
                />
              ) : motorcycle.imageUrl ? (
                <img
                  src={motorcycle.imageUrl}
                  alt={`Moto ID ${id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Sin imagen
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {renderActions()}
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


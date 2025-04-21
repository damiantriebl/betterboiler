"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose, // Para el botón de cerrar
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Motorcycle, MotorcycleState } from "@prisma/client"; // Importar de Prisma
import { X, RotateCcw, Play, Pause, DollarSign, Trash2, BookmarkPlus } from "lucide-react"; // Importar iconos necesarios
import { cn } from "@/lib/utils";

// Extender Motorcycle de Prisma CORRECTAMENTE
export interface MotorcycleWithReservation extends Motorcycle {
    reservationAmount?: number;
    // NO redefinir clientId, ya existe en Motorcycle como string | null
}

interface MotorcycleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    motorcycle: MotorcycleWithReservation | null;
    // Handlers para las acciones (pasados desde el padre)
    onToggleStatus: (id: number, currentStatus: MotorcycleState) => void;
    onSetEliminado: (id: number) => void;
    // Firma exacta que espera el modal
    onAction: (action: 'vender' | 'reservar' | 'eliminarLogico', moto: MotorcycleWithReservation) => void;
    onCancelProcess: (id: number) => void;
    onNavigateToSale: (id: string) => void;
    // Configuración de estilo de estadoVenta (pasada o definida aquí)
    estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }>;
}

export function MotorcycleDetailModal({
    isOpen,
    onClose,
    motorcycle,
    onToggleStatus,
    onSetEliminado,
    onAction,
    onCancelProcess,
    onNavigateToSale,
    estadoVentaConfig,
}: MotorcycleDetailModalProps) {

    if (!isOpen || !motorcycle) {
        return null;
    }

    const motoIdNumber = motorcycle.id;

    // Usar 'state' de Prisma
    const isEliminado = motorcycle.state === MotorcycleState.ELIMINADO;
    const isProcesando = motorcycle.state === MotorcycleState.PROCESANDO;
    const isReservado = motorcycle.state === MotorcycleState.RESERVADO;
    const isPausado = motorcycle.state === MotorcycleState.PAUSADO;
    const isStock = motorcycle.state === MotorcycleState.STOCK;
    const canBePausedOrActivated = isStock || isPausado;
    const canSell = isStock;

    // --- Renderizado de Acciones dentro del Modal ---
    const renderModalActions = () => {
        if (isEliminado) {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-100"
                    onClick={() => onToggleStatus(motoIdNumber, motorcycle.state)}
                >
                    <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
                </Button>
            );
        }

        if (isProcesando) {
            return (
                <>
                    <Button
                        variant="outline" size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-100"
                        onClick={() => onNavigateToSale(motorcycle.id.toString())}
                    >
                        <Play className="mr-2 h-4 w-4" /> Continuar proceso
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-100"
                        onClick={() => onCancelProcess(motoIdNumber)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Cancelar proceso
                    </Button>
                </>
            );
        }

        if (isReservado) {
            return (
                <>
                    <Button variant="outline" size="sm" onClick={() => onCancelProcess(motoIdNumber)}>Quitar Reserva</Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigateToSale(motorcycle.id.toString())}>Continuar Compra</Button>
                </>
            );
        }

        // Default actions for STOCK, PAUSADO
        return (
            <>
                {canSell && (
                    <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-100" onClick={() => onAction('vender', motorcycle!)}>
                        <DollarSign className="mr-2 h-4 w-4" /> Vender
                    </Button>
                )}
                {!isReservado && ( // No mostrar reservar si ya está reservado (aunque no debería llegar aquí si isReservado es true)
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-100" onClick={() => onAction('reservar', motorcycle!)} disabled={isPausado}>
                        <BookmarkPlus className="mr-2 h-4 w-4" /> Reservar
                    </Button>
                )}
                {canBePausedOrActivated && (
                    <Button
                        variant="outline" size="sm"
                        className={cn(isPausado ? "text-green-600 border-green-600 hover:bg-green-100" : "text-yellow-600 border-yellow-600 hover:bg-yellow-100")}
                        onClick={() => onToggleStatus(motoIdNumber, motorcycle.state)}
                    >
                        {isPausado ? <><Play className="mr-2 h-4 w-4" /> Activar</> : <><Pause className="mr-2 h-4 w-4" /> Pausar</>}
                    </Button>
                )}
                <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-100" onClick={() => onSetEliminado(motoIdNumber)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
            </>
        );
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl"> {/* Hacer el modal un poco más ancho */}
                <DialogHeader>
                    <DialogTitle>Detalles de la Moto</DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </DialogClose>
                </DialogHeader>

                {/* Contenido del Modal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Columna 1: Detalles Principales */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Moto ID: {motorcycle.id} ({motorcycle.year})</h3>
                        <div className="space-y-1 text-sm">
                            <p><span className="font-medium text-muted-foreground">Precio Venta:</span> {formatPrice(motorcycle.retailPrice)}</p>
                            <p><span className="font-medium text-muted-foreground">Estado Venta:</span>
                                <Badge
                                    variant="outline"
                                    className={cn("ml-2 font-normal whitespace-nowrap", estadoVentaConfig[motorcycle.state]?.className)}
                                >
                                    {estadoVentaConfig[motorcycle.state]?.label ?? "Desconocido"}
                                </Badge>
                            </p>
                            <p><span className="font-medium text-muted-foreground">Cilindrada:</span> {motorcycle.displacement ?? 'N/A'}cc</p>
                            <p><span className="font-medium text-muted-foreground">Kilometraje:</span> {motorcycle.mileage}km</p>
                            <p><span className="font-medium text-muted-foreground">Año:</span> {motorcycle.year}</p>
                            <p><span className="font-medium text-muted-foreground">Nro Chasis:</span> {motorcycle.chassisNumber}</p>
                            <p><span className="font-medium text-muted-foreground">Nro Motor:</span> {motorcycle.engineNumber ?? 'N/A'}</p>
                            <p><span className="font-medium text-muted-foreground">Patente:</span> {motorcycle.licensePlate ?? 'N/A'}</p>
                            <p><span className="font-medium text-muted-foreground">Moneda:</span> {motorcycle.currency}</p>
                            <p><span className="font-medium text-muted-foreground">Precio Costo:</span> {motorcycle.costPrice ? formatPrice(motorcycle.costPrice) : 'N/A'}</p>
                            <p><span className="font-medium text-muted-foreground">Precio Mayorista:</span> {motorcycle.wholesalePrice ? formatPrice(motorcycle.wholesalePrice) : 'N/A'}</p>
                            {motorcycle.observations && <p><span className="font-medium text-muted-foreground">Obs:</span> {motorcycle.observations}</p>}
                        </div>
                    </div>

                    {/* Columna 2: Imagen y Acciones */}
                    <div className="flex flex-col justify-between">
                        {/* Usar imageUrl */}
                        {motorcycle.imageUrl && (
                            <div className="mb-4 rounded-lg overflow-hidden border">
                                <img
                                    src={motorcycle.imageUrl}
                                    alt={`Imagen de Moto ID ${motorcycle.id} (${motorcycle.year})`}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="mt-auto pt-4 border-t">
                            <h4 className="mb-2 font-semibold">Acciones Rápidas</h4>
                            <div className="flex flex-wrap gap-2">
                                {renderModalActions()}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 
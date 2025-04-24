import { MotorcycleState, Reservation } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    Trash2,
    Play,
    Pause,
    RotateCcw,
    BookmarkPlus,
    MoreHorizontal
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Definición de colores y estilos para los botones
const actionConfig = {
    vender: {
        label: "Vender",
        icon: DollarSign,
        className: "text-green-600 border-green-600 hover:bg-green-100",
    },
    eliminar: {
        label: "Eliminar",
        icon: Trash2,
        className: "text-red-600 border-red-600 hover:bg-red-100",
    },
    reservar: {
        label: "Reservar",
        icon: BookmarkPlus,
        className: "text-blue-600 border-blue-600 hover:bg-blue-100",
    },
} as const;

export interface MotorcycleWithActions {
    id: number;
    state: MotorcycleState;
    reservation?: Reservation | null;
    organizationId?: string;
}

interface MotorcycleActionButtonsProps {
    moto: MotorcycleWithActions;
    onAction: (action: 'vender' | 'reservar' | 'eliminarLogico', moto: MotorcycleWithActions) => void;
    onToggleStatus: (motoId: number, currentStatus: MotorcycleState) => void;
    onCancelProcess: (motoId: number) => void;
    onNavigateToDetail: (motoId: string) => void;
    isPending?: boolean;
}

export function ActionButtons({
    moto,
    onAction,
    onToggleStatus,
    onCancelProcess,
    onNavigateToDetail,
    isPending = false
}: MotorcycleActionButtonsProps) {
    const estado = moto.state;

    const isEliminado = estado === MotorcycleState.ELIMINADO;
    const canToggleStatus = estado === MotorcycleState.STOCK || estado === MotorcycleState.PAUSADO;
    const isPaused = estado === MotorcycleState.PAUSADO;
    const canSell = estado === MotorcycleState.STOCK;
    const isReserved = estado === MotorcycleState.RESERVADO;
    const isProcessing = estado === MotorcycleState.PROCESANDO;

    // --- ESTADO ELIMINADO --- 
    if (isEliminado) {
        return (
            <div className="hidden xl:flex flex-col gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-100"
                    onClick={() => onToggleStatus(Number(moto.id), estado)}
                >
                    <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
                </Button>
            </div>
        );
    }

    // --- ESTADO RESERVADO --- 
    if (isReserved) {
        return (
            <div className="hidden xl:flex flex-col gap-2">
                <div className="font-bold text-blue-600 mb-1">
                    Reserva: ${moto.reservation?.amount || 0}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-100"
                        onClick={() => onNavigateToDetail(`${moto.id}?reserved=true&amount=${moto.reservation?.amount || 0}&clientId=${moto.reservation?.clientId || ''}`)}
                    >
                        <DollarSign className="h-4 w-4" />
                        Continuar compra
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-100"
                        onClick={() => onToggleStatus(Number(moto.id), estado)}
                    >
                        <Trash2 className="h-4 w-4" />
                        Cancelar reserva
                    </Button>
                </div>
            </div>
        );
    }

    // --- ESTADO PROCESANDO --- 
    if (isProcessing) {
        return (
            <div className="hidden xl:flex flex-col gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-1 text-blue-600 border-blue-600 hover:bg-blue-100"
                    onClick={() => onNavigateToDetail(`${moto.id}`)}
                >
                    <Play className="mr-2 h-4 w-4" /> Continuar proceso
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-100"
                    onClick={() => onCancelProcess(Number(moto.id))}
                >
                    <Trash2 className="h-4 w-4" /> Cancelar proceso
                </Button>
            </div>
        );
    }

    // --- ESTADOS NORMALES (STOCK, PAUSADO) --- 
    return (
        <div className="hidden xl:flex flex-col gap-2">
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.vender.className)}
                    onClick={() => onAction("vender", moto)}
                    disabled={moto.state !== MotorcycleState.STOCK || isPending}
                >
                    <actionConfig.vender.icon className="h-4 w-4" />
                    {actionConfig.vender.label}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.eliminar.className)}
                    onClick={() => onAction("eliminarLogico", moto)}
                    disabled={isPending}
                >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                </Button>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "w-full flex items-center gap-1",
                        isPaused
                            ? "text-green-600 border-green-600 hover:bg-green-100"
                            : "text-yellow-600 border-yellow-600 hover:bg-yellow-100",
                    )}
                    onClick={() => onToggleStatus(Number(moto.id), estado)}
                    disabled={!canToggleStatus || isPending}
                >
                    {isPaused ? (
                        <>
                            <Play className="mr-2 h-4 w-4" /> Activar
                        </>
                    ) : (
                        <>
                            <Pause className="mr-2 h-4 w-4" /> Pausar
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-full flex items-center gap-1", actionConfig.reservar.className)}
                    onClick={() => onAction("reservar", moto)}
                    disabled={isPaused || isPending}
                >
                    <actionConfig.reservar.icon className="h-4 w-4" />
                    {actionConfig.reservar.label}
                </Button>
            </div>
        </div>
    );
}

export function ActionMenu({
    moto,
    onAction,
    onToggleStatus,
    onCancelProcess,
    onNavigateToDetail,
    isPending = false
}: MotorcycleActionButtonsProps) {
    const estado = moto.state;

    const isEliminado = estado === MotorcycleState.ELIMINADO;
    const canBePausedOrActivated = estado === MotorcycleState.STOCK || estado === MotorcycleState.PAUSADO;
    const isPaused = estado === MotorcycleState.PAUSADO;
    const canSell = estado === MotorcycleState.STOCK;
    const isReserved = estado === MotorcycleState.RESERVADO;
    const isProcessing = estado === MotorcycleState.PROCESANDO;

    return (
        <div className="xl:hidden">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    {isEliminado ? (
                        <DropdownMenuItem
                            onClick={() => onToggleStatus(Number(moto.id), estado)}
                            className="text-green-600 focus:text-green-700 focus:bg-green-100"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Volver al Stock
                        </DropdownMenuItem>
                    ) : isProcessing ? (
                        <>
                            <DropdownMenuItem
                                onClick={() => onNavigateToDetail(`${moto.id}`)}
                                className="text-blue-600 focus:text-blue-700 focus:bg-blue-100"
                            >
                                Continuar proceso
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onCancelProcess(Number(moto.id))}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                                Cancelar
                            </DropdownMenuItem>
                        </>
                    ) : isReserved ? (
                        <>
                            <DropdownMenuItem
                                onClick={() => onCancelProcess(Number(moto.id))}
                                className="text-yellow-600 focus:text-yellow-700 focus:bg-yellow-100"
                            >
                                Quitar Reserva
                            </DropdownMenuItem>
                        </>
                    ) : (
                        <>
                            {canBePausedOrActivated && (
                                <DropdownMenuItem
                                    onClick={() => onToggleStatus(Number(moto.id), estado)}
                                    className={cn(
                                        isPaused
                                            ? "text-green-600 focus:text-green-700 focus:bg-green-100"
                                            : "text-yellow-600 focus:text-yellow-700 focus:bg-yellow-100",
                                    )}
                                >
                                    {isPaused ? (
                                        <>
                                            <Play className="mr-2 h-4 w-4" /> Activar
                                        </>
                                    ) : (
                                        <>
                                            <Pause className="mr-2 h-4 w-4" /> Pausar
                                        </>
                                    )}
                                </DropdownMenuItem>
                            )}
                            {!isReserved && (
                                <DropdownMenuItem
                                    onClick={() => onAction("reservar", moto)}
                                    className="text-blue-600 focus:text-blue-700 focus:bg-blue-100"
                                >
                                    <BookmarkPlus className="mr-2 h-4 w-4" /> Reservar
                                </DropdownMenuItem>
                            )}
                            {canSell && (
                                <DropdownMenuItem
                                    onClick={() => onAction("vender", moto)}
                                    className="text-green-600 focus:text-green-700 focus:bg-green-100"
                                >
                                    <DollarSign className="mr-2 h-4 w-4" /> Vender
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onClick={() => onAction("eliminarLogico", moto)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
} 
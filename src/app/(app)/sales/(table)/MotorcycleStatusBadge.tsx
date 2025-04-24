import { MotorcycleState } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Configuración de estilos por estado
export const estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }> = {
    [MotorcycleState.STOCK]: {
        label: "En Stock",
        className: "border-green-500 text-green-500 bg-transparent hover:bg-green-100",
    },
    [MotorcycleState.VENDIDO]: {
        label: "Vendido",
        className: "border-violet-500 text-violet-500 bg-transparent hover:bg-violet-100",
    },
    [MotorcycleState.PAUSADO]: {
        label: "Pausado",
        className: "border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-100",
    },
    [MotorcycleState.RESERVADO]: {
        label: "Reservado",
        className: "border-blue-500 text-blue-500 bg-transparent hover:bg-blue-100",
    },
    [MotorcycleState.PROCESANDO]: {
        label: "Procesando",
        className: "border-orange-500 text-orange-500 bg-transparent hover:bg-orange-100",
    },
    [MotorcycleState.ELIMINADO]: {
        label: "Eliminado",
        className: "border-red-500 text-red-500 bg-transparent hover:bg-red-100",
    },
};

interface MotorcycleStatusBadgeProps {
    state: MotorcycleState | string;
    className?: string;
}

export default function MotorcycleStatusBadge({ state, className }: MotorcycleStatusBadgeProps) {
    if (!state || typeof state !== 'string') {
        return <Badge variant="outline" className="border-gray-500 text-gray-500">Desconocido</Badge>;
    }

    const stateKey = state as MotorcycleState;

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-normal whitespace-nowrap",
                estadoVentaConfig[stateKey]?.className || "border-gray-500 text-gray-500",
                className
            )}
        >
            {estadoVentaConfig[stateKey]?.label || stateKey || "Desconocido"}
        </Badge>
    );
} 
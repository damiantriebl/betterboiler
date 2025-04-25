import { TableRow } from "@/components/ui/table";
import type { MotorcycleWithActions } from "./MotorcycleActions";
import type { MotorcycleState, Brand, Model, Sucursal, MotoColor } from "@prisma/client";
import type React from "react";

interface MotorcycleRowProps {
    moto: MotorcycleWithActions & {
        brand?: Brand | null;
        model?: Model | null;
        branch?: Sucursal | null;
        color?: MotoColor | null;
        chassisNumber: string;
        engineNumber: string;
        year: number;
        displacement?: number | null;
        retailPrice: number;
        costPrice?: number | null;
        wholesalePrice?: number | null;
        currency: string;
    };
    onAction: (action: 'vender' | 'reservar' | 'eliminarLogico', moto: MotorcycleWithActions) => void;
    onToggleStatus: (motoId: number, currentStatus: MotorcycleState) => void;
    onCancelProcess: (motoId: number) => void;
    onNavigateToDetail: (motoId: string) => void;
    onRowDoubleClick: (moto: MotorcycleRowProps['moto']) => void;
    isPending?: boolean;
    children: React.ReactNode;
}

export default function MotorcycleRow({
    moto,
    onAction,
    onToggleStatus,
    onCancelProcess,
    onNavigateToDetail,
    onRowDoubleClick,
    isPending = false,
    children
}: MotorcycleRowProps) {
    return (
        <TableRow
            key={moto.id}
            className="cursor-pointer border-l-8 rounded-lg hover:bg-muted/50 relative"
            style={{
                borderLeftColor: `${moto.color?.colorOne || 'transparent'} !important`,
                borderLeftWidth: '8px !important',
            } as React.CSSProperties}
            onDoubleClick={() => onRowDoubleClick(moto)}
        >
            {children}
        </TableRow>
    );
} 
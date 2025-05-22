import { TableRow } from "@/components/ui/table";
import type { MotorcycleState } from "@prisma/client";
import type React from "react";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";

interface MotorcycleRowProps {
  moto: MotorcycleWithFullDetails;
  onAction: (action: "vender" | "reservar" | "eliminarLogico", moto: MotorcycleWithFullDetails) => void;
  onToggleStatus: (motoId: number, currentStatus: MotorcycleState) => void;
  onCancelProcess: (motoId: number) => void;
  onNavigateToDetail: (motoId: string) => void;
  onRowDoubleClick: (moto: MotorcycleRowProps["moto"]) => void;
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
  children,
}: MotorcycleRowProps) {
  return (
    <TableRow
      key={moto.id}
      className="cursor-pointer border-l-8 rounded-lg hover:bg-muted/50 relative"
      style={
        {
          borderLeftColor: `${moto.color?.colorOne || "transparent"} !important`,
          borderLeftWidth: "8px !important",
        } as React.CSSProperties
      }
      onDoubleClick={() => onRowDoubleClick(moto)}
    >
      {children}
    </TableRow>
  );
}

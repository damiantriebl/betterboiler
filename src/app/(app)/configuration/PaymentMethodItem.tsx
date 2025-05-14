"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { OrganizationPaymentMethodDisplay } from "@/types/payment-methods";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Wallet } from "lucide-react";

interface PaymentMethodItemProps {
  orgMethod: OrganizationPaymentMethodDisplay;
  onToggle: () => void;
  onRemove: () => void;
  isPending: boolean;
}

export default function PaymentMethodItem({
  orgMethod,
  onToggle,
  onRemove,
  isPending,
}: PaymentMethodItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: orgMethod.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-md ${orgMethod.isEnabled ? "" : "opacity-60"}`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>

        <div className="flex items-center gap-2">
          {orgMethod.card.iconUrl ? (
            <img
              src={orgMethod.card.iconUrl}
              alt={orgMethod.card.name}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <Wallet className="w-6 h-6 text-primary" />
          )}
          <div>
            <p className="font-medium">{orgMethod.card.name}</p>
            <p className="text-sm text-muted-foreground">{orgMethod.card.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={orgMethod.isEnabled}
          onCheckedChange={onToggle}
          disabled={isPending}
          aria-label={`${orgMethod.isEnabled ? "Desactivar" : "Activar"} ${orgMethod.card.name}`}
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRemove} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Eliminar método de pago</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Eliminar método de pago</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

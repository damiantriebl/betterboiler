"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type OrganizationPaymentCardDisplay } from "@/types/payment-cards";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CreditCard, GripVertical, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PaymentCardItemProps {
    orgCard: OrganizationPaymentCardDisplay;
    onToggle: () => void;
    onRemove: () => void;
    isPending: boolean;
}

export default function PaymentCardItem({
    orgCard,
    onToggle,
    onRemove,
    isPending,
}: PaymentCardItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: orgCard.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between p-3 border rounded-md ${isDragging ? "bg-accent opacity-50" : ""
                }`}
        >
            <div className="flex items-center gap-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="touch-none cursor-grab text-muted-foreground"
                >
                    <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex items-center gap-2">
                    {orgCard.card.logoUrl && (
                        <img
                            src={orgCard.card.logoUrl}
                            alt={orgCard.card.name}
                            className="w-8 h-8 object-contain"
                        />
                    )}
                    <div>
                        <p className="font-medium">{orgCard.card.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {orgCard.card.issuer} • {orgCard.card.type === 'credit' ? 'Crédito' : 'Débito'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Switch
                                checked={orgCard.isEnabled}
                                onCheckedChange={onToggle}
                                disabled={isPending}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{orgCard.isEnabled ? "Habilitada" : "Deshabilitada"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onRemove}
                                disabled={isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Eliminar tarjeta</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
} 
"use client";

import {
  associatePaymentCard,
  removePaymentCard,
  togglePaymentCard,
  updatePaymentCardsOrder,
} from "@/actions/payment-cards/manage-payment-cards";
import { Spinner } from "@/components/custom/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastAction } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationPaymentCardDisplay, PaymentCard } from "@/types/payment-cards";
import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowLeftRight, ArrowRightLeft, Check, CreditCard, Trash2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import PaymentCardItem from "./PaymentCardItem";

interface ManagePaymentCardsProps {
  initialOrganizationCards: OrganizationPaymentCardDisplay[];
  availableCards: PaymentCard[];
  organizationId: string;
}

export default function ManagePaymentCards({
  initialOrganizationCards,
  availableCards,
  organizationId,
}: ManagePaymentCardsProps) {
  const [organizationCards, setOrganizationCards] =
    useState<OrganizationPaymentCardDisplay[]>(initialOrganizationCards);
  const [localAvailableCards, setLocalAvailableCards] = useState<PaymentCard[]>(availableCards);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Setup for drag and drop functionality
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
  );

  // Handler for when a card is dragged to a new position
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const oldIndex = organizationCards.findIndex((card) => card.id === active.id);
      const newIndex = organizationCards.findIndex((card) => card.id === over.id);

      if (oldIndex !== newIndex) {
        // Update the local state with the new order
        const newOrder = arrayMove(organizationCards, oldIndex, newIndex);

        // Update the order property of each card
        const reorderedCards = newOrder.map((card, index) => ({
          ...card,
          order: index,
        }));

        setOrganizationCards(reorderedCards);

        // Send the updated order to the server
        startTransition(async () => {
          const orderData = reorderedCards.map((card) => ({
            id: card.id,
            order: card.order,
          }));

          const result = await updatePaymentCardsOrder(organizationId, orderData);

          if (!result.success) {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "No se pudo actualizar el orden de las tarjetas.",
            });
            // Revert to initial order if there was an error
            setOrganizationCards(initialOrganizationCards);
          }
        });
      }
    },
    [organizationCards, initialOrganizationCards, organizationId, toast],
  );

  // Handler for toggling a card's enabled status
  const handleToggleCard = useCallback(
    (cardId: number, currentStatus: boolean) => {
      const formData = new FormData();
      formData.append("cardId", cardId.toString());
      formData.append("isEnabled", (!currentStatus).toString());

      startTransition(async () => {
        const result = await togglePaymentCard(organizationId, formData);

        if (result.success) {
          // Update local state
          setOrganizationCards((prev) =>
            prev.map((card) =>
              card.card.id === cardId ? { ...card, isEnabled: !currentStatus } : card,
            ),
          );

          toast({
            title: "Éxito",
            description: result.message,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo actualizar el estado de la tarjeta.",
          });
        }
      });
    },
    [organizationId, toast],
  );

  // Handler for adding a card to the organization
  const handleAddCard = useCallback(
    (cardId: number) => {
      // Find the card that's being added
      const cardToAdd = localAvailableCards.find((card) => card.id === cardId);
      if (!cardToAdd) return;

      // Optimistically remove from available cards
      setLocalAvailableCards((prev) => prev.filter((card) => card.id !== cardId));

      // Get the highest current order
      const highestOrder = organizationCards.reduce(
        (max, card) => (card.order > max ? card.order : max),
        -1,
      );

      // Create optimistic new organization card
      const newOrgCard: OrganizationPaymentCardDisplay = {
        // Temporary ID (will be replaced with the real one from the server)
        id: Date.now(), // Use timestamp as temporary ID
        order: highestOrder + 1,
        isEnabled: true,
        card: cardToAdd,
      };

      // Optimistically add to organization cards
      setOrganizationCards((prev) => [...prev, newOrgCard]);

      startTransition(async () => {
        const result = await associatePaymentCard(organizationId, cardId);

        if (result.success) {
          toast({
            title: "Éxito",
            description: result.message,
          });
        } else {
          // Revert optimistic changes
          setLocalAvailableCards((prev) => [...prev, cardToAdd]);
          setOrganizationCards((prev) => prev.filter((card) => card.id !== newOrgCard.id));

          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo asociar la tarjeta.",
          });
        }
      });
    },
    [organizationId, localAvailableCards, organizationCards, toast],
  );

  // Handler for removing a card from the organization
  const handleRemoveCard = useCallback(
    (organizationCardId: number) => {
      // Find the card being removed
      const cardToRemove = organizationCards.find((card) => card.id === organizationCardId);
      if (!cardToRemove) return;

      // Optimistically remove from organization cards
      setOrganizationCards((prev) => prev.filter((card) => card.id !== organizationCardId));

      // Optimistically add back to available cards
      setLocalAvailableCards((prev) => [...prev, cardToRemove.card]);

      startTransition(async () => {
        const result = await removePaymentCard(organizationId, organizationCardId);

        if (result.success) {
          toast({
            title: "Éxito",
            description: result.message,
          });
        } else {
          // Revert optimistic changes
          setOrganizationCards((prev) => [...prev, cardToRemove]);
          setLocalAvailableCards((prev) => prev.filter((card) => card.id !== cardToRemove.card.id));

          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "No se pudo eliminar la tarjeta.",
          });
        }
      });
    },
    [organizationId, organizationCards, toast],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Tarjetas Disponibles
            </CardTitle>
            <CardDescription>
              Seleccione las tarjetas que desea agregar a su organización.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localAvailableCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay tarjetas disponibles para agregar
              </div>
            ) : (
              <div className="space-y-2">
                {localAvailableCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {card.logoUrl && (
                        <img
                          src={card.logoUrl}
                          alt={card.name}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <div>
                        <p className="font-medium">{card.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {card.issuer} • {card.type === "credit" ? "Crédito" : "Débito"}
                        </p>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => handleAddCard(card.id)}
                            disabled={isPending}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-1" />
                            Agregar
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Agregar a mi organización</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Tarjetas de mi Organización
            </CardTitle>
            <CardDescription>
              Estas tarjetas estarán disponibles para usar en ventas. Puede reordenarlas
              arrastrándolas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organizationCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay tarjetas configuradas en su organización
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={organizationCards.map((card) => card.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {organizationCards.map((orgCard) => (
                      <PaymentCardItem
                        key={orgCard.id}
                        orgCard={orgCard}
                        onToggle={() => handleToggleCard(orgCard.card.id, orgCard.isEnabled)}
                        onRemove={() => handleRemoveCard(orgCard.id)}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {isPending && (
              <div className="absolute bottom-4 right-4">
                <Spinner className="h-6 w-6" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

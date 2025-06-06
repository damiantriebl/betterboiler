"use client";

import {
  associatePaymentMethod,
  removePaymentMethod,
  togglePaymentMethod,
  updatePaymentMethodsOrder,
} from "@/actions/payment-methods/manage-payment-methods";
import { Spinner } from "@/components/custom/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationPaymentMethodDisplay, PaymentMethod } from "@/types/payment-methods";
import { setupPermutaPaymentMethod } from "@/actions/payment-methods/setup-permuta";
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
import { ArrowRightLeft, Check, CreditCard, Trash2, Wallet } from "lucide-react";
import { useState, useTransition } from "react";
import PaymentMethodItem from "./PaymentMethodItem";

interface ManagePaymentMethodsProps {
  initialOrganizationMethods: OrganizationPaymentMethodDisplay[];
  availableMethods: PaymentMethod[];
  organizationId: string;
}

export default function ManagePaymentMethods({
  initialOrganizationMethods,
  availableMethods,
  organizationId,
}: ManagePaymentMethodsProps) {
  const [organizationMethods, setOrganizationMethods] = useState<
    OrganizationPaymentMethodDisplay[]
  >(initialOrganizationMethods);
  const [localAvailableMethods, setLocalAvailableMethods] =
    useState<PaymentMethod[]>(availableMethods);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  // Handler for drag end (reordering payment methods)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setOrganizationMethods((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newArray = arrayMove(items, oldIndex, newIndex);

      // Update order property based on new positions
      const updatedArray = newArray.map((item, index) => ({
        ...item,
        order: index,
      }));

      // Send the updated order to the server
      startTransition(() => {
        updatePaymentMethodsOrder(
          organizationId,
          updatedArray.map((item) => ({ id: item.id, order: item.order })),
        ).then((result) => {
          if (!result.success) {
            toast({
              title: "Error",
              description: result.error || "Ha ocurrido un error al actualizar el orden.",
              variant: "destructive",
            });
          }
        });
      });

      return updatedArray;
    });
  };

  // Handler for toggling a payment method's enabled status
  const handleToggleMethod = (methodId: number, currentStatus: boolean) => {
    // Optimistically update UI
    setOrganizationMethods((prev) =>
      prev.map((method) =>
        method.card.id === methodId ? { ...method, isEnabled: !currentStatus } : method,
      ),
    );

    // Send update to server
    startTransition(() => {
      const formData = new FormData();
      formData.append("methodId", methodId.toString());
      formData.append("isEnabled", (!currentStatus).toString());

      togglePaymentMethod(organizationId, formData)
        .then((result) => {
          // Verificar que result existe y tiene la estructura esperada
          if (!result || typeof result !== "object" || !result.success) {
            // Revert optimistic update on error
            setOrganizationMethods((prev) =>
              prev.map((method) =>
                method.card.id === methodId ? { ...method, isEnabled: currentStatus } : method,
              ),
            );

            toast({
              title: "Error",
              description:
                result?.error || "Ha ocurrido un error al cambiar el estado del método de pago.",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error("Error in togglePaymentMethod:", error);

          // Revert optimistic update on error
          setOrganizationMethods((prev) =>
            prev.map((method) =>
              method.card.id === methodId ? { ...method, isEnabled: currentStatus } : method,
            ),
          );

          toast({
            title: "Error",
            description: "Ha ocurrido un error inesperado al cambiar el estado del método de pago.",
            variant: "destructive",
          });
        });
    });
  };

  // Handler for adding a method to the organization
  const handleAddMethod = (methodId: number) => {
    // Find the method that's being added
    const methodToAdd = localAvailableMethods.find((method) => method.id === methodId);
    if (!methodToAdd) return;

    // Optimistically remove from available methods
    setLocalAvailableMethods((prev) => prev.filter((method) => method.id !== methodId));

    // Get the highest current order
    const highestOrder = organizationMethods.reduce(
      (max, method) => (method.order > max ? method.order : max),
      -1,
    );

    // Create optimistic new organization method
    const newOrgMethod: OrganizationPaymentMethodDisplay = {
      // Temporary ID (will be replaced with the real one from the server)
      id: Date.now(), // Use timestamp as temporary ID
      order: highestOrder + 1,
      isEnabled: true,
      card: methodToAdd,
    };

    // Optimistically add to organization methods
    setOrganizationMethods((prev) => [...prev, newOrgMethod]);

    // Send the request to the server
    startTransition(() => {
      associatePaymentMethod(organizationId, methodId).then((result) => {
        if (!result.success) {
          // Revert optimistic updates on error
          setOrganizationMethods((prev) => prev.filter((method) => method.id !== newOrgMethod.id));
          setLocalAvailableMethods((prev) => [...prev, methodToAdd]);

          toast({
            title: "Error",
            description: result.error || "Ha ocurrido un error al añadir el método de pago.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Éxito",
            description: "Método de pago añadido correctamente.",
          });
        }
      });
    });
  };

  // Handler for removing a payment method from the organization
  const handleRemoveMethod = (organizationMethodId: number) => {
    // Find the method to remove
    const methodToRemove = organizationMethods.find((method) => method.id === organizationMethodId);
    if (!methodToRemove) return;

    // Optimistically update UI
    setOrganizationMethods((prev) => prev.filter((method) => method.id !== organizationMethodId));
    setLocalAvailableMethods((prev) => [...prev, methodToRemove.card]);

    // Send request to server
    startTransition(() => {
      removePaymentMethod(organizationId, organizationMethodId).then((result) => {
        if (!result.success) {
          // Revert optimistic updates on error
          setOrganizationMethods((prev) => [...prev, methodToRemove]);
          setLocalAvailableMethods((prev) =>
            prev.filter((method) => method.id !== methodToRemove.card.id),
          );

          toast({
            title: "Error",
            description: result.error || "Ha ocurrido un error al eliminar el método de pago.",
            variant: "destructive",
          });
        }
      });
    });
  };

  // Handler para configurar método de pago permuta
  const handleSetupPermuta = async () => {
    startTransition(async () => {
      try {
        const result = await setupPermutaPaymentMethod();
        if (result.success) {
          toast({
            title: "Éxito",
            description: "Método de pago Permuta configurado correctamente.",
          });
          // Recargar la página para mostrar el nuevo método
          window.location.reload();
        } else {
          toast({
            title: "Error",
            description: result.error || "Error al configurar método de pago Permuta.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Error inesperado al configurar Permuta.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Botón especial para configurar Permuta */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔄</div>
              <div>
                <h3 className="font-semibold text-blue-900">Método de Pago: Permuta</h3>
                <p className="text-sm text-blue-700">
                  Habilita el intercambio de bienes como método de pago
                </p>
              </div>
            </div>
            <Button
              onClick={handleSetupPermuta}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Configurando...
                </>
              ) : (
                "Configurar Permuta"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Métodos de Pago Disponibles
            </CardTitle>
            <CardDescription>
              Seleccione los métodos de pago que desea habilitar en su organización.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localAvailableMethods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay métodos de pago disponibles para agregar
              </div>
            ) : (
              <div className="space-y-2">
                {localAvailableMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {method.iconUrl && (
                        <img
                          src={method.iconUrl}
                          alt={method.name}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAddMethod(method.id)}
                            disabled={isPending}
                          >
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Agregar método de pago</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Agregar método de pago</p>
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
              <Wallet className="w-5 h-5" /> Métodos de Pago Habilitados
            </CardTitle>
            <CardDescription>
              Estos métodos de pago estarán disponibles en ventas. Puede reordenarlos
              arrastrándolos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organizationMethods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay métodos de pago configurados en su organización
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={organizationMethods.map((method) => method.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {organizationMethods.map((orgMethod) => (
                      <PaymentMethodItem
                        key={orgMethod.id}
                        orgMethod={orgMethod}
                        onToggle={() => handleToggleMethod(orgMethod.card.id, orgMethod.isEnabled)}
                        onRemove={() => handleRemoveMethod(orgMethod.id)}
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

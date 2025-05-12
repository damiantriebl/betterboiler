"use client";

import { useState, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check, CreditCard, Wallet, ArrowRightLeft, Trash2 } from "lucide-react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/custom/Spinner";
import { useToast } from "@/hooks/use-toast";
import PaymentMethodItem from "./PaymentMethodItem";
import { type PaymentMethod, type OrganizationPaymentMethodDisplay } from "@/types/payment-methods";
import { associatePaymentMethod, removePaymentMethod, togglePaymentMethod, updatePaymentMethodsOrder } from "@/actions/payment-methods/manage-payment-methods";

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
    const [organizationMethods, setOrganizationMethods] = useState<OrganizationPaymentMethodDisplay[]>(
        initialOrganizationMethods
    );
    const [localAvailableMethods, setLocalAvailableMethods] = useState<PaymentMethod[]>(
        availableMethods
    );
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
        })
    );

    // Handler for drag end (reordering payment methods)
    const handleDragEnd = useCallback((event: DragEndEvent) => {
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
                    updatedArray.map((item) => ({ id: item.id, order: item.order }))
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
    }, [organizationId, toast]);

    // Handler for toggling a payment method's enabled status
    const handleToggleMethod = useCallback((methodId: number, currentStatus: boolean) => {
        // Optimistically update UI
        setOrganizationMethods((prev) =>
            prev.map((method) =>
                method.card.id === methodId
                    ? { ...method, isEnabled: !currentStatus }
                    : method
            )
        );

        // Send update to server
        startTransition(() => {
            const formData = new FormData();
            formData.append("methodId", methodId.toString());
            formData.append("isEnabled", (!currentStatus).toString());

            togglePaymentMethod(organizationId, formData).then((result) => {
                if (!result.success) {
                    // Revert optimistic update on error
                    setOrganizationMethods((prev) =>
                        prev.map((method) =>
                            method.card.id === methodId
                                ? { ...method, isEnabled: currentStatus }
                                : method
                        )
                    );

                    toast({
                        title: "Error",
                        description: result.error || "Ha ocurrido un error al cambiar el estado del método de pago.",
                        variant: "destructive",
                    });
                }
            });
        });
    }, [organizationId, toast]);

    // Handler for adding a method to the organization
    const handleAddMethod = useCallback(
        (methodId: number) => {
            // Find the method that's being added
            const methodToAdd = localAvailableMethods.find(method => method.id === methodId);
            if (!methodToAdd) return;

            // Optimistically remove from available methods
            setLocalAvailableMethods(prev => prev.filter(method => method.id !== methodId));

            // Get the highest current order
            const highestOrder = organizationMethods.reduce(
                (max, method) => (method.order > max ? method.order : max),
                -1
            );

            // Create optimistic new organization method
            const newOrgMethod: OrganizationPaymentMethodDisplay = {
                // Temporary ID (will be replaced with the real one from the server)
                id: Date.now(), // Use timestamp as temporary ID
                order: highestOrder + 1,
                isEnabled: true,
                card: methodToAdd
            };

            // Optimistically add to organization methods
            setOrganizationMethods(prev => [...prev, newOrgMethod]);

            // Send the request to the server
            startTransition(() => {
                associatePaymentMethod(organizationId, methodId).then((result) => {
                    if (!result.success) {
                        // Revert optimistic updates on error
                        setOrganizationMethods(prev => prev.filter(method => method.id !== newOrgMethod.id));
                        setLocalAvailableMethods(prev => [...prev, methodToAdd]);

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
        },
        [localAvailableMethods, organizationId, organizationMethods, toast]
    );

    // Handler for removing a payment method from the organization
    const handleRemoveMethod = useCallback((organizationMethodId: number) => {
        // Find the method to remove
        const methodToRemove = organizationMethods.find(method => method.id === organizationMethodId);
        if (!methodToRemove) return;

        // Optimistically update UI
        setOrganizationMethods(prev => prev.filter(method => method.id !== organizationMethodId));
        setLocalAvailableMethods(prev => [...prev, methodToRemove.card]);

        // Send request to server
        startTransition(() => {
            removePaymentMethod(organizationId, organizationMethodId).then((result) => {
                if (!result.success) {
                    // Revert optimistic updates on error
                    setOrganizationMethods(prev => [...prev, methodToRemove]);
                    setLocalAvailableMethods(prev => prev.filter(method => method.id !== methodToRemove.card.id));

                    toast({
                        title: "Error",
                        description: result.error || "Ha ocurrido un error al eliminar el método de pago.",
                        variant: "destructive",
                    });
                }
            });
        });
    }, [organizationId, organizationMethods, toast]);

    return (
        <div className="space-y-4">
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
                        ) :
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
                                                <p className="text-sm text-muted-foreground">
                                                    {method.description}
                                                </p>
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
                        }
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Wallet className="w-5 h-5" /> Métodos de Pago Habilitados
                        </CardTitle>
                        <CardDescription>
                            Estos métodos de pago estarán disponibles en ventas. Puede reordenarlos arrastrándolos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {organizationMethods.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No hay métodos de pago configurados en su organización
                            </div>
                        ) :
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
                        }
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
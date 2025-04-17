"use client";

import React, { useState, useEffect, useActionState, useTransition, useOptimistic } from 'react';
import {
    DndContext, DragEndEvent, PointerSensor, KeyboardSensor, closestCorners,
    useSensor, useSensors
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useToast } from '@/hooks/use-toast';


import AddColorItem from './AddColorItem';

import {
    createMotoColor,
    updateMotoColor,
    deleteMotoColor,
    updateMotoColorsOrder,
    type CreateColorState,
    type UpdateColorActionState,
    type DeleteColorState,
    type UpdateColorsOrderState
} from '@/actions/configuration/manage-colors';
import ColorItem from '@/components/custom/ColorItem';
import { ColorConfig, ColorType } from '@/types/ColorType';

interface OptimisticColorConfig extends ColorConfig {
    isPending?: boolean;
}

interface ManageColorsProps {
    initialColorsData: ColorConfig[];
    organizationId: string;
}

export default function ManageColors({ initialColorsData = [], organizationId }: ManageColorsProps) {
    const [actualColors, setActualColors] = useState<ColorConfig[]>(initialColorsData);
    const { toast } = useToast();
    const [isPendingOrder, startOrderTransition] = useTransition();
    const [updatingColorId, setUpdatingColorId] = useState<number | null>(null);
    const [deletingColorId, setDeletingColorId] = useState<number | null>(null);

    const [optimisticColors, addOptimisticColor] = useOptimistic<
        OptimisticColorConfig[],
        Omit<ColorConfig, 'id' | 'dbId'>
    >(
        actualColors,
        (currentState, optimisticNewColorData) => {
            const newOptimisticColor: OptimisticColorConfig = {
                id: `optimistic-${crypto.randomUUID()}`,
                name: optimisticNewColorData.name,
                type: optimisticNewColorData.type,
                colorOne: optimisticNewColorData.colorOne,
                colorTwo: optimisticNewColorData.colorTwo,
                order: Math.max(0, ...currentState.map(c => c.order ?? 0)) + 1,
                isPending: true,
            };
            return [...currentState, newOptimisticColor];
        }
    );

    const [addState, addAction, isAdding] = useActionState<CreateColorState | undefined, FormData>(createMotoColor, undefined);
    const [updateState, updateAction, isUpdating] = useActionState<UpdateColorActionState | undefined, FormData>(updateMotoColor, undefined);
    const [deleteState, deleteAction, isDeleting] = useActionState<DeleteColorState | undefined, FormData>(deleteMotoColor, undefined);
    const [orderState, orderAction, isOrdering] = useActionState<UpdateColorsOrderState | undefined, { colors: { id: number; order: number }[], organizationId: string }>(updateMotoColorsOrder, undefined);

    useEffect(() => {
        setActualColors(initialColorsData);
    }, [initialColorsData]);

    useEffect(() => {
        if (addState === undefined) return;

        if (addState.success) {
            toast({ title: "Color añadido", description: `"${addState.newColor.name}" se añadió con éxito.` });
            setActualColors(currentActualColors => {
                const realNewColor: ColorConfig = {
                    id: addState.newColor.id.toString(),
                    dbId: addState.newColor.id,
                    name: addState.newColor.name,
                    type: addState.newColor.type,
                    colorOne: addState.newColor.colorOne,
                    colorTwo: addState.newColor.colorTwo ?? undefined,
                    order: addState.newColor.order,
                };

                const filteredColors = currentActualColors.filter(c => !c.id.startsWith("optimistic-"));

                return [...filteredColors, realNewColor].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            });
        } else if (addState.error) {
            toast({ title: "Error al añadir color", description: addState.error, variant: "destructive" });
        }
    }, [addState, toast]);

    useEffect(() => {
        if (updateState === undefined) return;
        if (updateState.success || updateState.error) {
            setUpdatingColorId(null);
        }
        if (updateState.error) {
            toast({ title: "Error al actualizar", description: updateState.error, variant: "destructive" });
        }
        if (updateState.success) {
            toast({ title: "Color actualizado", description: "El color se guardó." });
        }
    }, [updateState, toast]);

    useEffect(() => {
        if (deleteState === undefined) return;
        if (deleteState.success || deleteState.error) {
            setDeletingColorId(null);
        }
        if (deleteState.error) {
            toast({ title: "Error al eliminar", description: deleteState.error, variant: "destructive" });
        }
        if (deleteState.success) {
            toast({ title: "Color eliminado", description: "El color ha sido eliminado." });
        }
    }, [deleteState, toast]);

    useEffect(() => {
        if (orderState === undefined) return;
        if (orderState.error) {
            toast({ title: "Error al guardar orden", description: orderState.error, variant: "destructive" });
            setActualColors(initialColorsData);
        }
        if (orderState.success) toast({ title: "Orden guardado", description: "Nuevo orden de colores guardado." });
    }, [orderState, toast, initialColorsData]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAddColor = (newColorData: Omit<ColorConfig, 'id' | 'dbId'>) => {
        if (!organizationId) {
            toast({ variant: "destructive", title: "Error", description: "ID de organización no disponible." });
            return;
        }

        let dataToSend = { ...newColorData };
        if ((dataToSend.type === 'BITONO' || dataToSend.type === 'PATRON') && !dataToSend.colorTwo) {
            dataToSend.colorTwo = '#000000';
        }

        const formData = new FormData();
        formData.append('name', dataToSend.name);
        formData.append('type', dataToSend.type);
        formData.append('colorOne', dataToSend.colorOne || '#ffffff');
        if (dataToSend.colorTwo) formData.append('colorTwo', dataToSend.colorTwo);
        formData.append('organizationId', organizationId);

        addOptimisticColor(dataToSend);

        addAction(formData);
    };

    const handleDeleteColor = (idToDelete: string) => {
        const colorToDelete = actualColors.find(c => c.id === idToDelete);
        if (!colorToDelete || !colorToDelete.dbId) return;
        if (!organizationId) {
            toast({ variant: "destructive", title: "Error", description: "ID de organización no disponible." });
            return;
        }

        setDeletingColorId(colorToDelete.dbId);

        const formData = new FormData();
        formData.append('id', colorToDelete.dbId!.toString());
        formData.append('organizationId', organizationId);

        deleteAction(formData);
    };

    const handleUpdateColor = (updatedColorData: ColorConfig) => {
        if (!updatedColorData.dbId) return;
        if (!organizationId) {
            toast({ variant: "destructive", title: "Error", description: "ID de organización no disponible." });
            return;
        }

        setUpdatingColorId(updatedColorData.dbId);

        const formData = new FormData();
        formData.append('id', updatedColorData.dbId!.toString());
        formData.append('name', updatedColorData.name);
        formData.append('type', updatedColorData.type);
        formData.append('colorOne', updatedColorData.colorOne || '#ffffff');
        if (updatedColorData.colorTwo) formData.append('colorTwo', updatedColorData.colorTwo);
        formData.append('organizationId', organizationId);

        updateAction(formData);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = actualColors.findIndex(item => item.id === active.id);
            const newIndex = actualColors.findIndex(item => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const newArray = arrayMove(actualColors, oldIndex, newIndex);
            setActualColors(newArray);

            const colorOrders = newArray
                .filter(color => color.dbId !== undefined)
                .map((color, index) => ({ id: color.dbId!, order: index }));

            orderAction({ colors: colorOrders, organizationId });
        }
    };

    return (
        <div className="w-full space-y-4 my-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold">Gestionar Colores</h2>

            {!organizationId ? (
                <div className="p-4 text-center text-orange-700 bg-orange-50 rounded-md">
                    Para gestionar colores, debes pertenecer a una organización.
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                >
                    <div className="flex flex-col gap-3">
                        <SortableContext items={optimisticColors.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {optimisticColors.map((color) => {
                                const isUpdatingThisItem = isUpdating && updatingColorId === color.dbId;
                                const isDeletingThisItem = isDeleting && deletingColorId === color.dbId;
                                return (
                                    <ColorItem
                                        key={color.id}
                                        colorConfig={color}
                                        onUpdate={handleUpdateColor}
                                        onDelete={handleDeleteColor}
                                        isUpdatingThisItem={isUpdatingThisItem}
                                        isDeletingThisItem={isDeletingThisItem}
                                        isPending={color.isPending}
                                    />
                                );
                            })}
                        </SortableContext>

                        <AddColorItem
                            onAdd={handleAddColor}
                            isAdding={isAdding}
                            className="mt-2"
                        />

                        {optimisticColors.length === 0 && (
                            <p className="text-center text-muted-foreground mt-4">No hay colores añadidos.</p>
                        )}
                    </div>
                </DndContext>
            )}
        </div>
    );
} 
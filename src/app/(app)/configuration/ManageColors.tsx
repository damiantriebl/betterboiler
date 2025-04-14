"use client";

import React, { useState, useEffect, useCallback, useActionState, useTransition } from 'react';
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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
import { ColorConfig } from '@/types/ColorType';

const initialFormState = { success: false, error: null };

interface ManageColorsProps {
    initialColorsData: ColorConfig[];
    organizationId: string;
}

export default function ManageColors({ initialColorsData = [], organizationId }: ManageColorsProps) {
    const [colores, setColores] = useState<ColorConfig[]>(initialColorsData);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [addState, addAction, isAdding] = useActionState<CreateColorState | typeof initialFormState, FormData>(createMotoColor, initialFormState);
    const [updateState, updateAction, isUpdating] = useActionState<UpdateColorActionState | typeof initialFormState, FormData>(updateMotoColor, initialFormState);
    const [deleteState, deleteAction, isDeleting] = useActionState<DeleteColorState | typeof initialFormState, FormData>(deleteMotoColor, initialFormState);
    const [orderState, orderAction, isOrdering] = useActionState<UpdateColorsOrderState | typeof initialFormState, { colors: { id: number; order: number }[], organizationId: string }>(updateMotoColorsOrder, initialFormState);

    useEffect(() => {
        setColores(initialColorsData);
    }, [initialColorsData]);

    useEffect(() => {
        if (addState.error) toast({ title: "Error al añadir color", description: addState.error, variant: "destructive" });
        if (addState.success) toast({ title: "Color añadido", description: "El color se añadió correctamente." });
    }, [addState, toast]);

    useEffect(() => {
        if (updateState.error) {
            toast({ title: "Error al actualizar", description: updateState.error, variant: "destructive" });
            setColores(initialColorsData);
        }
        if (updateState.success) toast({ title: "Color actualizado", description: "El color se guardó." });
    }, [updateState, toast, initialColorsData]);

    useEffect(() => {
        if (deleteState.error) {
            toast({ title: "Error al eliminar", description: deleteState.error, variant: "destructive" });
            setColores(initialColorsData);
        }
        if (deleteState.success) toast({ title: "Color eliminado", description: "El color ha sido eliminado." });
    }, [deleteState, toast, initialColorsData]);

    useEffect(() => {
        if (orderState.error) {
            toast({ title: "Error al guardar orden", description: orderState.error, variant: "destructive" });
            setColores(initialColorsData);
        }
        if (orderState.success) toast({ title: "Orden guardado", description: "Nuevo orden de colores guardado." });
    }, [orderState, toast, initialColorsData]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAddColor = (newColorData: Omit<ColorConfig, 'id' | 'dbId'>) => {
        if (!organizationId) return;

        let dataToSend = { ...newColorData };
        if ((dataToSend.tipo === 'BITONO' || dataToSend.tipo === 'PATRON') && !dataToSend.color2) {
            dataToSend.color2 = '#000000';
        }

        const formData = new FormData();
        formData.append('nombre', dataToSend.nombre);
        formData.append('tipo', dataToSend.tipo);
        formData.append('color1', dataToSend.color1 || '#ffffff');
        if (dataToSend.color2) formData.append('color2', dataToSend.color2);

        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticColor: ColorConfig = {
            id: optimisticId,
            nombre: dataToSend.nombre,
            tipo: dataToSend.tipo,
            color1: dataToSend.color1 || '#ffffff',
            color2: dataToSend.color2,
            order: colores.length,
        };
        setColores(prev => [...prev, optimisticColor]);

        addAction(formData);
    };

    const handleDeleteColor = (idToDelete: string) => {
        const colorToDelete = colores.find(c => c.id === idToDelete);
        if (!colorToDelete || !colorToDelete.dbId || !organizationId) return;

        setColores((prev) => prev.filter((c) => c.id !== idToDelete));

        const formData = new FormData();
        formData.append('id', colorToDelete.dbId!.toString());

        deleteAction(formData);
    };

    const handleUpdateColor = (updatedColorData: ColorConfig) => {
        if (!organizationId || !updatedColorData.dbId) return;

        const previousColores = colores;
        setColores(prev => prev.map(c => c.id === updatedColorData.id ? updatedColorData : c));

        const formData = new FormData();
        formData.append('id', updatedColorData.dbId!.toString());
        formData.append('nombre', updatedColorData.nombre);
        formData.append('tipo', updatedColorData.tipo);
        formData.append('color1', updatedColorData.color1 || '#ffffff');
        if (updatedColorData.color2) formData.append('color2', updatedColorData.color2);

        updateAction(formData);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = colores.findIndex(item => item.id === active.id);
            const newIndex = colores.findIndex(item => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1 || !organizationId) return;

            const newArray = arrayMove(colores, oldIndex, newIndex);
            setColores(newArray);

            const colorOrders = newArray
                .filter(color => color.dbId !== undefined)
                .map((color, index) => ({
                    id: color.dbId!,
                    order: index,
                }));

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
                        <SortableContext items={colores.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {colores.map((color) => (
                                <ColorItem
                                    key={color.id}
                                    colorConfig={color}
                                    onUpdate={handleUpdateColor}
                                    onDelete={handleDeleteColor}
                                />
                            ))}
                        </SortableContext>

                        <AddColorItem
                            onAdd={handleAddColor}
                            className="mt-2"
                        />

                        {colores.length === 0 && (
                            <p className="text-center text-muted-foreground mt-4">No hay colores añadidos.</p>
                        )}
                    </div>
                </DndContext>
            )}
        </div>
    );
} 
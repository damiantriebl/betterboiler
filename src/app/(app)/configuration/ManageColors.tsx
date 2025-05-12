"use client";

import React, { useState, useEffect, useActionState, useTransition, useOptimistic } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useToast } from "@/hooks/use-toast";

import AddColorItem from "./AddColorItem";

import {
  createMotoColor,
  updateMotoColor,
  deleteMotoColor,
  updateMotoColorsOrder,
  type CreateColorState,
  type UpdateColorActionState,
  type DeleteColorState,
  type UpdateColorsOrderState,
} from "@/actions/configuration/manage-colors";
import ColorItem from "@/components/custom/ColorItem";
import { type ColorConfig, ColorType } from "@/types/ColorType";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Info } from "lucide-react";

interface OptimisticColorConfig extends ColorConfig {
  isPending?: boolean;
}

interface ManageColorsProps {
  initialColorsData: ColorConfig[];
  organizationId: string;
}

export default function ManageColors({
  initialColorsData = [],
  organizationId,
}: ManageColorsProps) {
  const [actualColors, setActualColors] = useState<ColorConfig[]>(initialColorsData);
  const { toast } = useToast();
  const [isPendingOrder, startOrderTransition] = useTransition();
  const [updatingColorId, setUpdatingColorId] = useState<number | null>(null);
  const [deletingColorId, setDeletingColorId] = useState<number | null>(null);

  // Separar colores globales y personalizados
  const globalColors = actualColors.filter(color => color.isGlobal);
  const customColors = actualColors.filter(color => !color.isGlobal);

  const [optimisticColors, addOptimisticColor] = useOptimistic<
    OptimisticColorConfig[],
    Omit<ColorConfig, "id" | "dbId">
  >(customColors, (currentState, optimisticNewColorData) => {
    const newOptimisticColor: OptimisticColorConfig = {
      id: `optimistic-${crypto.randomUUID()}`,
      name: optimisticNewColorData.name,
      type: optimisticNewColorData.type,
      colorOne: optimisticNewColorData.colorOne,
      colorTwo: optimisticNewColorData.colorTwo,
      order: Math.max(0, ...currentState.map((c) => c.order ?? 0)) + 1,
      isPending: true,
      isGlobal: false,
    };
    return [...currentState, newOptimisticColor];
  });

  const [addState, addAction, isAdding] = useActionState<CreateColorState | undefined, FormData>(
    createMotoColor,
    undefined,
  );
  const [updateState, updateAction, isUpdating] = useActionState<
    UpdateColorActionState | undefined,
    FormData
  >(updateMotoColor, undefined);
  const [deleteState, deleteAction, isDeleting] = useActionState<
    DeleteColorState | undefined,
    FormData
  >(deleteMotoColor, undefined);
  const [orderState, orderAction, isOrdering] = useActionState<
    UpdateColorsOrderState | undefined,
    { colors: { id: number; order: number }[]; organizationId: string }
  >(updateMotoColorsOrder, undefined);

  useEffect(() => {
    setActualColors(initialColorsData);
  }, [initialColorsData]);

  useEffect(() => {
    if (addState === undefined) return;

    if (addState.success) {
      toast({
        title: "Color añadido",
        description: `"${addState.newColor.name}" se añadió con éxito.`,
      });
      setActualColors((currentActualColors) => {
        const realNewColor: ColorConfig = {
          id: addState.newColor.id.toString(),
          dbId: addState.newColor.id,
          name: addState.newColor.name,
          type: addState.newColor.type,
          colorOne: addState.newColor.colorOne,
          colorTwo: addState.newColor.colorTwo ?? undefined,
          order: addState.newColor.order,
          isGlobal: false,
        };

        const filteredColors = currentActualColors.filter((c) => !c.id.startsWith("optimistic-"));

        return [...filteredColors, realNewColor].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });
    } else if (addState.error) {
      toast({
        title: "Error al añadir color",
        description: addState.error,
        variant: "destructive",
      });
    }
  }, [addState, toast]);

  useEffect(() => {
    if (updateState === undefined) return;
    if (updateState.success || updateState.error) {
      setUpdatingColorId(null);
    }
    if (updateState.error) {
      toast({
        title: "Error al actualizar",
        description: updateState.error,
        variant: "destructive",
      });
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
      toast({
        title: "Error al guardar orden",
        description: orderState.error,
        variant: "destructive",
      });
      setActualColors(initialColorsData);
    }
    if (orderState.success)
      toast({ title: "Orden guardado", description: "Nuevo orden de colores guardado." });
  }, [orderState, toast, initialColorsData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAddColor = (newColorData: Omit<ColorConfig, "id" | "dbId">) => {
    if (!organizationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "ID de organización no disponible.",
      });
      return;
    }

    const dataToSend = { ...newColorData };
    if ((dataToSend.type === "BITONO" || dataToSend.type === "PATRON") && !dataToSend.colorTwo) {
      dataToSend.colorTwo = "#000000";
    }

    const formData = new FormData();
    formData.append("name", dataToSend.name);
    formData.append("type", dataToSend.type);
    formData.append("colorOne", dataToSend.colorOne || "#ffffff");
    if (dataToSend.colorTwo) formData.append("colorTwo", dataToSend.colorTwo);
    formData.append("organizationId", organizationId);

    addOptimisticColor(dataToSend);

    addAction(formData);
  };

  const handleUpdateColor = (updatedColorData: ColorConfig) => {
    if (!organizationId || !updatedColorData.dbId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Faltan datos para actualizar el color.",
      });
      return;
    }

    // No permitir actualizar colores globales
    if (updatedColorData.isGlobal) {
      toast({
        variant: "destructive",
        title: "Operación no permitida",
        description: "Los colores globales no pueden ser modificados.",
      });
      return;
    }

    setUpdatingColorId(updatedColorData.dbId);

    const formData = new FormData();
    formData.append("id", updatedColorData.dbId.toString());
    formData.append("name", updatedColorData.name);
    formData.append("type", updatedColorData.type);
    formData.append("colorOne", updatedColorData.colorOne || "#ffffff");
    if (updatedColorData.colorTwo)
      formData.append("colorTwo", updatedColorData.colorTwo);
    formData.append("organizationId", organizationId);

    updateAction(formData);
  };

  const handleDeleteColor = (colorId?: number) => {
    if (!colorId || !organizationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "ID inválido.",
      });
      return;
    }

    // No permitir eliminar colores globales
    const colorToDelete = actualColors.find(c => c.dbId === colorId);
    if (colorToDelete?.isGlobal) {
      toast({
        variant: "destructive",
        title: "Operación no permitida",
        description: "Los colores globales no pueden ser eliminados.",
      });
      return;
    }

    setDeletingColorId(colorId);

    const formData = new FormData();
    formData.append("id", colorId.toString());
    formData.append("organizationId", organizationId);

    deleteAction(formData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const oldIndex = optimisticColors.findIndex((item) => item.id === active.id);
    const newIndex = optimisticColors.findIndex((item) => item.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(optimisticColors, oldIndex, newIndex);
      const newOrderWithIndices = newOrder.map((item, index) => ({
        ...item,
        order: index,
      }));

      // Actualizar localmente
      setActualColors((prev) => {
        const withoutOptimistic = prev.filter(
          (c) => c.isGlobal || !optimisticColors.some((oc) => oc.id === c.id),
        );
        return [...withoutOptimistic, ...newOrderWithIndices].sort((a, b) => {
          // Colores globales siempre al inicio
          if (a.isGlobal && !b.isGlobal) return -1;
          if (!a.isGlobal && b.isGlobal) return 1;
          // Si ambos son globales o ambos son personalizados, ordenar por order
          return (a.order ?? 0) - (b.order ?? 0);
        });
      });

      // Enviar al servidor solo los colores no optimistas
      const serverItems = newOrderWithIndices
        .filter((item) => !item.id.startsWith("optimistic-") && item.dbId)
        .map((item) => ({
          id: item.dbId as number,
          order: item.order as number,
        }));

      if (serverItems.length > 0) {
        startOrderTransition(() => {
          orderAction({ colors: serverItems, organizationId });
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Sección de colores globales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Palette className="w-5 h-5" /> Colores Globales
          </CardTitle>
          <CardDescription>
            Colores estándar predefinidos disponibles para todas las organizaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {globalColors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No hay colores globales configurados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {globalColors.map((color) => (
                <div
                  key={color.id}
                  className="p-3 border rounded-md bg-muted/20 flex items-center"
                >
                  <ColorItem
                    colorConfig={color}
                    displayMode={true}
                  />
                  <div className="ml-2 text-xs text-muted-foreground flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Global
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de colores personalizados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Palette className="w-5 h-5" /> Colores Personalizados
          </CardTitle>
          <CardDescription>
            Colores específicos de su organización. Puede agregar, editar y ordenar estos colores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <AddColorItem onAdd={handleAddColor} isAdding={isAdding} />
          </div>

          {optimisticColors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No hay colores personalizados. Añada uno nuevo usando el formulario de arriba.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={optimisticColors.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {optimisticColors.map((color) => (
                    <ColorItem
                      key={color.id}
                      colorConfig={color}
                      onUpdate={handleUpdateColor}
                      onDelete={() => handleDeleteColor(color.dbId)}
                      isUpdatingThisItem={updatingColorId === color.dbId}
                      isDeletingThisItem={deletingColorId === color.dbId}
                      isPending={color.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {(isAdding || isUpdating || isDeleting || isPendingOrder) && (
            <div className="fixed bottom-4 right-4 z-50">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

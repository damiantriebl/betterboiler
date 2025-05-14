"use client";

import {
  type CreateSucursalState,
  type DeleteSucursalState,
  type UpdateOrderState,
  type UpdateSucursalState,
  createSucursal,
  deleteSucursal,
  updateSucursal,
  updateSucursalesOrder,
} from "@/actions/configuration/manage-sucursales";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Sucursal } from "@prisma/client";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect, useTransition } from "react";
import AddBranchItem from "./AddBranchItem";
import SucursalItem from "./BranchItem";

interface ManageBranchesProps {
  initialSucursalesData: Sucursal[];
}

type LocalSucursal = Sucursal;

export default function ManageBranches({ initialSucursalesData }: ManageBranchesProps) {
  const [sucursales, setSucursales] = useState<LocalSucursal[]>(initialSucursalesData);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAdding, startAddTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();

  useEffect(() => {
    setSucursales(initialSucursalesData);
  }, [initialSucursalesData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAddSucursal = (newSucursalName: string) => {
    const trimmedName = newSucursalName.trim();
    if (!trimmedName) return;

    const formData = new FormData();
    formData.append("name", trimmedName);

    startAddTransition(async () => {
      const result: CreateSucursalState = await createSucursal(null, formData);
      if (result.success && result.sucursal) {
        const newSucursal = result.sucursal;
        setSucursales((prev) => [...prev, newSucursal].sort((a, b) => a.order - b.order));
        toast({
          title: "Sucursal añadida",
          description: `"${newSucursal.name}" se añadió con éxito.`,
        });
      } else {
        toast({ variant: "destructive", title: "Error al añadir", description: result.error });
      }
    });
  };

  const handleDeleteSucursal = (idToDelete: number) => {
    const sucursalToDelete = sucursales.find((s) => s.id === idToDelete);
    if (!sucursalToDelete) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar la sucursal "${sucursalToDelete.name}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.append("id", idToDelete.toString());

    startTransition(async () => {
      const previousSucursales = sucursales;
      setSucursales((prev) => prev.filter((s) => s.id !== idToDelete));

      const result: DeleteSucursalState = await deleteSucursal(null, formData);
      if (result.success) {
        toast({
          title: "Sucursal eliminada",
          description: `"${sucursalToDelete.name}" ha sido eliminada.`,
        });
      } else {
        setSucursales(previousSucursales);
        toast({ variant: "destructive", title: "Error al eliminar", description: result.error });
      }
    });
  };

  const handleEditSucursal = (idToEdit: number, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return;

    const originalSucursal = sucursales.find((s) => s.id === idToEdit);
    if (!originalSucursal || originalSucursal.name === trimmedNewName) return;

    const formData = new FormData();
    formData.append("id", idToEdit.toString());
    formData.append("name", trimmedNewName);

    startUpdateTransition(async () => {
      const previousSucursales = sucursales;
      setSucursales((prev) =>
        prev.map((s) => (s.id === idToEdit ? { ...s, name: trimmedNewName } : s)),
      );

      const result: UpdateSucursalState = await updateSucursal(null, formData);
      if (result.success && result.sucursal) {
        const updatedSucursal = result.sucursal;
        setSucursales((prev) => prev.map((s) => (s.id === idToEdit ? updatedSucursal : s)));
        toast({
          title: "Sucursal renombrada",
          description: `"${originalSucursal.name}" ahora es "${updatedSucursal.name}".`,
        });
      } else {
        setSucursales(previousSucursales);
        toast({ variant: "destructive", title: "Error al renombrar", description: result.error });
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeId = Number(active.id);
      const overId = Number(over.id);

      let orderedItemsForAction: { id: number; order: number }[] = [];
      const previousSucursales = sucursales;

      setSucursales((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === activeId);
        const newIndex = currentItems.findIndex((item) => item.id === overId);
        if (oldIndex === -1 || newIndex === -1) return currentItems;

        const movedItems = arrayMove(currentItems, oldIndex, newIndex);

        orderedItemsForAction = movedItems.map((item, index) => ({ id: item.id, order: index }));

        return movedItems;
      });

      if (orderedItemsForAction.length > 0) {
        startTransition(async () => {
          const result: UpdateOrderState = await updateSucursalesOrder(null, orderedItemsForAction);
          if (!result.success) {
            setSucursales(previousSucursales);
            toast({
              variant: "destructive",
              title: "Error al reordenar",
              description: result.error,
            });
          } else {
            toast({
              title: "Orden actualizado",
              description: "El orden de las sucursales se guardó.",
            });
          }
        });
      }
    }
  };

  return (
    <div className="w-full space-y-4 my-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold">Gestionar Sucursales</h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <div className="flex flex-col gap-3">
          <SortableContext
            items={sucursales.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sucursales.map((sucursal) => (
              <SucursalItem
                key={sucursal.id}
                id={sucursal.id}
                name={sucursal.name}
                onEdit={handleEditSucursal}
                onDelete={handleDeleteSucursal}
                isUpdating={isUpdating && !!sucursales.find((s) => s.id === sucursal.id)}
              />
            ))}
          </SortableContext>
          <AddBranchItem onAdd={handleAddSucursal} isAdding={isAdding} className="mt-2" />

          {sucursales.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">No hay sucursales añadidas.</p>
          )}
        </div>
      </DndContext>
    </div>
  );
}

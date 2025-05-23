"use client";

import {
  type CreateBranchState,
  type DeleteBranchState,
  type UpdateBranchesOrderState,
  type UpdateBranchState,
  createBranch,
  deleteBranch,
  updateBranch,
  updateBranchesOrder,
} from "@/actions/configuration/manage-branches";
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
import type { Branch } from "@prisma/client";
import React, { useState, useEffect, useTransition } from "react";
import AddBranchItem from "./AddBranchItem";
import BranchItem from "./BranchItem";

interface ManageBranchesProps {
  initialBranchesData: Branch[];
}

type LocalBranch = Branch;

export default function ManageBranches({ initialBranchesData }: ManageBranchesProps) {
  const [branches, setBranches] = useState<LocalBranch[]>(initialBranchesData);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAdding, startAddTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();

  useEffect(() => {
    setBranches(initialBranchesData);
  }, [initialBranchesData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAddBranch = (newBranchName: string) => {
    const trimmedName = newBranchName.trim();
    if (!trimmedName) return;

    const formData = new FormData();
    formData.append("name", trimmedName);

    startAddTransition(async () => {
      const result: CreateBranchState = await createBranch(null, formData);
      if (result.success && result.branch) {
        const newBranch = result.branch;
        setBranches((prev) => [...prev, newBranch].sort((a, b) => a.order - b.order));
        toast({
          title: "Sucursal añadida",
          description: `"${newBranch.name}" se añadió con éxito.`,
        });
      } else {
        toast({ variant: "destructive", title: "Error al añadir", description: result.error });
      }
    });
  };

  const handleDeleteBranch = (idToDelete: number) => {
    const branchToDelete = branches.find((b) => b.id === idToDelete);
    if (!branchToDelete) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar la sucursal "${branchToDelete.name}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.append("id", idToDelete.toString());

    startTransition(async () => {
      const previousBranches = branches;
      setBranches((prev) => prev.filter((b) => b.id !== idToDelete));

      const result: DeleteBranchState = await deleteBranch(null, formData);
      if (result.success) {
        toast({
          title: "Sucursal eliminada",
          description: `"${branchToDelete.name}" ha sido eliminada.`,
        });
      } else {
        setBranches(previousBranches);
        toast({ variant: "destructive", title: "Error al eliminar", description: result.error });
      }
    });
  };

  const handleEditBranch = (idToEdit: number, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return;

    const originalBranch = branches.find((b) => b.id === idToEdit);
    if (!originalBranch || originalBranch.name === trimmedNewName) return;

    const formData = new FormData();
    formData.append("id", idToEdit.toString());
    formData.append("name", trimmedNewName);

    startUpdateTransition(async () => {
      const previousBranches = branches;
      setBranches((prev) =>
        prev.map((b) => (b.id === idToEdit ? { ...b, name: trimmedNewName } : b)),
      );

      const result: UpdateBranchState = await updateBranch(null, formData);
      if (result.success && result.branch) {
        const updatedBranch = result.branch;
        setBranches((prev) => prev.map((b) => (b.id === idToEdit ? updatedBranch : b)));
        toast({
          title: "Sucursal renombrada",
          description: `"${originalBranch.name}" ahora es "${updatedBranch.name}".`,
        });
      } else {
        setBranches(previousBranches);
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
      const previousBranches = branches;

      setBranches((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === activeId);
        const newIndex = currentItems.findIndex((item) => item.id === overId);
        if (oldIndex === -1 || newIndex === -1) return currentItems;

        const movedItems = arrayMove(currentItems, oldIndex, newIndex);

        orderedItemsForAction = movedItems.map((item, index) => ({ id: item.id, order: index }));

        return movedItems;
      });

      if (orderedItemsForAction.length > 0) {
        startTransition(async () => {
          const result: UpdateBranchesOrderState = await updateBranchesOrder(
            null,
            orderedItemsForAction,
          );
          if (!result.success) {
            setBranches(previousBranches);
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
          <SortableContext items={branches.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {branches.map((branch) => (
              <BranchItem
                key={branch.id}
                id={branch.id}
                name={branch.name}
                onEdit={handleEditBranch}
                onDelete={handleDeleteBranch}
                isUpdating={isUpdating && !!branches.find((b) => b.id === branch.id)}
              />
            ))}
          </SortableContext>
          <AddBranchItem onAdd={handleAddBranch} isAdding={isAdding} className="mt-2" />

          {branches.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">No hay sucursales añadidas.</p>
          )}
        </div>
      </DndContext>
    </div>
  );
}

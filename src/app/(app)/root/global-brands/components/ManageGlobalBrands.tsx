"use client";

// Import real actions
import {
  createRootBrand,
  createRootModel,
  deleteRootBrand,
  deleteRootModel,
  updateRootBrand,
  updateRootBrandsOrder,
  updateRootModel,
  updateRootModelsOrder,
} from "@/actions/root/global-brand-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionState } from "@/hooks/use-action-state";
import { useToast } from "@/hooks/use-toast"; // Trying custom hook path again
import type {
  ActionState,
  BatchActionState,
  CreateBrandState,
  CreateModelState,
  UpdateBrandState,
  UpdateModelState,
} from "@/types/action-states";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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
// Import real types
import type { Brand, Model } from "@prisma/client";
import { Plus } from "lucide-react";
import React, { useState, useEffect, useTransition } from "react";
// TODO: Crear e importar CreateGlobalBrandModal
import CreateGlobalBrandModal from "./CreateGlobalBrandModal";
// TODO: Crear e importar SingleGlobalBrandColumn
import SingleGlobalBrandColumn from "./SingleGlobalBrandColumn";

interface ManageGlobalBrandsProps {
  initialGlobalBrands: (Brand & { models?: Model[] })[]; // Use Prisma types
}

export default function ManageGlobalBrands({ initialGlobalBrands }: ManageGlobalBrandsProps) {
  // Use Prisma types for state
  const [brands, setBrands] = useState<(Brand & { models?: Model[] })[]>(initialGlobalBrands);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderPending, startOrderTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isModelActionPending, startModelActionTransition] = useTransition();
  const [isBrandUpdatePending, startBrandUpdateTransition] = useTransition();
  const actionState = useActionState();

  useEffect(() => {
    setBrands(initialGlobalBrands);
  }, [initialGlobalBrands]);

  useEffect(() => {
    if (actionState.success) {
      setIsModalOpen(false);
    }
  }, [actionState.success]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleBrandDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const activeId = Number.parseInt(active.id.toString(), 10);
    const overId = Number.parseInt(over.id.toString(), 10);
    const oldIndex = brands.findIndex((b) => b.id === activeId);
    const newIndex = brands.findIndex((b) => b.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newlyOrderedBrands = arrayMove(brands, oldIndex, newIndex);
    // Update local state for visual feedback
    startOrderTransition(() => {
      setBrands(newlyOrderedBrands);
    });

    // Prepare payload based on current visual order
    const orderPayload = newlyOrderedBrands.map((b, index) => ({ id: b.id, order: index }));
    const previousBrands = brands;

    startOrderTransition(async () => {
      // Call the real action
      const result: BatchActionState = await updateRootBrandsOrder(orderPayload);
      if (!result.success) {
        toast({
          title: "Error al guardar orden",
          description: result.error,
          variant: "destructive",
        });
        startOrderTransition(() => setBrands(previousBrands)); // Revert optimistic update
      } else {
        toast({ title: "Orden guardado (validado)", description: result.message });
        // No need to setBrands again if revalidation works
      }
    });
  };

  const handleBrandDelete = (brandIdToDelete: number) => {
    const brandToDelete = brands.find((b) => b.id === brandIdToDelete);
    const previousBrands = brands;
    // Optimistic update
    startDeleteTransition(() => {
      setBrands((prev) => prev.filter((b) => b.id !== brandIdToDelete));
    });

    startDeleteTransition(async () => {
      // Call the real action
      const result: ActionState = await deleteRootBrand(brandIdToDelete);
      if (!result.success) {
        toast({ title: "Error eliminar marca", description: result.error, variant: "destructive" });
        startDeleteTransition(() => setBrands(previousBrands)); // Revert optimistic update
      } else {
        toast({ title: `Marca "${brandToDelete?.name}" eliminada`, description: result.message });
        // No need to setBrands again if revalidation works
      }
    });
  };

  const handleBrandUpdate = (formData: FormData) => {
    // Note: useActionState could be used here too for finer control
    const brandId = Number(formData.get("id"));
    const newName = formData.get("name") as string;
    const previousBrands = brands;
    // Optimistic update
    startBrandUpdateTransition(() => {
      setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, name: newName } : b)));
    });

    startBrandUpdateTransition(async () => {
      // Call the real action (needs prevState for useActionState, but we aren't using it here)
      // Pass null or a default initial state if the action expects it
      const result: UpdateBrandState = await updateRootBrand({ success: false }, formData);
      if (!result.success) {
        toast({
          title: "Error al actualizar marca",
          description: result.error,
          variant: "destructive",
        });
        startBrandUpdateTransition(() => setBrands(previousBrands)); // Revert optimistic update
      } else {
        toast({ title: "Marca actualizada", description: result.message });
        // Update with data from server to be safe, though revalidate should handle it
        if (result.data) {
          startBrandUpdateTransition(() => {
            setBrands((prev) =>
              prev.map((b) => (b.id === result.data!.id ? { ...b, name: result.data!.name } : b)),
            );
          });
        }
      }
    });
  };

  const openAddModal = () => setIsModalOpen(true);

  const handleAddModel = (formData: FormData) => {
    // This could also use useActionState within the SingleGlobalBrandColumn component
    const brandId = Number(formData.get("brandId"));
    const previousBrands = brands;
    // No simple optimistic update here, wait for server response with new ID

    startModelActionTransition(async () => {
      // Call the real action
      const result: CreateModelState = await createRootModel({ success: false }, formData);
      if (!result.success) {
        toast({ title: "Error añadir modelo", description: result.error, variant: "destructive" });
        // No need to revert optimistic update here
      } else {
        toast({ title: "Modelo añadido", description: result.message });
        // Add the new model returned from the action
        if (result.data) {
          const newModel = result.data;
          startModelActionTransition(() => {
            setBrands((prev) =>
              prev.map((b) =>
                b.id === brandId ? { ...b, models: [...(b.models || []), newModel] } : b,
              ),
            );
          });
        }
        // Revalidation should update the list, but manual update provides immediate feedback
      }
    });
  };

  const handleUpdateModel = (formData: FormData) => {
    const modelId = Number(formData.get("id"));
    const brandId = Number(formData.get("brandId"));
    const newName = formData.get("name") as string;
    const previousBrands = brands;
    // Optimistic update
    startModelActionTransition(() => {
      setBrands((prev) =>
        prev.map((b) =>
          b.id === brandId
            ? {
                ...b,
                models: b.models?.map((m) => (m.id === modelId ? { ...m, name: newName } : m)),
              }
            : b,
        ),
      );
    });

    startModelActionTransition(async () => {
      // Call the real action
      const result: UpdateModelState = await updateRootModel({ success: false }, formData);
      if (!result.success) {
        toast({
          title: "Error actualizar modelo",
          description: result.error,
          variant: "destructive",
        });
        startModelActionTransition(() => setBrands(previousBrands));
      } else {
        toast({ title: "Modelo actualizado", description: result.message });
        // Update with data from server to be safe
        if (result.data) {
          const updatedModel = result.data;
          startModelActionTransition(() => {
            setBrands((prev) =>
              prev.map((b) =>
                b.id === brandId
                  ? {
                      ...b,
                      models: b.models?.map((m) => (m.id === updatedModel.id ? updatedModel : m)),
                    }
                  : b,
              ),
            );
          });
        }
      }
    });
  };

  const handleDeleteModel = (modelId: number, brandId: number) => {
    const previousBrands = brands;
    // Optimistic update
    startModelActionTransition(() => {
      setBrands((prev) =>
        prev.map((b) =>
          b.id === brandId ? { ...b, models: b.models?.filter((m) => m.id !== modelId) } : b,
        ),
      );
    });

    startModelActionTransition(async () => {
      // Call the real action
      const result: ActionState = await deleteRootModel(modelId);
      if (!result.success) {
        toast({
          title: "Error al eliminar modelo",
          description: result.error,
          variant: "destructive",
        });
        startModelActionTransition(() => setBrands(previousBrands)); // Revert
      } else {
        toast({ title: "Modelo eliminado", description: result.message });
        // No need to setBrands again if revalidation works
      }
    });
  };

  const handleModelsOrderUpdate = (
    brandId: number,
    orderedModels: { modelId: number; order: number }[],
  ) => {
    const previousBrands = brands;
    const brandIndex = brands.findIndex((b) => b.id === brandId);
    if (brandIndex === -1) return;

    // Optimistic update based on visual order
    const updatedBrands = [...brands];
    const currentModels = updatedBrands[brandIndex].models || [];
    // Create a map for quick lookup
    const currentModelsMap = new Map(currentModels.map((m) => [m.id, m]));
    // Reorder based on the input, preserving original model data
    const reorderedModels = orderedModels
      .map((orderInfo) => currentModelsMap.get(orderInfo.modelId))
      .filter((model): model is Model => model !== undefined);

    updatedBrands[brandIndex] = { ...updatedBrands[brandIndex], models: reorderedModels };
    startModelActionTransition(() => {
      setBrands(updatedBrands);
    });

    // Prepare payload for the action
    const orderPayload = { brandId, modelOrders: orderedModels };

    startModelActionTransition(async () => {
      // Call the real action
      const result: BatchActionState = await updateRootModelsOrder(orderPayload);
      if (!result.success) {
        toast({ title: "Error orden modelos", description: result.error, variant: "destructive" });
        startModelActionTransition(() => setBrands(previousBrands)); // Revert optimistic update
      } else {
        toast({ title: "Orden Modelos guardado (validado)", description: result.message });
        // Revalidation should handle the final state
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionar Marcas Globales</CardTitle>
        <Button size="sm" onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Añadir Marca Global
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Arrastra las marcas globales para cambiar su orden. Edita modelos.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleBrandDragEnd}
        >
          <SortableContext
            items={brands.map((b) => b.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {brands.map((brand) => (
                <SingleGlobalBrandColumn
                  key={brand.id}
                  brand={brand}
                  onDelete={handleBrandDelete} // Pass real action handler
                  onUpdate={handleBrandUpdate} // Pass real action handler
                  onAddModel={handleAddModel} // Pass real action handler
                  onUpdateModel={handleUpdateModel} // Pass real action handler
                  onDeleteModel={handleDeleteModel} // Pass real action handler
                  onModelsOrderUpdate={handleModelsOrderUpdate} // Pass real action handler
                  // TODO: Pass pending states if needed
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <CreateGlobalBrandModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          createAction={createRootBrand} // Pass the REAL action
          onSuccess={() => {
            // Revalidation handles state update, so onSuccess might just be for logging
            // or triggering other side effects if necessary.
            console.log("CreateGlobalBrandModal reported success.");
            // No need to manually update state here if revalidation is working
          }}
        />
      </CardContent>
    </Card>
  );
}

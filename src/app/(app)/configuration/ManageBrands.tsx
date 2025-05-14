"use client";

import {
  addModelToOrganizationBrand,
  dissociateOrganizationBrand,
  updateOrganizationBrandAssociation,
  updateOrganizationBrandsOrder,
  updateOrganizationModel,
  updateOrganizationModelsOrder,
} from "@/actions/configuration/create-edit-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Model } from "@prisma/client"; // Assuming Model type is available
import { Plus } from "lucide-react";
import React, { useState, useEffect, useTransition, useCallback } from "react";
import CreateBrandModal from "./CreateBrandModal";
import type { DisplayModelData, OrganizationBrandDisplayData } from "./Interfaces";
import SingleBrandColumn from "./SingleBrandColumn";

interface ManageBrandsProps {
  initialOrganizationBrands: OrganizationBrandDisplayData[];
  organizationId: string | null | undefined;
}

export default function ManageBrands({
  initialOrganizationBrands,
  organizationId,
}: ManageBrandsProps) {
  const [associations, setAssociations] =
    useState<OrganizationBrandDisplayData[]>(initialOrganizationBrands);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderPending, startOrderTransition] = useTransition();
  const [isDissociatePending, startDissociateTransition] = useTransition();
  const [isAssociationUpdatePending, startAssociationUpdateTransition] = useTransition();
  const [isModelActionPending, startModelActionTransition] = useTransition();

  useEffect(() => {
    setAssociations(initialOrganizationBrands);
  }, [initialOrganizationBrands]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAssociationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!organizationId || !active || !over || active.id === over.id) return;

    const activeId = Number.parseInt(active.id.toString(), 10);
    const overId = Number.parseInt(over.id.toString(), 10);

    const oldIndex = associations.findIndex((a) => a.id === activeId);
    const newIndex = associations.findIndex((a) => a.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newlyOrderedAssociations = arrayMove(associations, oldIndex, newIndex);
    const associationsWithUpdatedOrder = newlyOrderedAssociations.map((item, index) => ({
      ...item,
      order: index,
    }));
    setAssociations(associationsWithUpdatedOrder);

    const orderPayload = associationsWithUpdatedOrder.map((a) => ({ id: a.id, order: a.order }));
    const previousAssociations = associations;

    startOrderTransition(async () => {
      const result = await updateOrganizationBrandsOrder(null, orderPayload);
      if (!result.success) {
        toast({
          title: "Error al guardar orden",
          description: result.error,
          variant: "destructive",
        });
        setAssociations(previousAssociations);
      } else {
        toast({ title: "Orden guardado" });
      }
    });
  };

  const handleAssociationDelete = (organizationBrandIdToDelete: number) => {
    if (!organizationId) return;
    const assocToDelete = associations.find((a) => a.id === organizationBrandIdToDelete);
    const previousAssociations = associations;
    setAssociations((prev) => prev.filter((a) => a.id !== organizationBrandIdToDelete));

    startDissociateTransition(async () => {
      const formData = new FormData();
      formData.append("organizationBrandId", organizationBrandIdToDelete.toString());
      const result = await dissociateOrganizationBrand(null, formData);
      if (!result.success) {
        toast({
          title: "Error al desasociar Marca",
          description: result.error,
          variant: "destructive",
        });
        setAssociations(previousAssociations);
      } else {
        toast({
          title: "Marca desasociada",
          description: `Marca "${assocToDelete?.brand.name ?? "Desconocida"}" desasociada.`,
        });
      }
    });
  };

  const handleAssociationUpdate = (formData: FormData) => {
    if (!organizationId) return;
    startAssociationUpdateTransition(async () => {
      const result = await updateOrganizationBrandAssociation(null, formData);
      if (!result.success) {
        toast({
          title: "Error al actualizar Color Asociación",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Color de Asociación actualizado" });
      }
    });
  };

  const openAddModal = () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Se requiere una organización para añadir marcas.",
        variant: "destructive",
      });
      return;
    }
    setIsModalOpen(true);
  };

  const handleAddModel = (formData: FormData) => {
    if (!organizationId) return;
    startModelActionTransition(async () => {
      const result = await addModelToOrganizationBrand(null, formData);
      if (!result.success) {
        toast({
          title: "Error al añadir Modelo",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Modelo añadido", description: result.message });
      }
    });
  };

  const handleUpdateModel = (formData: FormData) => {
    if (!organizationId) return;
    startModelActionTransition(async () => {
      const result = await updateOrganizationModel(null, formData);
      if (!result.success) {
        toast({
          title: "Error al reemplazar Modelo",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Modelo reemplazado", description: result.message });
      }
    });
  };

  const handleModelsOrderUpdate = (
    brandId: number,
    orderedModels: { modelId: number; order: number }[],
  ) => {
    if (!organizationId) return;
    const previousAssociations = associations;
    const brandIndex = associations.findIndex((a) => a.brand.id === brandId);
    if (brandIndex === -1) return;

    const updatedAssociations = [...associations];

    // Map and then filter out undefined models before sorting
    const updatedModels = orderedModels
      .map((modelOrder): (DisplayModelData & { orgOrder: number }) | undefined => {
        const originalModel = associations[brandIndex].brand.models.find(
          (m) => m.id === modelOrder.modelId,
        );
        if (!originalModel) {
          console.warn(`Model with ID ${modelOrder.modelId} not found during order update.`);
          return undefined; // Return undefined if model not found
        }
        // Removed the non-null assertion, spread is safe now
        return { ...originalModel, orgOrder: modelOrder.order };
      })
      .filter((model): model is DisplayModelData & { orgOrder: number } => model !== undefined) // Type guard filter
      .sort((a, b) => a.orgOrder - b.orgOrder);

    updatedAssociations[brandIndex] = {
      ...updatedAssociations[brandIndex],
      brand: { ...updatedAssociations[brandIndex].brand, models: updatedModels },
    };
    setAssociations(updatedAssociations);

    startModelActionTransition(async () => {
      const result = await updateOrganizationModelsOrder(null, {
        modelOrders: orderedModels,
        brandId,
      });
      if (!result.success) {
        toast({
          title: "Error al guardar orden Modelos",
          description: result.error,
          variant: "destructive",
        });
        setAssociations(previousAssociations);
      } else {
        toast({ title: "Orden Modelos guardado" });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionar Marcas Asociadas</CardTitle>
        <Button size="sm" onClick={openAddModal} disabled={!organizationId}>
          <Plus className="mr-2 h-4 w-4" /> Asociar Marca
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Arrastra las marcas asociadas para cambiar su orden. Edita colores y modelos dentro de
          cada columna.
        </p>
        {!organizationId ? (
          <p className="text-center text-red-600">Error: No se pudo determinar la organización.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleAssociationDragEnd}
          >
            <SortableContext
              items={associations.map((a) => a.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">
                {associations.map((associationData) => (
                  <SingleBrandColumn
                    key={associationData.id}
                    id={associationData.id}
                    organizationBrandId={associationData.id}
                    brand={associationData.brand}
                    initialColor={associationData.color ?? undefined}
                    organizationId={organizationId}
                    onAssociationUpdate={handleAssociationUpdate}
                    onAssociationDelete={handleAssociationDelete}
                    onUpdateModel={handleUpdateModel}
                    onModelsOrderUpdate={handleModelsOrderUpdate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {organizationId && associations.length === 0 && (
          <p className="text-center text-muted-foreground mt-4">
            No hay marcas asociadas a esta organización.
          </p>
        )}
      </CardContent>

      {isModalOpen && organizationId && (
        <CreateBrandModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          organizationId={organizationId}
          onSuccess={() => {
            console.log("Modal de asociación de marca cerrado con éxito.");
          }}
          existingBrandIds={associations.map((assoc) => assoc.brand.id)}
        />
      )}
    </Card>
  );
}

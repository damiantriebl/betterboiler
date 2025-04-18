"use client";

import React, { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  DndContext as ModelDndContext,
  DragEndEvent as ModelDragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor as ModelPointerSensor,
  KeyboardSensor as ModelKeyboardSensor,
  closestCorners as modelClosestCorners,
  useSensor as useModelSensor,
  useSensors as useModelSensors,
} from "@dnd-kit/core";
import {
  SortableContext as ModelSortableContext,
  arrayMove as modelArrayMove,
  sortableKeyboardCoordinates as modelSortableKeyboardCoordinates,
  verticalListSortingStrategy as modelVerticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import BrandContainer from "./BrandContainer";
import ModelItem from "./ModelItem";
import AddModelItem from "./AddModelItem";
import { Check, X as CancelIcon, Palette, GripVertical, Loader2, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { renameBrandByDuplication } from "@/actions/configuration/create-edit-brand";
import { BrandWithDisplayModelsData, DisplayModelData } from "./Interfaces";
import {
  dissociateOrganizationBrand,
  dissociateOrganizationModel,
} from "@/actions/configuration/create-edit-brand";

interface SingleBrandColumnProps {
  id: number;
  organizationBrandId: number;
  brand: BrandWithDisplayModelsData;
  initialColor: string | undefined;
  organizationId: string | null | undefined;
  onAssociationUpdate: (formData: FormData) => void;
  onAssociationDelete: (organizationBrandId: number) => void;
  onAddModel: (formData: FormData) => void;
  onUpdateModel: (formData: FormData) => void;
  onModelsOrderUpdate: (
    brandId: number,
    orderedModels: { modelId: number; order: number }[],
  ) => void;
}

export default function SingleBrandColumn({
  id,
  organizationBrandId,
  brand,
  initialColor,
  organizationId,
  onAssociationUpdate,
  onAssociationDelete,
  onAddModel,
  onUpdateModel,
  onModelsOrderUpdate,
}: SingleBrandColumnProps) {
  const { id: brandId, name: brandName, models: initialDisplayModels } = brand;
  const [models, setModels] = useState<DisplayModelData[]>(initialDisplayModels);
  const [activeModel, setActiveModel] = useState<DisplayModelData | null>(null);
  const [associationColor, setAssociationColor] = useState(initialColor ?? "#CCCCCC");
  const [tempAssociationColor, setTempAssociationColor] = useState(associationColor);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isRenamingDuplicate, setIsRenamingDuplicate] = useState(false);
  const [newNameDuplicate, setNewNameDuplicate] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [isPendingAssociationAct, startAssociationActTransition] = useTransition();
  const [isPendingModelAction, startModelActionTransition] = useTransition();
  const [isPendingRenameDup, startRenameDupTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({ id: id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnDragging ? 0.8 : 1,
    zIndex: isColumnDragging ? 10 : undefined,
  };

  const modelSensors = useModelSensors(
    useModelSensor(ModelPointerSensor),
    useModelSensor(ModelKeyboardSensor, {
      coordinateGetter: modelSortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setModels(initialDisplayModels);
  }, [initialDisplayModels]);

  useEffect(() => {
    setAssociationColor(initialColor ?? "#CCCCCC");
  }, [initialColor]);

  useEffect(() => {
    if (isColorPickerOpen) {
      setTempAssociationColor(associationColor);
    }
  }, [isColorPickerOpen, associationColor]);

  useEffect(() => {
    if (isRenamingDuplicate) {
      renameInputRef.current?.focus();
    }
  }, [isRenamingDuplicate]);

  const handleApplyColor = () => {
    setIsColorPickerOpen(false);
    const formData = new FormData();
    formData.append("organizationBrandId", organizationBrandId.toString());
    formData.append("color", tempAssociationColor);
    onAssociationUpdate(formData);
    setAssociationColor(tempAssociationColor);
  };

  const handleCancelColor = () => {
    setIsColorPickerOpen(false);
  };

  const handleRenameDuplicateClick = () => {
    setNewNameDuplicate(brandName);
    setIsRenamingDuplicate(true);
  };

  const handleRenameDuplicateNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewNameDuplicate(event.target.value);
  };

  const handleConfirmRenameDuplicate = async () => {
    const trimmedNewName = newNameDuplicate.trim();
    if (!trimmedNewName || trimmedNewName === brandName) {
      toast({
        title: "Nombre inválido",
        description: "Introduce un nombre diferente al actual.",
        variant: "destructive",
      });
      return;
    }

    startRenameDupTransition(async () => {
      const formData = new FormData();
      formData.append("oldOrganizationBrandId", organizationBrandId.toString());
      formData.append("newBrandName", trimmedNewName);

      const result = await renameBrandByDuplication(null, formData);

      if (!result.success) {
        toast({
          title: "Error al Renombrar/Duplicar",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Marca Renombrada/Duplicada", description: result.message });
        setIsRenamingDuplicate(false);
        setNewNameDuplicate("");
      }
    });
  };

  const handleRenameDuplicateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleConfirmRenameDuplicate();
    if (event.key === "Escape") {
      setIsRenamingDuplicate(false);
      setNewNameDuplicate("");
    }
  };

  const handleRenameDuplicateBlur = () => setTimeout(handleConfirmRenameDuplicate, 150);

  const handleAddModel = (modelName: string) => {
    const trimmedModelName = modelName.trim();
    if (!trimmedModelName) return;
    const formData = new FormData();
    formData.append("brandId", brandId.toString());
    formData.append("name", trimmedModelName);
    onAddModel(formData);
  };

  const handleUpdateModelInternal = (modelId: number, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const formData = new FormData();
    formData.append("id", modelId.toString());
    formData.append("name", trimmedName);
    formData.append("brandId", brandId.toString());
    onUpdateModel(formData);
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, name: trimmedName } : m)));
  };

  const handleDissociateModelInternal = async (modelIdToDissociate: number) => {
    if (!organizationId) return;
    const modelName = models.find((m) => m.id === modelIdToDissociate)?.name ?? "Desconocido";
    const previousModels = models;

    setModels((prev) => prev.filter((m) => m.id !== modelIdToDissociate));

    startModelActionTransition(async () => {
      const formData = new FormData();
      formData.append("organizationId", organizationId);
      formData.append("modelId", modelIdToDissociate.toString());

      const result = await dissociateOrganizationModel(null, formData);

      if (!result.success) {
        toast({
          title: "Error al ocultar Modelo",
          description: result.error || result.message,
          variant: "destructive",
        });
        setModels(previousModels);
      } else {
        toast({ title: "Modelo Ocultado", description: result.message });
      }
    });
  };

  const handleDragStartModels = (event: DragStartEvent) => {
    const { active } = event;
    const model = models.find((m) => m.id.toString() === active.id);
    setActiveModel(model || null);
  };

  const handleDragEndModels = (event: ModelDragEndEvent) => {
    setActiveModel(null);
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const activeModelId = parseInt(active.id.toString(), 10);
    const overModelId = parseInt(over.id.toString(), 10);

    const oldIndex = models.findIndex((m) => m.id === activeModelId);
    const newIndex = models.findIndex((m) => m.id === overModelId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newlyOrderedModels = modelArrayMove(models, oldIndex, newIndex);
    const modelsWithUpdatedOrgOrder = newlyOrderedModels.map((item, index) => ({
      ...item,
      orgOrder: index,
    }));
    setModels(modelsWithUpdatedOrgOrder);

    const orderPayload = modelsWithUpdatedOrgOrder.map((m) => ({
      modelId: m.id,
      order: m.orgOrder,
    }));

    onModelsOrderUpdate(brandId, orderPayload);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isColumnDragging ? "shadow-lg" : "")}
    >
      <BrandContainer
        id={organizationBrandId}
        brandName={brandName}
        isRenamingDuplicate={isRenamingDuplicate}
        newNameDuplicate={newNameDuplicate}
        onNameClick={handleRenameDuplicateClick}
        onRenameDuplicateNameChange={handleRenameDuplicateNameChange}
        onRenameDuplicateKeyDown={handleRenameDuplicateKeyDown}
        onRenameDuplicateBlur={handleRenameDuplicateBlur}
        renameInputRef={renameInputRef}
        onDelete={() => onAssociationDelete(organizationBrandId)}
        brandColor={associationColor}
        dragAttributes={attributes}
        dragListeners={listeners}
        renderColorButton={() => (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Editar color para ${brandName} en esta organización`}
                    >
                      <span
                        className="size-4 rounded-full border"
                        style={{ backgroundColor: associationColor }}
                      ></span>
                    </Button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 space-y-2" align="end">
                  <HexColorPicker color={tempAssociationColor} onChange={setTempAssociationColor} />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelColor}
                      className="h-7 w-7"
                      disabled={isPendingAssociationAct}
                    >
                      <CancelIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handleApplyColor}
                      className="h-7 w-7"
                      disabled={isPendingAssociationAct}
                    >
                      {isPendingAssociationAct ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipContent>Cambiar Color (Organización)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      >
        <ModelDndContext
          sensors={modelSensors}
          collisionDetection={modelClosestCorners}
          onDragStart={handleDragStartModels}
          onDragEnd={handleDragEndModels}
          modifiers={[restrictToVerticalAxis]}
        >
          <ModelSortableContext
            items={models.map((m) => m.id.toString())}
            strategy={modelVerticalListSortingStrategy}
          >
            {models.map((model) => (
              <ModelItem
                key={model.id}
                model={model}
                onUpdate={handleUpdateModelInternal}
                onDissociate={handleDissociateModelInternal}
              />
            ))}
          </ModelSortableContext>
          <DragOverlay modifiers={[restrictToWindowEdges]} dropAnimation={null}>
            {activeModel ? (
              <ModelItem
                model={activeModel}
                isOverlay
                onUpdate={() => {}}
                onDissociate={() => {}}
              />
            ) : null}
          </DragOverlay>
          <AddModelItem
            onAdd={handleAddModel}
            disabled={isPendingModelAction || isRenamingDuplicate}
          />
        </ModelDndContext>
      </BrandContainer>
    </div>
  );
}

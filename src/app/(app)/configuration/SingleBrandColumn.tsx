"use client";

import type React from "react";
import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  DndContext as ModelDndContext,
  type DragEndEvent as ModelDragEndEvent,
  DragOverlay,
  type DragStartEvent,
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
import { AddOrSelectModelModal } from "./AddOrSelectModelModal";
import {
  Check,
  X as CancelIcon,
  Palette,
  GripVertical,
  Loader2,
  Trash2,
  Copy,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import {
  renameBrandByDuplication,
  dissociateOrganizationBrand,
  updateOrganizationModel,
} from "@/actions/configuration/create-edit-brand";
import { getModelsByBrandId } from "@/actions/root/get-models-by-brand-id";
import { useModelsStore, type ModelData } from "@/stores/models-store";
import type {
  BrandWithDisplayModelsData,
  DisplayModelData,
} from "./Interfaces";

interface SingleBrandColumnProps {
  id: number;
  organizationBrandId: number;
  brand: BrandWithDisplayModelsData;
  initialColor: string | undefined;
  organizationId: string;
  onAssociationUpdate: (formData: FormData) => void;
  onAssociationDelete: (organizationBrandId: number) => void;
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
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);

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
    if (tempAssociationColor !== associationColor) {
      setAssociationColor(tempAssociationColor);
      const formData = new FormData();
      formData.append("organizationBrandId", organizationBrandId.toString());
      formData.append("color", tempAssociationColor);
      startAssociationActTransition(() => {
        onAssociationUpdate(formData);
      });
    }
    setIsColorPickerOpen(false);
  };

  const handleCancelColor = () => {
    setTempAssociationColor(associationColor);
    setIsColorPickerOpen(false);
  };

  const handleRenameDuplicateClick = () => {
    setNewNameDuplicate("");
    setIsRenamingDuplicate(true);
  };

  const handleRenameDuplicateNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewNameDuplicate(event.target.value);
  };

  const handleConfirmRenameDuplicate = async () => {
    const trimmedName = newNameDuplicate.trim();
    if (!trimmedName || trimmedName === brandName) {
      setIsRenamingDuplicate(false);
      return;
    }

    startRenameDupTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        toast({
          title: "Duplicación exitosa (simulada)",
          description: `Marca ${brandName} duplicada como ${trimmedName}`,
        });
      } catch (error) {
        console.error("Error duplicando marca:", error);
        toast({
          title: "Error al duplicar marca",
          description: "No se pudo completar la operación",
          variant: "destructive",
        });
      } finally {
        setIsRenamingDuplicate(false);
      }
    });
  };

  const handleRenameDuplicateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleConfirmRenameDuplicate();
    } else if (event.key === "Escape") {
      setIsRenamingDuplicate(false);
    }
  };

  const handleRenameDuplicateBlur = () => setTimeout(handleConfirmRenameDuplicate, 150);

  const handleUpdateModelInternal = (modelId: number, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const previousModels = models;
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, name: trimmedName } : m)));

    startModelActionTransition(async () => {
      const formData = new FormData();
      formData.append("id", modelId.toString());
      formData.append("name", trimmedName);
      formData.append("brandId", brandId.toString());

      const result = await updateOrganizationModel(null, formData);

      if (!result.success) {
        toast({
          title: "Error al actualizar Modelo",
          description: result.error,
          variant: "destructive",
        });
        setModels(previousModels);
      } else {
        toast({ title: "Modelo actualizado", description: result.message });
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

    const activeModelId = Number.parseInt(active.id.toString(), 10);
    const overModelId = Number.parseInt(over.id.toString(), 10);
    const oldIndex = models.findIndex((m) => m.id === activeModelId);
    const newIndex = models.findIndex((m) => m.id === overModelId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newlyOrderedModels = modelArrayMove(models, oldIndex, newIndex);
    setModels(newlyOrderedModels);

    const orderPayload = newlyOrderedModels.map((model, index) => ({
      modelId: model.id,
      order: index,
    }));

    startModelActionTransition(() => {
      onModelsOrderUpdate(brandId, orderPayload);
    });
  };

  const handleModelAdded = (model: ModelData) => {
    setIsAddModelModalOpen(false);

    // Add the selected model to the local state immediately
    const newModel: DisplayModelData = {
      id: model.id,
      name: model.name,
      orgOrder: models.length // Place new model at the end
    };

    setModels(prevModels => [...prevModels, newModel]);

    toast({
      title: "Modelo añadido",
      description: `El modelo "${model.name}" ha sido añadido`
    });
  };

  const isPending = isPendingAssociationAct || isPendingModelAction || isPendingRenameDup;

  const renderColorButton = () => (
    <Popover
      open={isColorPickerOpen}
      onOpenChange={setIsColorPickerOpen}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                style={{ color: associationColor }}
                disabled={isPending}
                className="h-7 w-7"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Color Asociado</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto p-0" align="end">
        <HexColorPicker
          color={tempAssociationColor}
          onChange={setTempAssociationColor}
        />
        <div className="flex justify-end p-2 space-x-2 bg-muted">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelColor}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={handleApplyColor}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <BrandContainer
          id={id}
          brandName={brandName}
          brandColor={associationColor}
          isRenamingDuplicate={isRenamingDuplicate}
          newNameDuplicate={newNameDuplicate}
          renameInputRef={renameInputRef}
          onNameClick={handleRenameDuplicateClick}
          onRenameDuplicateNameChange={handleRenameDuplicateNameChange}
          onRenameDuplicateKeyDown={handleRenameDuplicateKeyDown}
          onRenameDuplicateBlur={handleRenameDuplicateBlur}
          onDelete={() => onAssociationDelete(organizationBrandId)}
          renderColorButton={renderColorButton}
          dragAttributes={attributes as any}
          dragListeners={listeners}
          isPending={isPending}
          isDragging={isColumnDragging}
        >
          <div className="flex-grow overflow-y-auto px-1 pb-1 space-y-1 min-h-[60px] bg-background rounded-b-md">
            <ModelDndContext
              sensors={modelSensors}
              collisionDetection={modelClosestCorners}
              onDragStart={handleDragStartModels}
              onDragEnd={handleDragEndModels}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
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
                    onDissociate={() => alert("Dissociate action not implemented yet.")}
                  />
                ))}
              </ModelSortableContext>

              <DragOverlay>
                {activeModel ? (
                  <ModelItem
                    model={activeModel}
                    isOverlay
                    onUpdate={() => { }}
                    onDissociate={() => { }}
                  />
                ) : null}
              </DragOverlay>
            </ModelDndContext>

            <div className="px-2 py-1 mt-1 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setIsAddModelModalOpen(true)}
                disabled={isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir Modelo...
              </Button>
            </div>
          </div>
        </BrandContainer>
      </div>

      <AddOrSelectModelModal
        isOpen={isAddModelModalOpen}
        onClose={() => setIsAddModelModalOpen(false)}
        brandId={brandId}
        brandName={brandName}
        onModelAdded={handleModelAdded}
      />
    </>
  );
}

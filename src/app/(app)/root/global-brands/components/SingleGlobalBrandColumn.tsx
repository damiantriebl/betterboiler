"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileSpreadsheet,
  FileText,
  GripVertical,
  Image,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import NextImage from "next/image";
import React, { useState, useTransition } from "react";
// Import the ModelFilesModal
import { ModelFilesModal } from "./ModelFilesModal";
// Assuming types are defined elsewhere, potentially placeholders for now

// Placeholder types - replace with actual imports when available
type Brand = { id: number; name: string; order?: number; models?: Model[] };
type Model = { id: number; name: string; brandId: number; order?: number };

// Placeholder type for model items used in DND context
type SortableModel = Model & { id: string | number }; // Ensure id is string or number for dnd-kit

// Add this interface before the SingleGlobalBrandColumnProps
interface BrandFiles {
  hasPhoto: boolean;
  hasTechnicalSheet: boolean;
  hasOtherFiles: boolean;
}

interface SingleGlobalBrandColumnProps {
  brand: Brand & { models?: Model[] } & { files?: BrandFiles };
  onDelete: (brandId: number) => void;
  onUpdate: (formData: FormData) => void;
  onAddModel: (formData: FormData) => void;
  onUpdateModel: (formData: FormData) => void;
  onDeleteModel: (modelId: number, brandId: number) => void;
  onModelsOrderUpdate: (
    brandId: number,
    orderedModels: { modelId: number; order: number }[],
  ) => void;
}

// Internal component for individual sortable models
interface SortableModelItemProps {
  model: SortableModel;
  brandId: number;
  isEditingModel: boolean;
  editingModelId: number | null;
  editedModelName: string;
  onEditModelStart: (model: Model) => void;
  onEditModelNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditModelSave: (formData: FormData) => void;
  onEditModelCancel: () => void;
  onDeleteModel: (modelId: number, brandId: number) => void;
  onManageFiles: (modelId: number, modelName: string) => void;
  // TODO: Add pending states if needed
}

function SortableModelItem({
  model,
  brandId,
  isEditingModel,
  editingModelId,
  editedModelName,
  onEditModelStart,
  onEditModelNameChange,
  onEditModelSave,
  onEditModelCancel,
  onDeleteModel,
  onManageFiles,
}: SortableModelItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: model.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  // Calcular flags de archivos para el modelo
  const files = (model as any).files || [];

  // Utilidades para encontrar archivos relevantes
  const imageTypes = ["image", "img", "photo", "picture"];
  const isImage = (file: any) =>
    imageTypes.includes(file.type) || (file.url && /\.(jpe?g|png|webp|gif)$/i.test(file.url));

  const isSheet = (file: any) =>
    file.type === "spec_sheet" || (file.url && file.url.endsWith(".pdf"));

  // Obtener la marca desde el contexto superior donde está disponible
  const getBrandName = () => {
    try {
      // En SingleGlobalBrandColumn tenemos la prop 'brand' disponible
      if (typeof brandId === "number") {
        // Intentamos obtener el nombre de la marca desde el modelo
        const brandName = (model as any).brand?.name;
        if (brandName) return brandName.toLowerCase();

        // Es mejor usar el brandId para determinar la marca
        // que depender de variables globales
        return `brand_${brandId}`;
      }
      return "";
    } catch (e) {
      console.error("Error obteniendo nombre de marca:", e);
      return "";
    }
  };

  // Normalizar el nombre del modelo para uso en URLs (ejemplo: "R 1250 RT" -> "r-1250-rt")
  const getModelSlug = (modelName: string) => {
    return modelName.toLowerCase().replace(/\s+/g, "-");
  };

  // Nueva lógica para construir URLs con la estructura más simple
  const buildFileUrl = (
    fileType: "image" | "image_small" | "spec_sheet" | "other",
    fileName?: string,
  ): string => {
    if (!model?.name) return "";

    const brandSlug = getBrandName();
    const modelSlug = getModelSlug(model.name);
    const baseUrl = `https://uknapex.s3.us-east-1.amazonaws.com/models/${brandSlug}/${modelSlug}`;

    // Cada tipo de archivo tiene una convención de nombre fija
    switch (fileType) {
      case "image":
        return `${baseUrl}/img.webp`;
      case "image_small":
        return `${baseUrl}/img_small.webp`;
      case "spec_sheet":
        return `${baseUrl}/specsheet.pdf`;
      case "other":
        // Solo para archivos adicionales necesitamos el nombre específico
        if (!fileName) return "";
        return `${baseUrl}/others/${fileName}`;
      default:
        return "";
    }
  };

  // Obtener URLs para los distintos tipos de archivos
  const imageUrl = buildFileUrl("image");
  const pdfUrl = buildFileUrl("spec_sheet");

  // Para archivos adicionales, necesitamos nombres específicos
  const firstOtherFile = files.find((file: any) => !isImage(file) && !isSheet(file));
  const otherFileName = firstOtherFile?.name || "";
  const firstOtherUrl = otherFileName ? buildFileUrl("other", otherFileName) : "";

  // Para compatibilidad con la lógica existente
  const firstImageUrl = imageUrl;
  const firstPdfUrl = pdfUrl;
  const firstPdfName = "Ficha técnica";
  const firstOtherName = firstOtherFile?.name || "Archivo adicional";

  const hasPhoto =
    ("imageUrl" in model && !!(model as any).imageUrl) ||
    files.some(
      (file: any) =>
        ["image", "img", "photo", "picture"].includes(file.type) ||
        (file.url && /\.(jpe?g|png|webp|gif)$/i.test(file.url)),
    );
  const hasTechnicalSheet = !!(
    ("specSheetUrl" in model && (model as any).specSheetUrl) ||
    files.some((file: any) => file.type === "spec_sheet" || (file.url && file.url.endsWith(".pdf")))
  );
  const hasOtherFiles = files.some((file: any) => !isImage(file) && !isSheet(file));

  const handleSave = () => {
    const formData = new FormData();
    formData.append("id", model.id.toString());
    formData.append("name", editedModelName);
    formData.append("brandId", brandId.toString());
    onEditModelSave(formData);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center justify-between p-2 mb-1 bg-background border rounded"
      suppressHydrationWarning
    >
      {isEditingModel && editingModelId === model.id ? (
        <div className="flex-grow flex items-center gap-2">
          <Input
            type="text"
            value={editedModelName}
            onChange={onEditModelNameChange}
            className="h-8"
            aria-label={`Nuevo nombre para ${model.name}`}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
            <Save className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onEditModelCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex-grow flex items-center gap-2">
          <span {...listeners} className="cursor-grab touch-none p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </span>
          <span className="text-sm flex items-center gap-1">
            {model.name}

            {/* Íconos con previews en HoverCard */}
            {hasPhoto && firstImageUrl && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="Vista previa de imagen"
                    className="p-0 m-0 bg-transparent border-0 cursor-pointer flex items-center"
                    style={{ lineHeight: 0 }}
                  >
                    <Image className="h-4 w-4 text-blue-500" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto p-2">
                  {firstImageUrl && (
                    <NextImage
                      src={firstImageUrl}
                      alt="Vista previa"
                      width={180}
                      height={120}
                      className="object-contain rounded"
                    />
                  )}
                </HoverCardContent>
              </HoverCard>
            )}

            {hasTechnicalSheet && firstPdfUrl && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="Vista previa de ficha técnica"
                    className="p-0 m-0 bg-transparent border-0 cursor-pointer flex items-center"
                    style={{ lineHeight: 0 }}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-[220px] p-2">
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-12 w-12 text-green-500" />
                    <div className="text-xs mt-1 break-all text-center">{firstPdfName}</div>
                    <a
                      href={firstPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Ver PDF
                    </a>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {hasOtherFiles && firstOtherName && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="Vista previa de otros archivos"
                    className="p-0 m-0 bg-transparent border-0 cursor-pointer flex items-center"
                    style={{ lineHeight: 0 }}
                  >
                    <MoreHorizontal className="h-4 w-4 text-orange-500" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto p-2">
                  <div className="text-xs">{firstOtherName}</div>
                </HoverCardContent>
              </HoverCard>
            )}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onManageFiles(model.id as number, model.name)}
              className="h-6 w-6"
              title="Gestionar archivos"
            >
              <FileText className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEditModelStart(model)}
              className="h-6 w-6"
              title="Editar nombre"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDeleteModel(model.id as number, brandId)}
              className="h-6 w-6"
              title="Eliminar modelo"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SingleGlobalBrandColumn({
  brand,
  onDelete,
  onUpdate,
  onAddModel,
  onUpdateModel,
  onDeleteModel,
  onModelsOrderUpdate,
}: SingleGlobalBrandColumnProps) {
  const [models, setModels] = useState<SortableModel[]>(
    () =>
      (brand.models || []).map((m: Model, index: number) => ({
        ...m,
        id: m.id ?? `temp-${index}`,
      })), // Use real ID or temp
  );
  const [isEditingBrandName, setIsEditingBrandName] = useState(false);
  const [editedBrandName, setEditedBrandName] = useState(brand.name);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [editedModelName, setEditedModelName] = useState("");
  // Add state for file management modal
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedModelName, setSelectedModelName] = useState("");
  // TODO: Add pending states from parent if needed e.g. isModelActionPending

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: brand.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Dnd-kit sensors for model sorting
  const modelSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Allow clicks on buttons
    useSensor(KeyboardSensor),
  );

  // --- Brand Name Edit ---
  const handleBrandNameEditStart = () => {
    setEditedBrandName(brand.name);
    setIsEditingBrandName(true);
  };

  const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedBrandName(e.target.value);
  };

  const handleBrandNameSave = () => {
    if (editedBrandName.trim() && editedBrandName !== brand.name) {
      const formData = new FormData();
      formData.append("id", brand.id.toString());
      formData.append("name", editedBrandName.trim());
      onUpdate(formData); // Call parent action
    }
    setIsEditingBrandName(false);
  };

  const handleBrandNameCancel = () => {
    setIsEditingBrandName(false);
  };

  // --- Add Model ---
  const handleAddModelStart = () => {
    setNewModelName("");
    setIsAddingModel(true);
  };

  const handleNewModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewModelName(e.target.value);
  };

  const handleAddModelSave = () => {
    if (newModelName.trim()) {
      const formData = new FormData();
      formData.append("brandId", brand.id.toString());
      formData.append("name", newModelName.trim());
      onAddModel(formData); // Call parent action
    }
    setIsAddingModel(false);
  };

  const handleAddModelCancel = () => {
    setIsAddingModel(false);
  };

  // --- Edit Model ---
  const handleEditModelStart = (model: Model) => {
    setEditingModelId(model.id as number);
    setEditedModelName(model.name);
    setIsEditingModel(true);
  };

  const handleEditModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedModelName(e.target.value);
  };

  const handleEditModelSave = (formData: FormData) => {
    // The SortableModelItem prepares the formData
    onUpdateModel(formData); // Call parent action
    setIsEditingModel(false);
    setEditingModelId(null);
  };

  const handleEditModelCancel = () => {
    setIsEditingModel(false);
    setEditingModelId(null);
  };

  // --- Model Drag End ---
  const handleModelDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setModels((currentModels) => {
        const oldIndex = currentModels.findIndex((m) => m.id === active.id);
        const newIndex = currentModels.findIndex((m) => m.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentModels; // Should not happen

        const newlyOrderedModels = arrayMove(currentModels, oldIndex, newIndex);

        // Call parent action to update order in DB
        const orderPayload = newlyOrderedModels.map((m, index) => ({
          modelId: m.id as number, // Assuming ID is always number after creation
          order: index,
        }));
        onModelsOrderUpdate(brand.id, orderPayload);

        return newlyOrderedModels;
      });
    }
  };

  // Sync models state if the prop changes externally (e.g., after add/delete)
  React.useEffect(() => {
    setModels(
      (brand.models || []).map((m: Model, index: number) => ({
        ...m,
        id: m.id ?? `temp-${index}`,
      })),
    );
  }, [brand.models]);

  // Sync brand name state if the prop changes externally
  React.useEffect(() => {
    if (!isEditingBrandName) {
      setEditedBrandName(brand.name);
    }
  }, [brand.name, isEditingBrandName]);

  // --- Handle File Management Modal ---
  const handleManageFiles = (modelId: number, modelName: string) => {
    setSelectedModelId(modelId);
    setSelectedModelName(modelName);
    setIsFilesModalOpen(true);
  };

  const handleCloseFilesModal = () => {
    setIsFilesModalOpen(false);
  };

  const handleFilesUpdated = () => {
    // This would typically trigger a revalidation or refresh of the model data
    // For now it just closes the modal
    console.log("Files updated for model:", selectedModelId);
  };

  return (
    <>
      <div ref={setNodeRef} style={style} className="w-full mb-4" suppressHydrationWarning>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <span {...listeners} className="cursor-grab touch-none p-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </span>
              {isEditingBrandName ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={editedBrandName}
                    onChange={handleBrandNameChange}
                    className="h-8"
                    aria-label={`Nuevo nombre para ${brand.name}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleBrandNameSave}
                    className="h-8 w-8"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleBrandNameCancel}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{brand.name}</span>
                  <div className="flex items-center gap-1">
                    {brand.files?.hasPhoto && (
                      <div className="tooltip" data-tip="Tiene foto">
                        <Image className="h-4 w-4 text-blue-500" />
                      </div>
                    )}
                    {brand.files?.hasTechnicalSheet && (
                      <div className="tooltip" data-tip="Tiene ficha técnica">
                        <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {brand.files?.hasOtherFiles && (
                      <div className="tooltip" data-tip="Tiene otros archivos">
                        <MoreHorizontal className="h-4 w-4 text-orange-500" />
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleBrandNameEditStart}
                    className="h-6 w-6"
                    title="Editar nombre"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(brand.id)}
                    className="h-6 w-6"
                    title="Eliminar marca"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={handleAddModelStart} className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Agregar Modelo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Models List with DnD */}
              <DndContext
                sensors={modelSensors}
                collisionDetection={closestCorners}
                onDragEnd={handleModelDragEnd}
              >
                <SortableContext
                  items={models.map((model) => model.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {models.map((model) => (
                    <SortableModelItem
                      key={model.id}
                      model={model}
                      brandId={brand.id}
                      isEditingModel={isEditingModel}
                      editingModelId={editingModelId}
                      editedModelName={editedModelName}
                      onEditModelStart={handleEditModelStart}
                      onEditModelNameChange={handleEditModelNameChange}
                      onEditModelSave={handleEditModelSave}
                      onEditModelCancel={handleEditModelCancel}
                      onDeleteModel={onDeleteModel}
                      onManageFiles={handleManageFiles}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add Model Form */}
              {isAddingModel ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Input
                    type="text"
                    value={newModelName}
                    onChange={handleNewModelNameChange}
                    placeholder="Nombre del modelo"
                    className="h-8"
                    aria-label="Nombre del nuevo modelo"
                  />
                  <Button size="sm" onClick={handleAddModelSave} disabled={!newModelName.trim()}>
                    Añadir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleAddModelCancel}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleAddModelStart}
                >
                  <Plus className="h-4 w-4 mr-1" /> Añadir Modelo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files Management Modal */}
      {isFilesModalOpen && selectedModelId !== null && (
        <ModelFilesModal
          isOpen={isFilesModalOpen}
          onClose={handleCloseFilesModal}
          modelId={selectedModelId}
          modelName={selectedModelName}
          brandName={brand.name}
          onFilesUpdated={handleFilesUpdated}
        />
      )}
    </>
  );
}

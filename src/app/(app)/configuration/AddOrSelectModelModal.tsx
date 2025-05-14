"use client";

import UploadButton, { type UploadResult } from "@/components/custom/UploadCropperButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { type ModelData, useModelsStore } from "@/stores/models-store";
import {
  Check,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  PlusCircle,
  Search,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface AddOrSelectModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: number;
  brandName: string;
  onModelAdded: (model: ModelData) => void;
  onModelsAdded?: (models: ModelData[]) => void;
  existingModelIds?: number[]; // Array of model IDs that are already added
}

const AddOrSelectModelModal: React.FC<AddOrSelectModelModalProps> = ({
  isOpen,
  onClose,
  brandId,
  brandName,
  onModelAdded,
  onModelsAdded,
  existingModelIds = [],
}) => {
  const [activeTab, setActiveTab] = useState("existingModels");
  const [modelName, setModelName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [specSheet, setSpecSheet] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // Access models store
  const {
    models,
    loadingBrandIds,
    error: storeError,
    fetchModelsByBrandId,
    addModel,
  } = useModelsStore();

  // Memoize filtered models
  const filteredModels =
    models[brandId]?.filter((model) =>
      model.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const isLoading = loadingBrandIds.includes(brandId);

  // Load models when modal opens
  useEffect(() => {
    if (isOpen && brandId) {
      fetchModelsByBrandId(brandId);
    }
  }, [isOpen, brandId, fetchModelsByBrandId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setModelName("");
      setSearchTerm("");
      setError(null);
      setSelectedModelIds([]);
      setActiveTab("existingModels");
      setProductImage(null);
      setSpecSheet(null);
      setAdditionalFiles([]);
    }
  }, [isOpen]);

  const handleAddNewModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) {
      setError("El nombre del modelo no puede estar vacío.");
      return;
    }

    // Check if model name already exists in the list
    if (
      models[brandId]?.some((model) => model.name.toLowerCase() === modelName.trim().toLowerCase())
    ) {
      setError("Ya existe un modelo con este nombre.");
      return;
    }

    setIsPending(true);
    setError(null);

    // Create FormData to send files
    const formData = new FormData();
    formData.append("name", modelName.trim());
    formData.append("brandId", brandId.toString());

    if (productImage) {
      formData.append("productImage", productImage, productImage.name);
    }

    if (specSheet) {
      formData.append("specSheet", specSheet, specSheet.name);
    }

    additionalFiles.forEach((file, index) => {
      formData.append(`additionalFile${index}`, file, file.name);
    });

    // Modified to handle file uploads
    const result = await addModel(modelName.trim(), brandId, formData);

    setIsPending(false);

    if (result.success && result.model) {
      toast({
        title: "Modelo creado",
        description: `El modelo "${result.model.name}" ha sido añadido a ${brandName}`,
      });
      onModelAdded(result.model);
      onClose();
    } else {
      setError(result.error || "Error al crear el modelo");
    }
  };

  const handleToggleModelSelection = (modelId: number) => {
    // Don't allow toggling already existing models
    if (existingModelIds.includes(modelId)) {
      return;
    }

    setSelectedModelIds((prevSelectedIds) => {
      if (prevSelectedIds.includes(modelId)) {
        return prevSelectedIds.filter((id) => id !== modelId);
      }
      return [...prevSelectedIds, modelId];
    });
  };

  const handleConfirmSelection = () => {
    if (selectedModelIds.length === 0) return;

    if (selectedModelIds.length === 1) {
      // Single selection
      const selectedModel = models[brandId]?.find((model) => model.id === selectedModelIds[0]);
      if (selectedModel) {
        toast({
          title: "Modelo seleccionado",
          description: `Has seleccionado el modelo "${selectedModel.name}"`,
        });
        onModelAdded(selectedModel);
        onClose();
      }
    } else {
      // Multiple selection
      const selectedModels =
        models[brandId]?.filter((model) => selectedModelIds.includes(model.id)) || [];

      if (selectedModels.length > 0 && onModelsAdded) {
        toast({
          title: "Modelos seleccionados",
          description: `Has seleccionado ${selectedModels.length} modelos`,
        });
        onModelsAdded(selectedModels);
        onClose();
      } else if (selectedModels.length > 0) {
        // Fallback to add models one by one if onModelsAdded is not provided
        const firstModel = selectedModels[0];
        toast({
          title: "Modelo seleccionado",
          description: `Has seleccionado ${selectedModels.length} modelos, pero solo se añadirá "${firstModel.name}"`,
        });
        onModelAdded(firstModel);
        onClose();
      }
    }
  };

  const handleClearSelections = () => {
    setSelectedModelIds([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModelName(e.target.value);
    setError(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleProductImageUpload = ({ originalFile }: UploadResult) => {
    setProductImage(originalFile);
  };

  const handleSpecSheetUpload = ({ originalFile }: UploadResult) => {
    setSpecSheet(originalFile);
  };

  const handleAdditionalFileUpload = ({ originalFile }: UploadResult) => {
    setAdditionalFiles((prev) => [...prev, originalFile]);
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Count models that are not already added
  const availableModelsCount = filteredModels.filter(
    (model) => !existingModelIds.includes(model.id),
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Añadir Modelo a {brandName}</DialogTitle>
          <DialogDescription>
            Selecciona uno o varios modelos existentes o crea uno nuevo para esta marca.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existingModels">Modelos Existentes</TabsTrigger>
            <TabsTrigger value="newModel">Nuevo Modelo</TabsTrigger>
          </TabsList>

          <TabsContent value="existingModels">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar modelos..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {selectedModelIds.length > 0 && (
                <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-md">
                  <span className="text-sm">
                    {selectedModelIds.length} {selectedModelIds.length === 1 ? "modelo" : "modelos"}{" "}
                    seleccionados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelections}
                    className="h-8 px-2"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredModels.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {filteredModels.map((model) => {
                      const isAlreadyAdded = existingModelIds.includes(model.id);
                      return (
                        <div
                          key={model.id}
                          className={cn(
                            "flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-accent",
                            isAlreadyAdded && "opacity-50 cursor-not-allowed",
                            selectedModelIds.includes(model.id) && "bg-accent",
                          )}
                          onClick={() => !isAlreadyAdded && handleToggleModelSelection(model.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              !isAlreadyAdded && handleToggleModelSelection(model.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span>{model.name}</span>
                          <div className="flex items-center">
                            {isAlreadyAdded ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center text-sm text-muted-foreground">
                                      <Info className="h-4 w-4 mr-1" />
                                      Ya añadido
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Este modelo ya está incluido en la lista</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              selectedModelIds.includes(model.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {storeError ? (
                    <p>Error al cargar modelos: {storeError}</p>
                  ) : searchTerm ? (
                    <p>No se encontraron modelos con "{searchTerm}"</p>
                  ) : (
                    <p>No hay modelos disponibles para esta marca</p>
                  )}
                </div>
              )}

              {availableModelsCount === 0 && filteredModels.length > 0 && (
                <div className="text-center py-2 text-muted-foreground text-sm">
                  Todos los modelos disponibles ya están añadidos a la lista
                </div>
              )}

              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button onClick={handleConfirmSelection} disabled={selectedModelIds.length === 0}>
                  {selectedModelIds.length > 1
                    ? `Seleccionar ${selectedModelIds.length} Modelos`
                    : "Seleccionar Modelo"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>

          <TabsContent value="newModel">
            <form onSubmit={handleAddNewModel}>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="newModelName" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="newModelName"
                    name="modelName"
                    value={modelName}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                    disabled={isPending}
                    autoFocus
                    aria-label="Nombre del nuevo modelo"
                  />
                </div>

                {/* Product Image Upload */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Imagen
                  </Label>
                  <div className="col-span-3">
                    <UploadButton
                      placeholder="Subir imagen del producto"
                      onChange={handleProductImageUpload}
                      crop={true}
                    />
                    {productImage && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {productImage.name.length > 20
                            ? `${productImage.name.substring(0, 20)}...`
                            : productImage.name}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductImage(null)}
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spec Sheet Upload */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Ficha
                  </Label>
                  <div className="col-span-3">
                    <UploadButton
                      placeholder="Subir ficha técnica (PDF)"
                      onChange={handleSpecSheetUpload}
                      crop={false}
                      accept=".pdf"
                    />
                    {specSheet && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {specSheet.name.length > 20
                            ? `${specSheet.name.substring(0, 20)}...`
                            : specSheet.name}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSpecSheet(null)}
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Files */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right mt-2 flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Archivos
                  </Label>
                  <div className="col-span-3">
                    <UploadButton
                      placeholder="Añadir archivo adicional"
                      onChange={handleAdditionalFileUpload}
                      crop={false}
                    />

                    {additionalFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {additionalFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.lastModified}`}
                            className="flex items-center gap-2"
                          >
                            <Badge variant="outline" className="flex items-center gap-1">
                              {file.type.includes("image") ? (
                                <ImageIcon className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              {file.name.length > 20
                                ? `${file.name.substring(0, 20)}...`
                                : file.name}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAdditionalFile(additionalFiles.indexOf(file))}
                              className="h-6 w-6 p-0"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 col-span-4 text-center">{error}</p>}
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isPending}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending || !modelName.trim()}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>Crear Modelo</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export { AddOrSelectModelModal };

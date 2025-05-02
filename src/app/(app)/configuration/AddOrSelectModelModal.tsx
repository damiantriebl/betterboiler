"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Plus, Loader2, PlusCircle, Search, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModelsStore, type ModelData } from "@/stores/models-store";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AddOrSelectModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    brandId: number;
    brandName: string;
    onModelAdded: (model: ModelData) => void;
}

const AddOrSelectModelModal: React.FC<AddOrSelectModelModalProps> = ({
    isOpen,
    onClose,
    brandId,
    brandName,
    onModelAdded,
}) => {
    const [activeTab, setActiveTab] = useState("existingModels");
    const [modelName, setModelName] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
    const { toast } = useToast();

    // Access models store
    const {
        models,
        loadingBrandIds,
        error: storeError,
        fetchModelsByBrandId,
        addModel
    } = useModelsStore();

    // Memoize filtered models
    const filteredModels = models[brandId]?.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
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
            setSelectedModelId(null);
            setActiveTab("existingModels");
        }
    }, [isOpen]);

    const handleAddNewModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modelName.trim()) {
            setError("El nombre del modelo no puede estar vacío.");
            return;
        }

        setIsPending(true);
        setError(null);

        const result = await addModel(modelName.trim(), brandId);

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

    const handleSelectModel = (modelId: number) => {
        setSelectedModelId(modelId);
    };

    const handleConfirmSelection = () => {
        if (selectedModelId) {
            const selectedModel = models[brandId]?.find(model => model.id === selectedModelId);
            if (selectedModel) {
                toast({
                    title: "Modelo seleccionado",
                    description: `Has seleccionado el modelo "${selectedModel.name}"`,
                });
                onModelAdded(selectedModel);
                onClose();
            }
        }
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

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Añadir Modelo a {brandName}</DialogTitle>
                    <DialogDescription>
                        Selecciona un modelo existente o crea uno nuevo para esta marca.
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

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredModels.length > 0 ? (
                                <ScrollArea className="h-[200px]">
                                    <div className="space-y-1">
                                        {filteredModels.map((model) => (
                                            <div
                                                key={model.id}
                                                className={cn(
                                                    "flex items-center justify-between rounded-md px-3 py-2 cursor-pointer",
                                                    selectedModelId === model.id
                                                        ? "bg-primary/10"
                                                        : "hover:bg-muted"
                                                )}
                                                onClick={() => handleSelectModel(model.id)}
                                            >
                                                <span>{model.name}</span>
                                                {selectedModelId === model.id && (
                                                    <Check className="h-4 w-4 text-primary" />
                                                )}
                                            </div>
                                        ))}
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

                            <DialogFooter className="mt-4">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button
                                    onClick={handleConfirmSelection}
                                    disabled={selectedModelId === null}
                                >
                                    Seleccionar Modelo
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
                                {error && (
                                    <p className="text-sm text-red-500 col-span-4 text-center">{error}</p>
                                )}
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
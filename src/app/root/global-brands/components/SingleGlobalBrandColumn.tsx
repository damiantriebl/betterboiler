"use client";

import React, { useState, useTransition } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GripVertical, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
// Assuming types are defined elsewhere, potentially placeholders for now

// Placeholder types - replace with actual imports when available
type Brand = { id: number; name: string; order?: number; models?: Model[] };
type Model = { id: number; name: string; brandId: number; order?: number };

// Placeholder type for model items used in DND context
type SortableModel = Model & { id: string | number }; // Ensure id is string or number for dnd-kit


interface SingleGlobalBrandColumnProps {
    brand: Brand & { models?: Model[] };
    onDelete: (brandId: number) => void;
    onUpdate: (formData: FormData) => void; // Expecting FormData for name update
    onAddModel: (formData: FormData) => void; // Expecting FormData for new model
    onUpdateModel: (formData: FormData) => void; // Expecting FormData for model update
    onDeleteModel: (modelId: number, brandId: number) => void;
    onModelsOrderUpdate: (brandId: number, orderedModels: { modelId: number; order: number }[]) => void;
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
}: SortableModelItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: model.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSave = () => {
        const formData = new FormData();
        formData.append('id', model.id.toString());
        formData.append('name', editedModelName);
        formData.append('brandId', brandId.toString());
        onEditModelSave(formData);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center justify-between p-2 mb-1 bg-background border rounded"
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
                    <span className="text-sm">{model.name}</span>
                    <Button size="icon" variant="ghost" onClick={() => onEditModelStart(model)} className="h-6 w-6 ml-auto">
                        <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDeleteModel(model.id as number, brandId)} className="h-6 w-6">
                        <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
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
    const [models, setModels] = useState<SortableModel[]>(() =>
        (brand.models || []).map((m: Model, index: number) => ({ ...m, id: m.id ?? `temp-${index}` })) // Use real ID or temp
    );
    const [isEditingBrandName, setIsEditingBrandName] = useState(false);
    const [editedBrandName, setEditedBrandName] = useState(brand.name);
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [newModelName, setNewModelName] = useState('');
    const [isEditingModel, setIsEditingModel] = useState(false);
    const [editingModelId, setEditingModelId] = useState<number | null>(null);
    const [editedModelName, setEditedModelName] = useState('');
    // TODO: Add pending states from parent if needed e.g. isModelActionPending

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: brand.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Dnd-kit sensors for model sorting
    const modelSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Allow clicks on buttons
        useSensor(KeyboardSensor)
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
            formData.append('id', brand.id.toString());
            formData.append('name', editedBrandName.trim());
            onUpdate(formData); // Call parent action
        }
        setIsEditingBrandName(false);
    };

    const handleBrandNameCancel = () => {
        setIsEditingBrandName(false);
    };

    // --- Add Model ---
    const handleAddModelStart = () => {
        setNewModelName('');
        setIsAddingModel(true);
    };

    const handleNewModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewModelName(e.target.value);
    };

    const handleAddModelSave = () => {
        if (newModelName.trim()) {
            const formData = new FormData();
            formData.append('brandId', brand.id.toString());
            formData.append('name', newModelName.trim());
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
        setModels((brand.models || []).map((m: Model, index: number) => ({ ...m, id: m.id ?? `temp-${index}` })));
    }, [brand.models]);

    // Sync brand name state if the prop changes externally
    React.useEffect(() => {
        if (!isEditingBrandName) {
            setEditedBrandName(brand.name);
        }
    }, [brand.name, isEditingBrandName]);

    return (
        <Card ref={setNodeRef} style={style} className="mb-4 touch-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/50 p-4 border-b">
                <div className="flex items-center gap-2 flex-grow">
                    <span {...attributes} {...listeners} className="cursor-grab p-1 -ml-1">
                        <GripVertical />
                    </span>
                    {isEditingBrandName ? (
                        <div className="flex items-center gap-1 flex-grow">
                            <Input
                                type="text"
                                value={editedBrandName}
                                onChange={handleBrandNameChange}
                                className="h-8 flex-grow"
                                aria-label={`Nuevo nombre para ${brand.name}`}
                            />
                            <Button size="icon" variant="ghost" onClick={handleBrandNameSave} className="h-8 w-8"> <Save className="h-4 w-4" /> </Button>
                            <Button size="icon" variant="ghost" onClick={handleBrandNameCancel} className="h-8 w-8"> <X className="h-4 w-4" /> </Button>
                        </div>
                    ) : (
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            {brand.name}
                            <Button size="icon" variant="ghost" onClick={handleBrandNameEditStart} className="h-6 w-6"> <Pencil className="h-3 w-3" /> </Button>
                        </CardTitle>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(brand.id)}
                    aria-label={`Eliminar marca ${brand.name}`}
                    className="text-red-500 hover:text-red-700"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Modelos</h4>
                <DndContext
                    sensors={modelSensors}
                    collisionDetection={closestCorners}
                    onDragEnd={handleModelDragEnd}
                >
                    <SortableContext items={models.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1 mb-4 max-h-60 overflow-y-auto pr-2">
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
                                />
                            ))}
                            {models.length === 0 && !isAddingModel && (
                                <p className="text-xs text-muted-foreground text-center py-2">No hay modelos.</p>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>

                {isAddingModel ? (
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            type="text"
                            placeholder="Nombre del nuevo modelo"
                            value={newModelName}
                            onChange={handleNewModelNameChange}
                            className="h-8 flex-grow"
                            aria-label="Nombre del nuevo modelo"
                        />
                        <Button size="icon" variant="ghost" onClick={handleAddModelSave} className="h-8 w-8"> <Save className="h-4 w-4" /> </Button>
                        <Button size="icon" variant="ghost" onClick={handleAddModelCancel} className="h-8 w-8"> <X className="h-4 w-4" /> </Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={handleAddModelStart} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Añadir Modelo
                    </Button>
                )}
            </CardContent>
        </Card>
    );
} 
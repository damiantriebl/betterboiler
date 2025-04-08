"use client";

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    KeyboardSensor,
    closestCorners,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import BrandContainer from './BrandContainer';
import ModelItem from './ModelItem';
import AddModelItem from './AddModelItem';
import { Check, X as CancelIcon, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';

interface SingleBrandColumnProps {
    brandId: string;
    initialModels: string[];
    onBrandDelete?: (brandId: string) => void;
    onBrandRename?: (oldBrandId: string, newBrandId: string) => void;
    initialColor?: string;
    onBrandColorChange?: (brandId: string, newColor: string) => void;
}

export default function SingleBrandColumn({
    brandId: initialBrandId,
    initialModels,
    onBrandDelete,
    onBrandRename,
    initialColor = '#ffffff',
    onBrandColorChange,
}: SingleBrandColumnProps) {
    const [models, setModels] = useState<string[]>(initialModels);
    const [brandId, setBrandId] = useState(initialBrandId);
    const [brandColor, setBrandColor] = useState(initialColor);
    const [tempBrandColor, setTempBrandColor] = useState(brandColor);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setModels((currentModels) => {
                const oldIndex = currentModels.findIndex((item) => item === active.id);
                const newIndex = currentModels.findIndex((item) => item === over.id);

                if (oldIndex === -1 || newIndex === -1) {
                    return currentModels; // No debería pasar si ambos IDs son modelos válidos
                }

                const reorderedModels = arrayMove(currentModels, oldIndex, newIndex);
                // Si tuvieras la prop onModelsChange, la llamarías aquí:
                // onModelsChange?.(brandId, reorderedModels);
                return reorderedModels;
            });
        }
    };

    const handleAddModel = (newModelName: string) => {
        if (!models.some(m => m.toLowerCase() === newModelName.toLowerCase())) {
            setModels(prevModels => [newModelName, ...prevModels]);
            console.log(`Modelo "${newModelName}" añadido a ${brandId}`);
            // Si tuvieras la prop onModelsChange, la llamarías aquí:
            // onModelsChange?.(brandId, [newModelName, ...prevModels]);
        } else {
            console.warn(`El modelo "${newModelName}" ya existe en ${brandId}.`);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm(`¿Estás seguro de que quieres eliminar la marca "${id}" y todos sus modelos?`)) {
            console.log(`Eliminando marca: ${id}`);
            onBrandDelete?.(id);
            toast({ title: "Marca eliminada", description: `La marca "${id}" ha sido eliminada.` });
        }
    };

    const handleEdit = (id: string) => {
        const oldBrandName = id.charAt(0).toUpperCase() + id.slice(1);
        const newBrandName = prompt(`Ingresa el nuevo nombre para la marca "${oldBrandName}":`, oldBrandName);

        if (newBrandName && newBrandName.trim() && newBrandName.trim() !== oldBrandName) {
            const newBrandKey = newBrandName.trim().toLowerCase().replace(/\s+/g, '-');
            console.log(`Renombrando marca: ${id} a ${newBrandName} (clave: ${newBrandKey}`);
            setBrandId(newBrandKey);
            onBrandRename?.(id, newBrandKey);

            toast({ title: "Marca renombrada", description: `"${oldBrandName}" ahora es "${newBrandName}".` });
        }
    };

    useEffect(() => {
        if (isColorPickerOpen) {
            setTempBrandColor(brandColor);
        }
    }, [isColorPickerOpen, brandColor]);

    const handleApplyColor = () => {
        setBrandColor(tempBrandColor);
        onBrandColorChange?.(brandId, tempBrandColor);
        console.log(`Color de ${brandId} APLICADO a ${tempBrandColor}`);
        toast({ title: "Color actualizado", description: `Color de "${brandId}" cambiado a ${tempBrandColor}.` });
        setIsColorPickerOpen(false);
    };

    const handleCancelColor = () => {
        setTempBrandColor(brandColor);
        setIsColorPickerOpen(false);
    };

    return (
        <div className={cn("relative")}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <BrandContainer
                    id={brandId}
                    models={models}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    brandColor={brandColor}
                    renderColorButton={() => (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Editar color de ${brandId}`}>
                                                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: brandColor }}></span>
                                            </Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <PopoverContent className="w-auto p-2 space-y-2" align="end">
                                        <HexColorPicker color={tempBrandColor} onChange={setTempBrandColor} />
                                        <div className='flex justify-end gap-2'>
                                            <Button variant="ghost" size="icon" onClick={handleCancelColor} className='h-7 w-7'>
                                                <CancelIcon className='h-4 w-4' />
                                            </Button>
                                            <Button variant="default" size="icon" onClick={handleApplyColor} className='h-7 w-7'>
                                                <Check className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <TooltipContent>
                                    <p>Cambiar color de la marca</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                >
                    <AddModelItem onAdd={handleAddModel} />
                    <SortableContext items={models}>
                        {models.map((model) => (
                            <ModelItem
                                key={model}
                                id={model}
                                brandColor={brandColor}
                            />
                        ))}
                    </SortableContext>
                </BrandContainer>
            </DndContext>
        </div>
    );
} 
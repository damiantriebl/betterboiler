"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Check, X as CancelIcon, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type DisplayModelData } from './page';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Props sin attributes, listeners, style ---
export interface ModelItemProps {
    model: DisplayModelData;
    onUpdate: (id: number, newName: string) => void;
    onSetInvisible: (id: number) => void;
}

export default function ModelItem({
    model,
    onUpdate,
    onSetInvisible,
}: ModelItemProps) {
    const { id: modelId, name: initialName } = model;
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: modelId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) {
            setEditingName(initialName);
        }
    }, [initialName, isEditing]);

    const handleEditClick = () => {
        setEditingName(initialName);
        setIsEditing(true);
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(event.target.value);
    };

    const submitUpdate = () => {
        const trimmedName = editingName.trim();
        if (trimmedName && trimmedName !== initialName) {
            onUpdate(modelId, trimmedName);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') submitUpdate();
        if (event.key === 'Escape') {
            setIsEditing(false);
            setEditingName(initialName);
        }
    };

    const handleBlur = () => setTimeout(submitUpdate, 100);

    const handleSetInvisibleClick = () => {
        if (isEditing) return;
        onSetInvisible(modelId);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center justify-between p-2 bg-background rounded-md border mb-1 group",
                isDragging ? "shadow-lg opacity-50" : "shadow-sm"
            )}
        >
            <div className="flex items-center gap-2 flex-grow min-w-0">
                <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-4 w-4" />
                </button>

                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={editingName}
                        onChange={handleNameChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        className="h-7 text-sm flex-grow"
                    />
                ) : (
                    <span
                        className="text-sm truncate cursor-pointer hover:text-primary/80"
                        onClick={handleEditClick}
                        title={`Editar: ${initialName}`}
                    >
                        {initialName}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {!isEditing ? (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditClick} aria-label="Editar modelo">
                        <Edit className="h-3 w-3" />
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setIsEditing(false); setEditingName(initialName); }} aria-label="Cancelar edición">
                        <CancelIcon className="h-3 w-3 text-muted-foreground" />
                    </Button>
                )}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleSetInvisibleClick} disabled={isEditing}>
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Ocultar Modelo</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}

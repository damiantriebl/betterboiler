"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Edit, Check, X as CancelIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DisplayModelData } from "./Interfaces";

// --- Props sin attributes, listeners, style ---
export interface ModelItemProps {
  model: DisplayModelData;
  onUpdate: (id: number, newName: string) => void;
  onSetInvisible?: (id: number) => void;
  isOverlay?: boolean;
  style?: React.CSSProperties;
  onDissociate: (id: number) => void;
}

export default function ModelItem({
  model,
  onUpdate,
  onSetInvisible,
  isOverlay = false,
  style: externalStyle,
  onDissociate,
}: ModelItemProps) {
  const { id: modelId, name: initialName } = model;
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: modelId.toString(),
    disabled: isOverlay,
  });

  const style = isOverlay
    ? externalStyle
    : {
      ...externalStyle,
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : "auto",
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
    if (event.key === "Enter") submitUpdate();
    if (event.key === "Escape") {
      setIsEditing(false);
      setEditingName(initialName);
    }
  };

  const handleBlur = () => setTimeout(submitUpdate, 100);

  const handleDissociateClick = () => {
    if (isEditing) return;
    onDissociate(modelId);
  };

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 rounded hover:bg-muted/50 group border-b border-border",
        isOverlay && "shadow-lg bg-background z-50 cursor-grabbing",
        isDragging && !isOverlay && "opacity-50",
      )}
      {...(!isOverlay ? attributes : {})}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "cursor-grab p-1 text-muted-foreground hover:text-foreground",
            isOverlay && "cursor-grabbing",
          )}
          {...(!isOverlay ? listeners : {})}
          aria-label="Mover modelo"
          disabled={isOverlay}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        {isEditing ? (
          <Input
            ref={inputRef}
            value={editingName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="h-7 text-sm flex-grow"
            autoFocus
            disabled={isOverlay}
          />
        ) : (
          <Button
            variant="link"
            className="text-sm truncate cursor-pointer hover:text-primary/80 focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 h-auto py-0"
            onClick={handleEditClick}
            title={`Editar: ${initialName}`}
            type="button"
          >
            {initialName}
          </Button>
        )}
      </div>

      {!isOverlay && (
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {!isEditing ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar Nombre</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={handleDissociateClick}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desasociar Modelo</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-green-600 hover:text-green-700"
                    onClick={submitUpdate}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Guardar Cambios</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={handleDissociateClick}
                  >
                    <CancelIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancelar Edición</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}
    </div>
  );
}

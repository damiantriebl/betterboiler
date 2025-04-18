"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SucursalItemProps {
  id: number;
  name: string;
  onEdit: (id: number, newName: string) => void;
  onDelete: (id: number) => void;
  isUpdating?: boolean;
}

export default function SucursalItem({
  id,
  name,
  onEdit,
  onDelete,
  isUpdating,
}: SucursalItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditingName(name);
    }
  }, [name, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleEditClick = () => {
    if (isUpdating) return;
    setIsEditing(true);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(event.target.value);
  };

  const submitNameChange = () => {
    const trimmedNewName = editingName.trim();
    if (trimmedNewName && trimmedNewName !== name) {
      onEdit(id, trimmedNewName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      submitNameChange();
    } else if (event.key === "Escape") {
      setIsEditing(false);
      setEditingName(name);
    }
  };

  const handleBlur = () => {
    submitNameChange();
  };

  const handleDeleteClick = () => {
    if (isUpdating) return;
    onDelete(id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging ? "shadow-lg" : "shadow-sm")}
    >
      <CardHeader className="p-3 flex flex-row items-center justify-between space-x-2">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editingName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="h-8 text-base font-medium flex-grow mr-2"
          />
        ) : (
          <CardTitle
            className="text-base font-medium truncate flex-grow cursor-pointer hover:text-primary/80"
            onClick={handleEditClick}
          >
            {name}
          </CardTitle>
        )}

        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEditClick}
            aria-label={`Editar sucursal ${name}`}
            disabled={isUpdating || isEditing}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`Eliminar sucursal ${name}`}
            disabled={isUpdating || isEditing}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 text-muted-foreground hover:text-foreground focus:outline-none"
            aria-label={`Mover sucursal ${name}`}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>
    </Card>
  );
}

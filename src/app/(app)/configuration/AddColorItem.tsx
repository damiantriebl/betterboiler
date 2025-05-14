"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ColorConfig } from "@/types/ColorType";
import { Loader2, Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface AddColorItemProps {
  onAdd: (newColor: Omit<ColorConfig, "id" | "dbId">) => void;
  className?: string;
  isAdding?: boolean;
}

export default function AddColorItem({ onAdd, className, isAdding = false }: AddColorItemProps) {
  const [newColorName, setNewColorName] = useState("");

  const handleAddClick = () => {
    if (isAdding) return;
    const trimmedName = newColorName.trim();
    if (trimmedName) {
      const newColorData: Omit<ColorConfig, "id" | "dbId"> = {
        name: trimmedName,
        type: "SOLIDO",
        colorOne: "#FFFFFF",
      };
      onAdd(newColorData);
      setNewColorName("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddClick();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center space-x-2 p-3 border rounded-md shadow-sm bg-card",
        className,
      )}
    >
      <Input
        type="text"
        value={newColorName}
        onChange={(e) => setNewColorName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre del nuevo color..."
        className="h-9 flex-grow"
        aria-label="Nombre del nuevo color"
        disabled={isAdding}
      />
      <Button
        onClick={handleAddClick}
        size="sm"
        className="h-9"
        aria-label="Añadir nuevo color"
        disabled={isAdding || !newColorName.trim()}
      >
        {isAdding ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-1" />
        )}
        {isAdding ? "Añadiendo..." : "Añadir Color"}
      </Button>
    </div>
  );
}

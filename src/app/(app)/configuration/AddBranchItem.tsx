"use client";

import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card"; // Usar CardHeader para consistencia
import { Plus, Check, X as CancelIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddBranchItemProps {
  onAdd: (branchName: string) => void;
  className?: string;
  isAdding?: boolean;
}

export default function AddBranchItem({
  onAdd,
  className,
  isAdding: isActionPending,
}: AddBranchItemProps) {
  const [sucursalName, setSucursalName] = useState("");
  const [isEditingMode, setIsEditingMode] = useState(false);

  const handleAddClick = () => {
    const trimmedName = sucursalName.trim();
    if (trimmedName) {
      onAdd(trimmedName);
      setSucursalName("");
      setIsEditingMode(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSucursalName(event.target.value);
  };

  const handleEnterEditingMode = () => {
    setIsEditingMode(true);
  };

  const handleCancel = () => {
    setSucursalName("");
    setIsEditingMode(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (!isActionPending) {
        handleAddClick();
      }
    } else if (event.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <Card className={cn("relative border-dashed bg-muted/40", className)}>
      <CardHeader className="p-3 flex flex-row items-center space-x-2">
        {!isEditingMode ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleEnterEditingMode}
            disabled={isActionPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Sucursal
          </Button>
        ) : (
          <>
            <Input
              autoFocus
              type="text"
              placeholder="Nombre sucursal (Ciudad - Localidad)"
              value={sucursalName}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="h-8 flex-grow"
              disabled={isActionPending}
            />
            <Button
              variant="default"
              size="icon"
              onClick={handleAddClick}
              disabled={!sucursalName.trim() || isActionPending}
              className="h-7 w-7"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={isActionPending}
              className="h-7 w-7"
            >
              <CancelIcon className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardHeader>
    </Card>
  );
}

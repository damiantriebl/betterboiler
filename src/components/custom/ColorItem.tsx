"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful"; // Asegúrate de que la importación sea correcta

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Importar Popover
import { cn } from "@/lib/utils";
import type { ColorConfig, ColorType } from "@/types/ColorType";
import {
  X as CancelIcon,
  Check,
  Clock,
  Copy,
  Edit,
  GripVertical,
  Loader2,
  Palette,
  Replace,
  Trash2,
} from "lucide-react"; // Añadir iconos y Clock

interface ColorItemProps {
  colorConfig: ColorConfig;
  onUpdate?: (updatedConfig: ColorConfig) => void;
  onDelete?: (id: string) => void;
  displayMode?: boolean;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  nameClassName?: string;
  attributes?: ReturnType<typeof useSortable>["attributes"];
  listeners?: ReturnType<typeof useSortable>["listeners"];
  setNodeRef?: ReturnType<typeof useSortable>["setNodeRef"];
  style?: React.CSSProperties;
  isDragging?: boolean;
  isUpdatingThisItem?: boolean;
  isDeletingThisItem?: boolean;
  isPending?: boolean;
}

export default function ColorItem({
  colorConfig,
  onUpdate,
  onDelete,
  displayMode = false,
  size = "sm",
  showName = true,
  nameClassName,
  attributes,
  listeners,
  setNodeRef,
  style,
  isDragging,
  isUpdatingThisItem = false,
  isDeletingThisItem = false,
  isPending = false,
}: ColorItemProps) {
  const sortable = !displayMode ? useSortable({ id: colorConfig.id }) : null;
  const finalAttributes = attributes ?? sortable?.attributes;
  const finalListeners = listeners ?? sortable?.listeners;
  const finalSetNodeRef = setNodeRef ?? sortable?.setNodeRef;
  const itemIsBusy = isUpdatingThisItem || isDeletingThisItem || isPending;
  const finalStyle =
    style ??
    (sortable
      ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging || itemIsBusy ? 0.6 : 1,
        zIndex: sortable.isDragging ? 10 : undefined,
        pointerEvents: itemIsBusy ? "none" : undefined,
      }
      : {});
  const finalIsDragging = isDragging ?? sortable?.isDragging ?? false;

  const { id, name, type, colorOne, colorTwo } = colorConfig;

  // --- Estados (Solo necesarios si no es displayMode) ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPopover1Open, setIsPopover1Open] = useState(false);
  const [isPopover2Open, setIsPopover2Open] = useState(false);
  const [tempColor1, setTempColor1] = useState(colorOne);
  const [tempColor2, setTempColor2] = useState(colorTwo ?? "");

  // Sincronizar nombre si cambia externamente
  useEffect(() => {
    if (!isEditingName) {
      setEditingName(name);
    }
  }, [name, isEditingName]);

  // Enfocar input al editar nombre
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Sincronizar colores temporales cuando se abre el Popover correspondiente
  useEffect(() => {
    if (isPopover1Open) setTempColor1(colorOne);
  }, [isPopover1Open, colorOne]);

  useEffect(() => {
    // Solo sincronizar colorTwo si el tipo lo requiere y el popover está abierto
    if (isPopover2Open && (type === "BITONO" || type === "PATRON")) {
      setTempColor2(colorTwo ?? "#FFFFFF"); // Poner un default si es null/undefined
    }
  }, [isPopover2Open, colorTwo, type]);

  // --- Handlers para el Nombre ---
  const handleNameEditClick = () => {
    if (itemIsBusy) return;
    setIsEditingName(true);
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditingName(e.target.value);
  const submitNameChange = () => {
    const trimmedNewName = editingName.trim();
    if (trimmedNewName && trimmedNewName !== name) {
      if (onUpdate && !itemIsBusy) {
        onUpdate({ ...colorConfig, name: trimmedNewName });
      }
    }
    setIsEditingName(false);
  };
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (itemIsBusy) return;
    if (e.key === "Enter") submitNameChange();
    else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditingName(name); // Revertir
    }
  };
  const handleNameBlur = () => {
    if (itemIsBusy) return;
    submitNameChange();
  };

  // --- Handlers para Colores (Modificados) ---
  // Ahora solo actualizan el estado temporal
  const handleTempColor1Change = setTempColor1;
  const handleTempColor2Change = setTempColor2;

  // Función para guardar los cambios de color (llamada desde el botón OK)
  const handleApplyColorChanges = (popoverToClose: "popover1" | "popover2") => {
    if (itemIsBusy) return;
    // Crear el objeto actualizado basado en los temp
    const updatedData = {
      ...colorConfig,
      colorOne: tempColor1,
      // Incluir colorTwo solo si el tipo lo requiere
      colorTwo: type === "BITONO" || type === "PATRON" ? tempColor2 : undefined,
    };
    // Validar que colorTwo no esté vacío si es requerido (extra check)
    if ((type === "BITONO" || type === "PATRON") && !tempColor2) {
      alert("Color Two no puede estar vacío para este tipo.");
      return;
    }

    if (onUpdate && !itemIsBusy) {
      onUpdate(updatedData);
    }

    // Cerrar el popover correspondiente
    if (popoverToClose === "popover1") setIsPopover1Open(false);
    if (popoverToClose === "popover2") setIsPopover2Open(false);
  };

  // Función para cancelar (cierra popover sin guardar)
  const handleCancelColorChange = (popoverToClose: "popover1" | "popover2") => {
    if (popoverToClose === "popover1") setIsPopover1Open(false);
    if (popoverToClose === "popover2") setIsPopover2Open(false);
    // No es necesario resetear temp, useEffect lo hará al reabrir
  };

  // --- Handler para Tipo (con defaults mejorados y corrección de tipo) ---
  const handleTypeChange = (newType: ColorType) => {
    if (itemIsBusy) return;

    // Crear un objeto basado en el estado actual
    const updatedConfigData: ColorConfig = { ...colorConfig, type: newType };

    switch (newType) {
      case "SOLIDO":
        // Para SOLIDO, asegurar que colorTwo sea undefined
        updatedConfigData.colorTwo = undefined;
        break;
      case "BITONO":
        // Para BITONO, siempre poner Blanco / Negro por defecto
        updatedConfigData.colorOne = "#FFFFFF";
        updatedConfigData.colorTwo = "#000000";
        break;
      case "PATRON":
        // Para PATRON, siempre poner Blanco (fondo) / Negro (líneas) por defecto
        updatedConfigData.colorOne = "#FFFFFF";
        updatedConfigData.colorTwo = "#000000";
        break;
    }

    // Llamar a onUpdate con el objeto completo
    if (onUpdate && !itemIsBusy) {
      onUpdate(updatedConfigData);
    }
  };

  // --- Función reutilizable para renderizar el círculo ---
  const renderColorCircle = (currentSize: "sm" | "md" | "lg") => {
    const sizeClasses = {
      sm: "w-6 h-6", // Tamaño original del ColorItem interactivo
      md: "w-8 h-8",
      lg: "w-10 h-10",
    };
    const baseClasses = "rounded-full border border-gray-300 shrink-0";
    const finalClassName = cn(baseClasses, sizeClasses[currentSize]);
    switch (type) {
      case "SOLIDO":
        return (
          <div className={finalClassName} style={{ backgroundColor: colorOne }} title={name} />
        );
      case "BITONO":
        return (
          <div
            className={finalClassName}
            style={{
              backgroundImage: `linear-gradient(to right, ${colorOne} 50%, ${colorTwo ?? "#FFFFFF"} 50%)`,
            }}
            title={`${name} (Bitono)`}
          />
        );
      case "PATRON":
        return (
          <div
            className={cn(finalClassName, "pattern-diagonal-lines")}
            style={
              {
                "--pattern-bg-color": colorOne,
                "--pattern-fg-color": colorTwo ?? "#000000",
              } as React.CSSProperties
            }
            title={`${name} (Patrón)`}
          />
        );
      default:
        return <div className={cn(finalClassName, "bg-gray-200")} title="Color desconocido" />; // Fallback
    }
  };

  // --- Renderizado Condicional ---
  if (displayMode) {
    // Renderizado simple (como ColorDisplay)
    return (
      <span className={cn("inline-flex items-center gap-2", nameClassName)}>
        {" "}
        {/* Usar nameClassName en el span wrapper? O ajustar */}
        {renderColorCircle(size)}
        {showName && <span className={cn("truncate", nameClassName)}>{name}</span>}
      </span>
    );
  }

  // Renderizado interactivo (Card con D&D, edición, etc.)
  return (
    <Card
      ref={finalSetNodeRef}
      style={finalStyle}
      className={cn(
        "relative group transition-opacity",
        finalIsDragging ? "shadow-lg" : "shadow-sm",
        itemIsBusy ? "cursor-not-allowed" : "",
      )}
    >
      {isUpdatingThisItem || isDeletingThisItem ? (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isPending ? (
        <div
          className="absolute top-1 right-1 z-10 text-muted-foreground"
          title="Pendiente de confirmación"
        >
          <Clock className="h-3 w-3" />
        </div>
      ) : null}
      <CardHeader className="p-3 flex flex-row items-center justify-between space-x-3">
        <div className="flex items-center space-x-1">
          <Popover
            open={isPopover1Open}
            onOpenChange={(open) => !itemIsBusy && setIsPopover1Open(open)}
          >
            <PopoverTrigger asChild disabled={itemIsBusy}>
              <button
                type="button"
                className="p-0 border-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renderColorCircle("sm")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 space-y-2" align="start">
              <HexColorPicker color={tempColor1} onChange={handleTempColor1Change} />
              <Input
                type="text"
                value={tempColor1}
                onChange={(e) => handleTempColor1Change(e.target.value)}
                className="h-8 text-xs"
                placeholder="#RRGGBB"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancelColorChange("popover1")}
                  className="h-7 w-7"
                >
                  <CancelIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => handleApplyColorChanges("popover1")}
                  className="h-7 w-7"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {(type === "BITONO" || type === "PATRON") && (
            <Popover
              open={isPopover2Open}
              onOpenChange={(open) => !itemIsBusy && setIsPopover2Open(open)}
            >
              <PopoverTrigger asChild disabled={itemIsBusy}>
                <div
                  className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colorTwo ?? "#FFFFFF" }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 space-y-2" align="start">
                <HexColorPicker color={tempColor2} onChange={handleTempColor2Change} />
                <Input
                  type="text"
                  value={tempColor2}
                  onChange={(e) => handleTempColor2Change(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="#RRGGBB"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancelColorChange("popover2")}
                    className="h-7 w-7"
                  >
                    <CancelIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => handleApplyColorChanges("popover2")}
                    className="h-7 w-7"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex-grow min-w-0 mr-auto">
          {isEditingName ? (
            <Input
              ref={inputRef}
              value={editingName}
              onChange={handleNameChange}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameBlur}
              className="h-7 text-sm px-1 w-full"
              placeholder="Nombre del color"
              disabled={itemIsBusy}
            />
          ) : (
            <div className="flex items-center">
              <span
                className={cn(
                  "cursor-pointer hover:text-primary hover:underline truncate",
                  nameClassName,
                  itemIsBusy && "cursor-not-allowed text-muted-foreground",
                )}
                onClick={handleNameEditClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleNameEditClick();
                  }
                }}
                role="button"
                tabIndex={itemIsBusy ? -1 : 0}
              >
                {name}
              </span>
            </div>
          )}
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as ColorType)}
            className="text-xs text-muted-foreground mt-0.5 bg-transparent border-none p-0 focus:ring-0 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={itemIsBusy || !onUpdate}
            aria-label="Tipo de color"
          >
            <option value="SOLIDO">Sólido</option>
            <option value="BITONO">Bitono</option>
            <option value="PATRON">Patrón</option>
          </select>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            onClick={() => onDelete?.(id)}
            disabled={itemIsBusy || !onDelete}
            aria-label={`Eliminar color ${name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            {...finalAttributes}
            {...finalListeners}
            className="cursor-grab h-8 w-8 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={itemIsBusy}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

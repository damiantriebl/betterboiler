"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Asegúrate que la ruta a types.ts sea correcta
import { Badge } from "@/components/ui/badge"; // <-- Importar Badge
import { ColorConfig } from "@/types/ColorType";
// Importar ColorItem
import ColorItem from "./ColorItem";

interface ColorSelectorProps {
  colors: ColorConfig[];
  selectedColorId?: number | null; // Espera el dbId numérico
  onSelect: (colorDbId: number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  className?: string;
}

export function ColorSelector({
  colors,
  selectedColorId,
  onSelect,
  placeholder = "Selecciona un color...",
  searchPlaceholder = "Busca color...",
  notFoundMessage = "No se encontró el color.",
  className,
}: ColorSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedColor = React.useMemo(() => {
    return colors.find((c) => c.dbId === selectedColorId);
  }, [selectedColorId, colors]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-10", className)}
        >
          <span className="flex items-center gap-2 flex-grow min-w-0">
            {selectedColor ? (
              <>
                <ColorItem
                  colorConfig={selectedColor}
                  size="sm"
                  displayMode={true}
                  showName={false}
                />
                <span className="truncate">{selectedColor.name}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex items-center ml-auto pl-2">
            {selectedColor &&
              (selectedColor.type === "BITONO" || selectedColor.type === "PATRON") && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {selectedColor.type === "BITONO" ? "Bitono" : "Patrón"}
                </Badge>
              )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command
          filter={(value, search) => {
            const color = colors.find((c) => c.dbId?.toString() === value);
            if (color?.name?.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
            <CommandGroup>
              {colors.map((color) => (
                <CommandItem
                  key={color.dbId ?? color.id}
                  value={color.dbId?.toString() ?? ""}
                  onSelect={(currentValue) => {
                    const selectedId = parseInt(currentValue);
                    if (!isNaN(selectedId)) {
                      onSelect(selectedId);
                    }
                    setOpen(false);
                  }}
                  disabled={!color.dbId}
                  className="py-2 px-3"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedColorId === color.dbId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <ColorItem colorConfig={color} size="sm" displayMode={true} showName={false} />
                    {color.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

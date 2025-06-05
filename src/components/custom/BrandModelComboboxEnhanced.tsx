"use client";

import { Check, ChevronsUpDown, Plus, Zap } from "lucide-react";
import { useState } from "react";

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
import { cn } from "@/lib/utils";
import { QuickBrandModelDialog } from "./QuickBrandModelDialog";

interface ModelInfo {
  id: number;
  name: string;
}

interface BrandForCombobox {
  id: number;
  name: string;
  color: string | null;
  models: ModelInfo[];
}

interface BrandModelComboboxEnhancedProps {
  brands: BrandForCombobox[];
  selectedModelId?: number | null;
  onSelect: (modelId: number, brandId: number) => void;
  onBrandsUpdate?: () => void; // Callback para refrescar la lista de marcas
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  className?: string;
  showQuickAdd?: boolean;
}

export function BrandModelComboboxEnhanced({
  brands,
  selectedModelId,
  onSelect,
  onBrandsUpdate,
  placeholder = "Selecciona marca/modelo...",
  searchPlaceholder = "Busca marca o modelo...",
  notFoundMessage = "No se encontró marca/modelo.",
  className,
  showQuickAdd = true,
}: BrandModelComboboxEnhancedProps) {
  const [open, setOpen] = useState(false);

  const selectedBrandAndModel = () => {
    if (!selectedModelId) return null;
    for (const brand of brands) {
      const model = brand.models.find((m) => m.id === selectedModelId);
      if (model) {
        return {
          brandName: brand.name,
          modelName: model.name,
          brandId: brand.id,
          modelId: model.id,
        };
      }
    }
    return null;
  };

  const handleBrandAdded = () => {
    // Refrescar la lista de marcas
    onBrandsUpdate?.();
  };

  const handleModelAdded = () => {
    // Refrescar la lista de marcas y modelos
    onBrandsUpdate?.();
  };

  // Color por defecto si no se proporciona
  const defaultBorderColor = "hsl(var(--border))";

  return (
    <div className="flex gap-2">
      {/* Combobox principal */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between h-10", className)}
          >
            {selectedBrandAndModel()
              ? `${selectedBrandAndModel()?.brandName} - ${selectedBrandAndModel()?.modelName}`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
          <Command shouldFilter={true}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground mb-2">{notFoundMessage}</p>
                  {showQuickAdd && (
                    <QuickBrandModelDialog
                      availableBrands={brands}
                      onBrandAdded={handleBrandAdded}
                      onModelAdded={handleModelAdded}
                    >
                      <Button size="sm" variant="outline" className="mt-2">
                        <Plus className="mr-2 h-3 w-3" />
                        Agregar nuevo
                      </Button>
                    </QuickBrandModelDialog>
                  )}
                </div>
              </CommandEmpty>
              {brands.map((brand) => (
                <CommandGroup
                  key={brand.id}
                  heading={brand.name}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground bg-muted/20 p-1 rounded-md mb-1 border-l-4 border-t border-b border-r border-border/30"
                  style={{ borderLeftColor: brand.color ?? defaultBorderColor }}
                >
                  {brand.models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${brand.name} ${model.name}`}
                      onSelect={() => {
                        onSelect(model.id, brand.id);
                        setOpen(false);
                      }}
                      className="py-1.5 px-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedModelId === model.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {model.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botón de agregar rápido */}
      {showQuickAdd && (
        <QuickBrandModelDialog
          availableBrands={brands}
          onBrandAdded={handleBrandAdded}
          onModelAdded={handleModelAdded}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            title="Agregar marca/modelo rápido"
          >
            <Zap className="h-4 w-4 text-yellow-600" />
          </Button>
        </QuickBrandModelDialog>
      )}
    </div>
  );
}

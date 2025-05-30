"use client";

import { Check, ChevronsUpDown } from "lucide-react";

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
import { useState } from "react";

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

interface BrandModelComboboxProps {
  brands: BrandForCombobox[];
  selectedModelId?: number | null;
  onSelect: (modelId: number, brandId: number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  className?: string;
}

export function BrandModelCombobox({
  brands,
  selectedModelId,
  onSelect,
  placeholder = "Selecciona marca/modelo...",
  searchPlaceholder = "Busca marca o modelo...",
  notFoundMessage = "No se encontró marca/modelo.",
  className,
}: BrandModelComboboxProps) {
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

  // Color por defecto si no se proporciona
  const defaultBorderColor = "hsl(var(--border))"; // Usar color de borde de shadcn

  return (
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
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
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
  );
}

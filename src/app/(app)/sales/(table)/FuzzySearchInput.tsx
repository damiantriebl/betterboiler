"use client";

import { getMotorcycleSuggestions } from "@/actions/sales/fuzzy-search-motorcycles";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface FuzzySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
}

export default function FuzzySearchInput({
  value,
  onChange,
  placeholder = "Buscar por marca, modelo, chasis...",
  className,
  showSuggestions = true,
}: FuzzySearchInputProps) {
  const [suggestions, setSuggestions] = useState<{
    brands: string[];
    models: string[];
    suggestions: string[];
  }>({ brands: [], models: [], suggestions: [] });
  const [showSuggestionsPopover, setShowSuggestionsPopover] = useState(false);
  const [isLoadingSuggestions, startSuggestionsTransition] = useTransition();

  // Cargar sugerencias cuando cambia el valor de búsqueda
  useEffect(() => {
    if (!value || value.length < 2 || !showSuggestions) {
      setSuggestions({ brands: [], models: [], suggestions: [] });
      setShowSuggestionsPopover(false);
      return;
    }

    const loadSuggestions = async () => {
      try {
        const result = await getMotorcycleSuggestions(value, 8);
        setSuggestions(result);

        // 🔧 FIX: Solo mostrar popover si hay marcas O modelos (no sugerencias vacías)
        const hasSuggestions = result.brands.length > 0 || result.models.length > 0;
        setShowSuggestionsPopover(hasSuggestions);
      } catch (error) {
        console.error("Error cargando sugerencias:", error);
        setSuggestions({ brands: [], models: [], suggestions: [] });
        setShowSuggestionsPopover(false);
      }
    };

    // Debounce de 300ms para evitar demasiadas requests
    const timeoutId = setTimeout(() => {
      startSuggestionsTransition(() => {
        loadSuggestions();
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, showSuggestions]);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestionsPopover(false);
  };

  const handleClear = () => {
    onChange("");
    setShowSuggestionsPopover(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Búsqueda Inteligente</Label>
      <Popover open={showSuggestionsPopover} onOpenChange={setShowSuggestionsPopover}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder}
              className={cn("pl-10 pr-10", className)}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => {
                // 🔧 FIX: Solo mostrar al hacer focus si realmente hay sugerencias
                const hasSuggestions =
                  suggestions.brands.length > 0 || suggestions.models.length > 0;
                if (hasSuggestions) {
                  setShowSuggestionsPopover(true);
                }
              }}
            />
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isLoadingSuggestions && (
              <div className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-2" align="start">
          <div className="space-y-2">
            {suggestions.brands.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Marcas</div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.brands.map((brand) => (
                    <Badge
                      key={brand}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleSuggestionClick(brand)}
                    >
                      {brand}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {suggestions.models.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Modelos</div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.models.map((model) => (
                    <Badge
                      key={model}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleSuggestionClick(model)}
                    >
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 🔧 FIX: Solo mostrar mensaje si no hay brands NI models, no basado en suggestions */}
            {suggestions.brands.length === 0 &&
              suggestions.models.length === 0 &&
              !isLoadingSuggestions &&
              value.length >= 2 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No se encontraron sugerencias para "{value}"
                </div>
              )}
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="text-xs text-muted-foreground">
          💡 La búsqueda inteligente encuentra resultados incluso con errores tipográficos
        </div>
      )}
    </div>
  );
}

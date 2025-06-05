"use client";

import { searchGlobalBrands, searchGlobalModels } from "@/actions/stock/quick-brand-model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface BrandSuggestion {
  id: number;
  name: string;
  color: string | null;
}

interface ModelSuggestion {
  id: number;
  name: string;
}

interface AutocompleteBrandModelProps {
  onSubmit: (formData: FormData) => void;
  brandPlaceholder?: string;
  modelPlaceholder?: string;
  disabled?: boolean;
}

export function AutocompleteBrandModel({
  onSubmit,
  brandPlaceholder = "Escribe la marca (ej: Honda, Yamaha...)",
  modelPlaceholder = "Escribe el modelo (ej: CB 400F, XTZ 250...)",
  disabled = false,
}: AutocompleteBrandModelProps) {
  const [brandInput, setBrandInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [brandSuggestions, setBrandSuggestions] = useState<BrandSuggestion[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<ModelSuggestion[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandSuggestion | null>(null);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [isBrandLoading, setIsBrandLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar marcas con debounce
  const debouncedSearchBrands = useDebouncedCallback(
    useCallback(async (query: string) => {
      console.log("🚀 Frontend: iniciando búsqueda de marcas con query:", query);

      if (query.length >= 2) {
        setIsBrandLoading(true);
        console.log("⏳ Frontend: activando loader de marcas");

        try {
          console.log("📡 Frontend: llamando a searchGlobalBrands...");
          const results = await searchGlobalBrands(query);
          console.log("✅ Frontend: resultados recibidos:", results);

          // Verificación de seguridad para asegurar que results sea un array
          const safeBrandResults = Array.isArray(results) ? results : [];
          setBrandSuggestions(safeBrandResults);
          setShowBrandSuggestions(safeBrandResults.length > 0);
        } catch (error) {
          console.error("❌ Frontend: Error searching brands:", error);
          setBrandSuggestions([]);
          setShowBrandSuggestions(false);
        } finally {
          console.log("🔚 Frontend: desactivando loader de marcas");
          setIsBrandLoading(false);
        }
      } else {
        console.log("❌ Frontend: query muy corto, limpiando sugerencias");
        setBrandSuggestions([]);
        setShowBrandSuggestions(false);
        setIsBrandLoading(false);
      }
    }, []),
    300,
  );

  // Buscar modelos con debounce
  const debouncedSearchModels = useDebouncedCallback(
    useCallback(async (query: string, brandId: number) => {
      console.log(
        "🚀 Frontend: iniciando búsqueda de modelos con query:",
        query,
        "brandId:",
        brandId,
      );

      if (query.length >= 1) {
        setIsModelLoading(true);
        console.log("⏳ Frontend: activando loader de modelos");

        try {
          console.log("📡 Frontend: llamando a searchGlobalModels...");
          const results = await searchGlobalModels(brandId, query);
          console.log("✅ Frontend: resultados de modelos recibidos:", results);

          // Verificación de seguridad para asegurar que results sea un array
          const safeModelResults = Array.isArray(results) ? results : [];
          setModelSuggestions(safeModelResults);
          setShowModelSuggestions(safeModelResults.length > 0);
        } catch (error) {
          console.error("❌ Frontend: Error searching models:", error);
          setModelSuggestions([]);
          setShowModelSuggestions(false);
        } finally {
          console.log("🔚 Frontend: desactivando loader de modelos");
          setIsModelLoading(false);
        }
      } else {
        console.log("❌ Frontend: query de modelo muy corto, limpiando sugerencias");
        setModelSuggestions([]);
        setShowModelSuggestions(false);
        setIsModelLoading(false);
      }
    }, []),
    300,
  );

  const handleBrandInputChange = (value: string) => {
    console.log("📝 Frontend: cambio en input de marca:", value);
    setBrandInput(value);
    setSelectedBrand(null);
    setModelInput("");
    setModelSuggestions([]);
    setShowModelSuggestions(false);

    if (value.trim()) {
      console.log("🔄 Frontend: iniciando debounced search para marcas");
      debouncedSearchBrands(value.trim());
    } else {
      console.log("🧹 Frontend: limpiando todo por input vacío");
      setBrandSuggestions([]);
      setShowBrandSuggestions(false);
      setIsBrandLoading(false);
    }
  };

  const handleBrandSelect = (brand: BrandSuggestion) => {
    setBrandInput(brand.name);
    setSelectedBrand(brand);
    setBrandSuggestions([]);
    setShowBrandSuggestions(false);
    setIsBrandLoading(false);

    // Reset modelo cuando se cambia de marca
    setModelInput("");
    setModelSuggestions([]);
    setShowModelSuggestions(false);
    setIsModelLoading(false);
  };

  const handleModelInputChange = (value: string) => {
    setModelInput(value);

    if (selectedBrand && value.trim()) {
      debouncedSearchModels(value.trim(), selectedBrand.id);
    } else {
      setModelSuggestions([]);
      setShowModelSuggestions(false);
      setIsModelLoading(false);
    }
  };

  const handleModelSelect = (model: ModelSuggestion) => {
    setModelInput(model.name);
    setModelSuggestions([]);
    setShowModelSuggestions(false);
    setIsModelLoading(false);
  };

  const handleFormSubmit = async (formData: FormData) => {
    setIsSubmitting(true);

    try {
      // Agregar los datos del formulario
      formData.set("brandName", brandInput.trim());
      formData.set("modelName", modelInput.trim());
      formData.set("brandColor", "#3B82F6"); // Color por defecto
      if (selectedBrand?.id) {
        formData.set("brandId", selectedBrand.id.toString());
      }

      // Llamar a la función parent
      onSubmit(formData);

      // Reset form
      setBrandInput("");
      setModelInput("");
      setSelectedBrand(null);
      setBrandSuggestions([]);
      setModelSuggestions([]);
      setShowBrandSuggestions(false);
      setShowModelSuggestions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verificaciones de seguridad para los arrays
  const safeBrandSuggestions = Array.isArray(brandSuggestions) ? brandSuggestions : [];
  const safeModelSuggestions = Array.isArray(modelSuggestions) ? modelSuggestions : [];

  return (
    <form action={handleFormSubmit} className="space-y-4">
      {/* Campo de marca */}
      <div className="space-y-2 relative">
        <Label htmlFor="brand-autocomplete">Marca</Label>
        <div className="relative">
          <Input
            id="brand-autocomplete"
            value={brandInput}
            onChange={(e) => handleBrandInputChange(e.target.value)}
            placeholder={brandPlaceholder}
            disabled={disabled || isSubmitting}
            className={cn("pr-8", selectedBrand && "border-green-500 bg-green-50")}
            required
          />
          {isBrandLoading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {selectedBrand && !isBrandLoading && (
            <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>

        {/* Sugerencias de marcas */}
        {showBrandSuggestions && safeBrandSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {safeBrandSuggestions.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleBrandSelect(brand)}
                className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                {brand.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: brand.color }}
                  />
                )}
                <span className="truncate">{brand.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">Global</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Campo de modelo */}
      <div className="space-y-2 relative">
        <Label htmlFor="model-autocomplete">Modelo</Label>
        <div className="relative">
          <Input
            id="model-autocomplete"
            value={modelInput}
            onChange={(e) => handleModelInputChange(e.target.value)}
            placeholder={modelPlaceholder}
            disabled={disabled || !brandInput.trim() || isSubmitting}
            className={cn("pr-8", !brandInput.trim() && "opacity-50")}
            required
          />
          {isModelLoading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Sugerencias de modelos */}
        {showModelSuggestions && safeModelSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {safeModelSuggestions.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => handleModelSelect(model)}
                className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="truncate">{model.name}</span>
                <span className="text-xs text-muted-foreground">Global</span>
              </button>
            ))}
          </div>
        )}

        {/* Mensaje de ayuda */}
        {brandInput.trim() && !selectedBrand && (
          <p className="text-xs text-muted-foreground">
            Selecciona una marca existente o crea una nueva
          </p>
        )}
      </div>

      {/* Botón para agregar */}
      <Button
        type="submit"
        disabled={
          disabled ||
          !brandInput.trim() ||
          !modelInput.trim() ||
          isSubmitting ||
          isBrandLoading ||
          isModelLoading
        }
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Marca y Modelo
          </>
        )}
      </Button>
    </form>
  );
}

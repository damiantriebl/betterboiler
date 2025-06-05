"use client";

import {
  createQuickBrandAndModel,
  createQuickLocalBrand,
  createQuickLocalModel,
} from "@/actions/stock/quick-brand-model";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Loader2, Palette, Plus, Zap } from "lucide-react";
import { useActionState } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { HexColorPicker } from "react-colorful";
import { AutocompleteBrandModel } from "./AutocompleteBrandModel";

interface BrandForQuick {
  id: number;
  name: string;
  color: string | null;
  models: { id: number; name: string }[];
}

interface QuickBrandModelDialogProps {
  availableBrands: BrandForQuick[];
  onBrandAdded?: (brand: { id: number; name: string; color: string | null }) => void;
  onModelAdded?: (model: { id: number; name: string; brandId: number }) => void;
  children?: React.ReactNode;
}

export function QuickBrandModelDialog({
  availableBrands,
  onBrandAdded,
  onModelAdded,
  children,
}: QuickBrandModelDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"combo" | "brand" | "model">("combo");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { toast } = useToast();

  // Referencias para limpiar formularios
  const brandFormRef = useRef<HTMLFormElement>(null);
  const modelFormRef = useRef<HTMLFormElement>(null);

  // Estados para las acciones
  const [brandState, brandAction, isBrandPending] = useActionState(createQuickLocalBrand, null);
  const [modelState, modelAction, isModelPending] = useActionState(createQuickLocalModel, null);
  const [comboState, comboAction, isComboPending] = useActionState(createQuickBrandAndModel, null);

  // Manejar éxito de crear marca
  useEffect(() => {
    if (brandState?.success && brandState.brand) {
      toast({
        title: "Marca creada",
        description: `La marca "${brandState.brand.name}" ha sido agregada correctamente.`,
      });
      onBrandAdded?.(brandState.brand);
      brandFormRef.current?.reset();
      setBrandColor("#3B82F6");
      setIsOpen(false);
    } else if (brandState?.error) {
      toast({
        title: "Error al crear marca",
        description: brandState.error,
        variant: "destructive",
      });
    }
  }, [brandState, onBrandAdded, toast]);

  // Manejar éxito de crear modelo
  useEffect(() => {
    if (modelState?.success && modelState.model) {
      toast({
        title: "Modelo creado",
        description: `El modelo "${modelState.model.name}" ha sido agregado correctamente.`,
      });
      onModelAdded?.(modelState.model);
      modelFormRef.current?.reset();
      setSelectedBrandId("");
      setIsOpen(false);
    } else if (modelState?.error) {
      toast({
        title: "Error al crear modelo",
        description: modelState.error,
        variant: "destructive",
      });
    }
  }, [modelState, onModelAdded, toast]);

  // Manejar éxito de crear marca + modelo
  useEffect(() => {
    if (comboState?.success && comboState.brand && comboState.model) {
      toast({
        title: "Marca y modelo creados",
        description: `La marca "${comboState.brand.name}" y el modelo "${comboState.model.name}" han sido agregados correctamente.`,
        duration: 5000,
      });
      onBrandAdded?.(comboState.brand);
      onModelAdded?.(comboState.model);
      setIsOpen(false);
    } else if (comboState?.error) {
      toast({
        title: "Error al crear marca y modelo",
        description: comboState.error,
        variant: "destructive",
      });
    }
  }, [comboState, onBrandAdded, onModelAdded, toast]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Limpiar estado al cerrar
      setBrandColor("#3B82F6");
      setSelectedBrandId("");
      setActiveTab("combo");
      setIsColorPickerOpen(false);
    }
  };

  const handleBrandSubmit = (formData: FormData) => {
    formData.set("color", brandColor);
    brandAction(formData);
  };

  const handleComboFormSubmit = (formData: FormData) => {
    comboAction(formData);
  };

  const colorButton = (
    <div className="flex items-center space-x-2">
      <div
        className="w-8 h-8 rounded-md border cursor-pointer transition-all hover:ring-2 hover:ring-offset-2 hover:ring-blue-500"
        style={{ backgroundColor: brandColor }}
        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsColorPickerOpen(!isColorPickerOpen);
          }
        }}
        role="button"
        tabIndex={0}
        title="Seleccionar color"
      />
      <Input
        value={brandColor}
        onChange={(e) => setBrandColor(e.target.value)}
        className="flex-1"
        pattern="^#[0-9a-fA-F]{6}$"
        placeholder="#3B82F6"
        title="Color en formato hexadecimal"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
      >
        <Palette className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Zap className="mr-2 h-4 w-4" />
            Agregar Rápido
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Agregar Marca/Modelo Rápido
          </DialogTitle>
          <DialogDescription>
            Agrega marcas y modelos específicos para motos únicas sin afectar el catálogo global.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "combo" | "brand" | "model")}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="combo">Marca + Modelo</TabsTrigger>
            <TabsTrigger value="brand">Nueva Marca</TabsTrigger>
            <TabsTrigger value="model">Nuevo Modelo</TabsTrigger>
          </TabsList>

          <TabsContent value="combo" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🚀 Modo Inteligente</h4>
                <p className="text-sm text-blue-700">
                  Escribe la marca (ej: "HO" → Honda) y el modelo. Si existen globalmente, se
                  asociarán automáticamente. Si no existen, se crearán nuevos.
                </p>
              </div>

              <AutocompleteBrandModel onSubmit={handleComboFormSubmit} disabled={isComboPending} />
            </div>
          </TabsContent>

          <TabsContent value="brand" className="space-y-4">
            <form ref={brandFormRef} action={handleBrandSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Nombre de la Marca</Label>
                <Input
                  id="brand-name"
                  name="name"
                  placeholder="Ej: Yamaha Clásica, Honda Vintage..."
                  required
                  disabled={isBrandPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-color">Color de Identificación</Label>
                <div className="relative">
                  {colorButton}
                  {isColorPickerOpen && (
                    <div className="absolute top-full left-0 z-50 mt-2 p-3 bg-background border rounded-lg shadow-lg">
                      <HexColorPicker color={brandColor} onChange={setBrandColor} />
                      <div className="flex justify-between items-center mt-3 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">{brandColor}</span>
                        <Button type="button" size="sm" onClick={() => setIsColorPickerOpen(false)}>
                          <Check className="h-4 w-4 mr-1" />
                          Listo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isBrandPending}>
                  {isBrandPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Marca
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <form ref={modelFormRef} action={modelAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-brand">Marca</Label>
                <Select
                  name="brandId"
                  value={selectedBrandId}
                  onValueChange={setSelectedBrandId}
                  disabled={isModelPending}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una marca..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        <div className="flex items-center gap-2">
                          {brand.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: brand.color }}
                            />
                          )}
                          {brand.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-name">Nombre del Modelo</Label>
                <Input
                  id="model-name"
                  name="name"
                  placeholder="Ej: XTZ 250 2015, CB 600F Hornet..."
                  required
                  disabled={isModelPending}
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isModelPending || !selectedBrandId}
                >
                  {isModelPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Modelo
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>💡 Tip:</strong> Usa "Marca + Modelo" para el flujo más rápido, o las pestañas
            individuales para control granular.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

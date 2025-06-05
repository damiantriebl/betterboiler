"use client";

import { associateOrganizationBrand } from "@/actions/configuration/associate-organization-brand";
import { createRootBrand, getRootBrands } from "@/actions/root/global-brand-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ActionState, CreateBrandState } from "@/types/action-states";
import type { Brand } from "@prisma/client";
import { Check, Info, Loader2, Palette, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { HexColorPicker } from "react-colorful";

interface CreateBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
  existingBrandIds?: number[];
}

// Define the expected state type for the associateOrganizationBrand action
type AssociateBrandActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export default function CreateBrandModal({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
  existingBrandIds = [],
}: CreateBrandModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isFetchingBrands, startFetchingBrands] = useTransition();
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrandColor, setSelectedBrandColor] = useState<string | null>(null);

  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandColor, setNewBrandColor] = useState("#3B82F6"); // Color azul por defecto
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Keep track of whether success handling has run
  const successHandledRef = useRef({
    associate: false,
    create: false,
  });

  // Custom wrapper for associateOrganizationBrand to be used with useActionState
  const wrappedAssociateAction = async (
    _prevState: AssociateBrandActionState,
    formData: FormData,
  ) => {
    const brandId = formData.get("brandId") as string;
    return await associateOrganizationBrand({
      organizationId,
      brandId,
      pathToRevalidate: "/configuration",
    });
  };

  const [associateState, associateFormAction, isAssociating] = useActionState<
    AssociateBrandActionState,
    FormData
  >(wrappedAssociateAction, { success: false, error: undefined, message: undefined });

  const [createState, createFormAction, isCreating] = useActionState(createRootBrand, {
    success: false,
  });

  // Reset success handled ref when modal opens/closes
  useEffect(() => {
    if (open) {
      // Initialize flags when modal opens
      successHandledRef.current = {
        associate: false,
        create: false,
      };
    }
  }, [open]);

  useEffect(() => {
    if (open && organizationId) {
      setAvailableBrands([]);
      setSelectedBrandId("");
      setSelectedBrandColor(null);
      startFetchingBrands(async () => {
        try {
          const brands = await getRootBrands();
          // Asegurar que brands sea siempre un array válido
          setAvailableBrands(Array.isArray(brands) ? brands : []);
          if (!brands || brands.length === 0) {
            toast({
              title: "No hay marcas globales",
              description: "No se encontraron marcas globales. Puede crear una nueva.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error("Error fetching global brands:", error);
          toast({
            title: "Error al cargar marcas",
            description: "No se pudieron cargar las marcas globales disponibles.",
            variant: "destructive",
          });
        }
      });
    }
    if (!open) {
      setShowNewBrandForm(false);
      setNewBrandName("");
      setNewBrandColor("#3B82F6");
      setSelectedBrandId("");
      setSelectedBrandColor(null);
    }
  }, [open, organizationId, toast]);

  // Handle associate success/error
  useEffect(() => {
    if (associateState?.success && !successHandledRef.current.associate) {
      successHandledRef.current.associate = true;
      toast({ title: "Marca Asociada", description: associateState.message });
      onSuccess?.();
      // Use timeout to avoid state updates during rendering
      setTimeout(() => {
        onOpenChange(false);
        router.refresh();
      }, 100);
    } else if (associateState?.error) {
      toast({
        title: "Error al asociar",
        description: associateState.error,
        variant: "destructive",
      });
    }
  }, [
    associateState?.success,
    associateState?.error,
    associateState?.message,
    toast,
    onSuccess,
    onOpenChange,
    router,
  ]);

  // Handle create success/error
  useEffect(() => {
    if (createState?.success && !successHandledRef.current.create) {
      successHandledRef.current.create = true;
      toast({
        title: "Marca creada",
        description: "La marca se ha creado correctamente",
      });
      onSuccess?.();
      onOpenChange(false);
      router.refresh();
    }
    if (createState?.error && !successHandledRef.current.create) {
      successHandledRef.current.create = true;
      toast({
        variant: "destructive",
        title: "Error al crear la marca",
        description: createState.message || "Hubo un error al crear la marca",
      });
    }
  }, [
    createState?.success,
    createState?.error,
    createState?.message,
    toast,
    onSuccess,
    onOpenChange,
    router,
  ]);

  // Actualizar el color seleccionado cuando cambia la marca seleccionada
  useEffect(() => {
    if (selectedBrandId && availableBrands) {
      const brand = (availableBrands || []).find((b) => b.id === Number.parseInt(selectedBrandId));
      setSelectedBrandColor(brand?.color || null);
    } else {
      setSelectedBrandColor(null);
    }
  }, [selectedBrandId, availableBrands]);

  const handleAssociateBrand = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!selectedBrandId) return;

    try {
      const result = await associateOrganizationBrand({
        organizationId,
        brandId: selectedBrandId,
        pathToRevalidate: "/configuration",
      });

      // Verificar que result existe y tiene la estructura esperada
      if (!result || typeof result !== "object") {
        toast({
          title: "Error",
          description: "Ha ocurrido un error inesperado al asociar la marca.",
          variant: "destructive",
        });
        return;
      }

      if (result.success) {
        toast({ title: "Marca asociada correctamente." });
        onSuccess?.();
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Ha ocurrido un error al asociar la marca.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleAssociateBrand:", error);
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado al asociar la marca.",
        variant: "destructive",
      });
    }
  };

  // Filtrar marcas no asociadas para mostrar en el select
  const nonAssociatedBrands = (availableBrands || []).filter(
    (brand) => !(existingBrandIds || []).includes(brand.id),
  );

  // Verificar si hay marcas disponibles para asociar
  const hasAvailableBrands = nonAssociatedBrands.length > 0;

  const handleCreateFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newBrandName.trim()) return;

    const formData = new FormData();
    formData.append("name", newBrandName.trim());
    formData.append("color", newBrandColor);

    createFormAction(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {showNewBrandForm ? "Crear Nueva Marca Global" : "Asociar Marca Existente"}
          </DialogTitle>
          <DialogDescription>
            {showNewBrandForm
              ? "Crea una nueva marca global que estará disponible para todas las organizaciones."
              : "Selecciona una marca global existente para asociarla a tu organización."}
          </DialogDescription>
        </DialogHeader>

        {!showNewBrandForm ? (
          <form action={associateFormAction} className="grid gap-4 py-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            {isFetchingBrands ? (
              <div className="text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {hasAvailableBrands ? (
                  <>
                    <Select
                      name="brandId"
                      value={selectedBrandId}
                      onValueChange={setSelectedBrandId}
                      disabled={isAssociating}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una marca global..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(availableBrands || []).map((brand) => {
                          const isAlreadyAssociated = (existingBrandIds || []).includes(brand.id);

                          if (isAlreadyAssociated) {
                            return (
                              <div
                                key={brand.id}
                                className="flex items-center justify-between px-2 py-1.5 text-sm cursor-not-allowed opacity-60"
                              >
                                <span>
                                  {brand.color && (
                                    <span
                                      className="inline-block w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: brand.color }}
                                    />
                                  )}
                                  {brand.name}
                                </span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex items-center text-xs text-muted-foreground">
                                        <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                                        Ya asociada
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Esta marca ya está asociada a tu organización</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            );
                          }

                          return (
                            <SelectItem key={brand.id} value={brand.id.toString()}>
                              {brand.color && (
                                <span
                                  className="inline-block w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: brand.color }}
                                />
                              )}
                              {brand.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {selectedBrandId && selectedBrandColor && (
                      <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded">
                        <span className="text-sm text-muted-foreground">Color global:</span>
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: selectedBrandColor }}
                        />
                        <span className="text-sm">{selectedBrandColor}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Este color se asignará por defecto a la asociación
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center border rounded-md bg-muted/30">
                    <Info className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {(availableBrands || []).length === 0
                        ? "No hay marcas globales disponibles."
                        : "Todas las marcas globales ya están asociadas a tu organización."}
                    </p>
                  </div>
                )}
              </>
            )}

            <DialogFooter
              className={`mt-4 flex flex-col sm:flex-row sm:justify-between${(availableBrands || []).length > 0 ? " sm:items-center" : ""}`}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewBrandForm(true)}
                disabled={isAssociating || isFetchingBrands}
              >
                <Plus className="mr-2 h-4 w-4" /> Crear Marca Global
              </Button>
              <div
                className={`flex gap-2 mt-2 sm:mt-0${(availableBrands || []).length === 0 ? " w-full justify-end" : ""}`}
              >
                <DialogClose asChild>
                  <Button type="button" variant="ghost" disabled={isAssociating}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleAssociateBrand}
                  disabled={
                    isAssociating || isFetchingBrands || !selectedBrandId || !hasAvailableBrands
                  }
                >
                  {isAssociating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Asociar Marca
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleCreateFormSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-brand-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="new-brand-name"
                name="name"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="col-span-3"
                required
                autoFocus
                disabled={isCreating}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-brand-color" className="text-right">
                Color
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <div
                  className="w-10 h-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: newBrandColor }}
                  onClick={() => setIsColorPickerOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsColorPickerOpen(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                />
                <Input
                  id="new-brand-color"
                  name="color"
                  value={newBrandColor}
                  onChange={(e) => setNewBrandColor(e.target.value)}
                  className="flex-1"
                  pattern="^#[0-9a-fA-F]{6}$"
                  placeholder="#RRGGBB"
                  title="Formato hexadecimal de color (ej: #FF0000)"
                  required
                  disabled={isCreating}
                />
                <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="icon" variant="outline" disabled={isCreating}>
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-auto p-0">
                    <div className="p-3">
                      <HexColorPicker color={newBrandColor} onChange={setNewBrandColor} />
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 border-t">
                      <div className="text-sm">{newBrandColor}</div>
                      <Button size="sm" onClick={() => setIsColorPickerOpen(false)}>
                        Aceptar
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {createState.error && (
              <p className="text-sm text-red-500 col-span-4 text-center">
                Error: {createState.error}
              </p>
            )}
            <DialogFooter
              className={`mt-4${showNewBrandForm ? " flex flex-col sm:flex-row sm:justify-between" : ""}`}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewBrandForm(false)}
                disabled={isCreating}
              >
                Volver a Seleccionar
              </Button>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" disabled={isCreating}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating || !newBrandName.trim()}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear y Continuar
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

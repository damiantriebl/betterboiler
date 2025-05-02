"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  associateOrganizationBrand,
} from "@/actions/configuration/associate-organization-brand";
import {
  createRootBrand,
  getRootBrands,
} from "@/actions/root/global-brand-actions";
import type { Brand } from "@prisma/client";
import type { ActionState, CreateBrandState } from "@/types/action-states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getModelsByBrandId } from "@/actions/root/get-models-by-brand-id";
import { createModel } from "@/actions/root/create-model";

interface CreateBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
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
}: CreateBrandModalProps) {
  const { toast } = useToast();
  const [isFetchingBrands, startFetchingBrands] = useTransition();
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  // Keep track of whether success handling has run
  const successHandledRef = useRef({
    associate: false,
    create: false,
  });

  // Custom wrapper for associateOrganizationBrand to be used with useActionState
  const wrappedAssociateAction = async (
    _prevState: AssociateBrandActionState,
    formData: FormData
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
  >(
    wrappedAssociateAction,
    { success: false, error: undefined, message: undefined }
  );

  const [createState, createFormAction, isCreating] = useActionState(
    createRootBrand,
    { success: false }
  );

  const [brandModels, setBrandModels] = useState<{ id: number; name: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [newModelName, setNewModelName] = useState("");

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
      startFetchingBrands(async () => {
        try {
          const brands = await getRootBrands();
          setAvailableBrands(brands);
          if (brands.length === 0) {
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
      setSelectedBrandId("");
    }
  }, [open, organizationId, toast]);

  // Handle associate success/error
  useEffect(() => {
    if (associateState.success && !successHandledRef.current.associate) {
      successHandledRef.current.associate = true;
      toast({ title: "Marca Asociada", description: associateState.message });
      onSuccess?.();
      // Use timeout to avoid state updates during rendering
      setTimeout(() => onOpenChange(false), 0);
    } else if (associateState.error) {
      toast({ title: "Error al asociar", description: associateState.error, variant: "destructive" });
    }
  }, [associateState.success, associateState.error, toast, onSuccess, onOpenChange]);

  // Handle create success/error
  useEffect(() => {
    if (createState.success && !successHandledRef.current.create) {
      successHandledRef.current.create = true;
      toast({ title: "Marca Global Creada", description: createState.message });
      startFetchingBrands(async () => {
        try {
          const brands = await getRootBrands();
          setAvailableBrands(brands);
          setShowNewBrandForm(false);
          setNewBrandName("");
        } catch (error) {
          console.error("Error refetching global brands:", error);
          toast({
            title: "Error",
            description: "No se pudieron recargar las marcas globales.",
            variant: "destructive",
          });
        }
      });
    } else if (createState.error) {
      toast({
        title: "Error al Crear Marca Global",
        description: createState.error,
        variant: "destructive",
      });
    }
  }, [createState.success, createState.error, toast]);

  // Cargar modelos cuando cambia la marca seleccionada
  useEffect(() => {
    if (!selectedBrandId) {
      setBrandModels([]);
      return;
    }
    setIsLoadingModels(true);
    getModelsByBrandId(Number(selectedBrandId)).then((res) => {
      if (res.success && Array.isArray(res.models)) setBrandModels(res.models);
      else setBrandModels([]);
      if (!res.success) toast({ title: "Error", description: res.error, variant: "destructive" });
      setIsLoadingModels(false);
    });
  }, [selectedBrandId, toast]);

  // Handler para crear modelo
  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !selectedBrandId) return;
    const res = await createModel({
      name: newModelName.trim(),
      brandId: Number(selectedBrandId),
      pathToRevalidate: "/configuration",
    });
    if (res.success && res.model) {
      setBrandModels((prev) => [...prev, { id: res.model.id, name: res.model.name }]);
      setNewModelName("");
      toast({ title: "Modelo creado correctamente." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleAssociateBrand = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!selectedBrandId) return;

    const result = await associateOrganizationBrand({
      organizationId,
      brandId: selectedBrandId,
      pathToRevalidate: "/configuration",
    });

    if (result.success) {
      toast({ title: 'Marca asociada correctamente.' });
      onSuccess?.();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{showNewBrandForm ? "Crear Nueva Marca Global" : "Asociar Marca Existente"}</DialogTitle>
          <DialogDescription>
            {showNewBrandForm
              ? "Crea una nueva marca global que estará disponible para todas las organizaciones."
              : "Selecciona una marca global existente para asociarla a tu organización."
            }
          </DialogDescription>
        </DialogHeader>

        {!showNewBrandForm ? (
          <form action={associateFormAction} className="grid gap-4 py-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            {isFetchingBrands ? (
              <div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
            ) : (
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
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                  {availableBrands.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay más marcas globales disponibles.
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}

            <DialogFooter className={`mt-4 flex flex-col sm:flex-row sm:justify-between${availableBrands.length > 0 ? " sm:items-center" : ""}`}>
              <Button type="button" variant="outline" onClick={() => setShowNewBrandForm(true)} disabled={isAssociating || isFetchingBrands}>
                <Plus className="mr-2 h-4 w-4" /> Crear Marca Global
              </Button>
              <div className={`flex gap-2 mt-2 sm:mt-0${availableBrands.length === 0 ? " w-full justify-end" : ""}`}>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" disabled={isAssociating}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button onClick={handleAssociateBrand} disabled={isAssociating || isFetchingBrands || !selectedBrandId}>
                  {isAssociating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Asociar Marca
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <form action={createFormAction} className="grid gap-4 py-4">
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
            {createState.error && (
              <p className="text-sm text-red-500 col-span-4 text-center">Error: {createState.error}</p>
            )}
            <DialogFooter className={`mt-4${showNewBrandForm ? " flex flex-col sm:flex-row sm:justify-between" : ""}`}>
              <Button type="button" variant="outline" onClick={() => setShowNewBrandForm(false)} disabled={isCreating}>
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

        {selectedBrandId && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-semibold mb-2">Modelos de la marca seleccionada</h4>
            {isLoadingModels ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            ) : (
              <ul className="mb-2">
                {brandModels.length === 0 ? (
                  <li className="text-muted-foreground text-sm">No hay modelos para esta marca.</li>
                ) : (
                  brandModels.map((model) => (
                    <li key={model.id} className="text-sm">{model.name}</li>
                  ))
                )}
              </ul>
            )}
            <form onSubmit={handleAddModel} className="flex gap-2">
              <Input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Nombre del modelo"
                className="flex-1"
                required
                disabled={isLoadingModels}
              />
              <Button type="submit" disabled={isLoadingModels || !newModelName.trim()}>
                Añadir modelo
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

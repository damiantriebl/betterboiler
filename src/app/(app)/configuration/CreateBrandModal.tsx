"use client";

import React, { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  associateOrganizationBrand,
  type AssociateBrandState,
} from "@/actions/configuration/create-edit-brand";

interface CreateBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Crear Marca
    </Button>
  );
}

export default function CreateBrandModal({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: CreateBrandModalProps) {
  const initialState: AssociateBrandState = { success: false };
  const [state, formAction] = useFormState(associateOrganizationBrand, initialState);
  const { toast } = useToast();
  const [name, setName] = useState("");
  // const [color, setColor] = useState('#ffffff'); // Estado opcional para color

  useEffect(() => {
    if (!open) return; // Only act if the modal is open

    if (state.success) {
      toast({
        title: "Marca Asociada",
        description: state.message || `La marca "${name}" se asoció correctamente.`,
      });
      onSuccess?.();
      onOpenChange(false); // Close modal on success
    } else if (state.error) {
      toast({ title: "Error al asociar marca", description: state.error, variant: "destructive" });
      // Do not close modal on error for user correction
    }
    // Added missing dependencies
  }, [state, toast, name, onSuccess, onOpenChange, open]);

  // Resetear nombre y estado del formulario al ABRIR el modal
  useEffect(() => {
    if (open) {
      setName("");
      // setColor('#ffffff');
      // Resetear el estado de useFormState (si es necesario, a veces no hace falta)
      // Podríamos necesitar un `key` en el <form> que cambie para forzar reset
    }
  }, [open]);

  // Cierra el modal si el usuario navega hacia atrás
  // (Esto puede o no ser necesario dependiendo de tu flujo)
  /*
    useEffect(() => {
        const handlePopState = () => onOpenChange(false);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [onOpenChange]);
    */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asociar Marca a la Organización</DialogTitle>
          <DialogDescription>
            Busca o crea una marca global y asóciala a tu organización.
          </DialogDescription>
        </DialogHeader>
        {/* Usar formAction directamente aquí */}
        <form action={formAction} className="grid gap-4 py-4">
          <input type="hidden" name="organizationId" value={organizationId} />

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="brand-name" className="text-right">
              Nombre
            </Label>
            <Input
              id="brand-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
              autoFocus // Enfocar al abrir
            />
          </div>
          {/* 
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="brand-color" className="text-right">
                            Color
                        </Label>
                        <Input 
                            id="brand-color"
                            name="color" 
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="col-span-3 h-8 p-1" // Estilo básico para input color
                        />
                    </div>
                    */}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

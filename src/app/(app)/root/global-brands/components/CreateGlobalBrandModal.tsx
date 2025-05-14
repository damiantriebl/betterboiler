"use client";

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
import { useToast } from "@/hooks/use-toast";
import { getOrganizationBrands } from "@/lib/organizations";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { useActionState } from "react";

interface CreateGlobalBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  createAction: (prevState: CreateBrandState, formData: FormData) => Promise<CreateBrandState>;
  onSuccess: () => void; // Simplified onSuccess, parent handles state update
}

// Placeholder type - replace with actual import when available
// Defined locally if ManageGlobalBrands doesn't export it
type CreateBrandState = { success: boolean; message?: string; error?: string };

export default function CreateGlobalBrandModal({
  isOpen,
  onClose,
  createAction,
  onSuccess,
}: CreateGlobalBrandModalProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(createAction, { success: false });
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast({ title: state.message || "Marca creada con éxito" });
      onSuccess();
      setName("");
      router.refresh();
    } else if (state.error) {
      toast({ title: "Error al crear marca", description: state.error, variant: "destructive" });
    }
    if (!isOpen && !isPending) {
      setName("");
    }
  }, [state, isOpen, isPending, onSuccess, toast, router]);

  // Handle modal close/open changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Prevent form submission if name is empty
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!name.trim()) {
      event.preventDefault();
      toast({
        title: "Error",
        description: "El nombre de la marca no puede estar vacío.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form action={formAction} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Añadir Nueva Marca Global</DialogTitle>
            <DialogDescription>
              Introduce el nombre para la nueva marca que estará disponible globalmente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
                disabled={isPending}
              />
            </div>
            {state.error && !state.success && (
              <p className="text-sm text-red-500 col-span-4 text-center">Error: {state.error}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Guardando..." : "Guardar Marca"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

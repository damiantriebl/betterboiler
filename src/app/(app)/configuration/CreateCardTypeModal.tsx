"use client";

import { createCardType } from "@/actions/card-types/manage-card-types";
import { Spinner } from "@/components/custom/Spinner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CardType } from "@/types/bank-cards";
import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

interface CreateCardTypeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: (newCardType: CardType) => void; // Callback on successful creation
  initialName?: string; // Optional initial name from search
}

// Define a more precise type for the form state
type FormState = {
  success: boolean;
  message?: string | null; // Use message for both success and general errors
  fieldErrors?: {
    name?: string[];
    type?: string[];
    logoUrl?: string[];
  } | null;
  data?: CardType | null;
};

const initialState: FormState = {
  success: false,
  message: null,
  fieldErrors: null,
  data: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
      Crear Tipo de Tarjeta
    </Button>
  );
}

export default function CreateCardTypeModal({
  isOpen,
  onOpenChange,
  onSuccess,
  initialName = "",
}: CreateCardTypeModalProps) {
  const { toast } = useToast();
  // Use the refined FormState type
  const [state, formAction] = useActionState<FormState, FormData>(createCardType, initialState);

  useEffect(() => {
    if (state.success && state.data) {
      toast({ title: "Éxito", description: state.message || "Tipo de tarjeta creado." }); // Fallback message
      onSuccess?.(state.data); // No type assertion needed now
      onOpenChange(false);
    } else if (!state.success && state.message && !state.fieldErrors) {
      // General error (not validation)
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
    // Validation errors are handled inline below inputs
  }, [state, toast, onSuccess, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Tipo de Tarjeta</DialogTitle>
          <DialogDescription>
            Añade un nuevo tipo de tarjeta global que estará disponible para asociar a bancos.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="space-y-4 py-4">
            {/* Name Input */}
            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ej: Visa Gold Crédito"
                required
                defaultValue={initialName}
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Type Select */}
            <div className="space-y-1">
              <Label htmlFor="type">Tipo</Label>
              <Select name="type" required>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                </SelectContent>
              </Select>
              {state.fieldErrors?.type && (
                <p className="text-xs text-destructive">{state.fieldErrors.type[0]}</p>
              )}
            </div>

            {/* Logo URL Input (Optional) */}
            <div className="space-y-1">
              <Label htmlFor="logoUrl">URL del Logo (Opcional)</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                placeholder="https://ejemplo.com/logo.png"
              />
              {state.fieldErrors?.logoUrl && (
                <p className="text-xs text-destructive">{state.fieldErrors.logoUrl[0]}</p>
              )}
            </div>

            {/* Display general form error if no field errors */}
            {!state.success && state.message && !state.fieldErrors && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
          </div>
          <DialogFooter className="mt-4">
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

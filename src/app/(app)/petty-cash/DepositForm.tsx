"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CreatePettyCashDepositState } from "@/types/action-states";
import { type CreatePettyCashDepositInput, createPettyCashDepositSchema } from "@/zod/PettyCashZod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Branch as PrismaBranch } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import React from "react";
import { useForm } from "react-hook-form";

const GENERAL_ACCOUNT_VALUE = "__general__";

interface DepositFormProps {
  onSubmitAction: (
    prevState: CreatePettyCashDepositState,
    formData: FormData,
  ) => Promise<CreatePettyCashDepositState>;
  onClose: () => void;
  organizationId: string;
  branches: PrismaBranch[];
}

type DepositFormValues = Omit<CreatePettyCashDepositInput, "organizationId"> & {
  branchId?: string | number;
};

const initialDepositState: CreatePettyCashDepositState = {
  status: "idle",
  message: "",
  errors: {},
};

const DepositForm = ({ onSubmitAction, onClose, organizationId, branches }: DepositFormProps) => {
  const { toast } = useToast();

  const [state, formAction, isPending] = useActionState(onSubmitAction, initialDepositState);

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(createPettyCashDepositSchema),
    defaultValues: {
      description: "Depósito inicial de caja chica",
      amount: 0,
      date: new Date(),
      reference: "",
      branchId: GENERAL_ACCOUNT_VALUE,
    },
  });

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Éxito",
        description: state.message || "Depósito registrado correctamente.",
      });
      form.reset({
        description: "Depósito inicial de caja chica",
        amount: 0,
        date: new Date(),
        reference: "",
        branchId: GENERAL_ACCOUNT_VALUE,
      });
      onClose();
    } else if (state.status === "error") {
      toast({
        title: "Error al crear depósito",
        description: state.errors?._form?.join(", ") || state.message || "Ocurrió un error.",
        variant: "destructive",
      });
      form.clearErrors();
      if (state.errors) {
        for (const fieldKey in state.errors) {
          if (
            Object.prototype.hasOwnProperty.call(state.errors, fieldKey) &&
            fieldKey !== "_form"
          ) {
            const key = fieldKey as keyof DepositFormValues;
            const errorMessages = state.errors[key as keyof typeof state.errors];
            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              form.setError(key, {
                type: "server",
                message: errorMessages.join(", "),
              });
            }
          }
        }
      }
    }
  }, [state, toast, form, onClose]);

  const handleFormSubmit = async (values: DepositFormValues) => {
    const formData = new FormData();
    formData.append("description", values.description);
    formData.append("amount", values.amount.toString());
    formData.append("date", values.date.toISOString().split("T")[0]);
    if (values.reference) formData.append("reference", values.reference);
    formData.append("organizationId", organizationId);

    if (values.branchId && values.branchId !== GENERAL_ACCOUNT_VALUE) {
      formData.append("branchId", values.branchId.toString());
    }

    React.startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Depósito</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Depósito inicial para gastos de oficina" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar a Caja</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString() || GENERAL_ACCOUNT_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Caja" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GENERAL_ACCOUNT_VALUE}>Cuenta General</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Transferencia #123, Factura #456"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field, fieldState, formState }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      {...field}
                      value={
                        field.value === 0 && !fieldState.isDirty && !formState.isSubmitted
                          ? ""
                          : String(field.value)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          field.onChange(0);
                        } else {
                          const numericValue = Number.parseFloat(val);
                          field.onChange(Number.isNaN(numericValue) ? val : numericValue);
                        }
                      }}
                      onBlur={(e) => {
                        let numericValue = Number.parseFloat(String(field.value));
                        if (Number.isNaN(numericValue)) {
                          numericValue = 0;
                        } else if (numericValue < 100 && numericValue !== 0) {
                          numericValue = 100;
                        }
                        field.onChange(numericValue);
                        if (field.onBlur) {
                          field.onBlur();
                        }
                      }}
                      min="100"
                      step="100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del Depósito</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        const dateValue = e.target.valueAsDate;
                        if (dateValue) {
                          const localDate = new Date(
                            dateValue.getFullYear(),
                            dateValue.getMonth(),
                            dateValue.getDate() + 1,
                          );
                          field.onChange(localDate);
                        } else {
                          field.onChange(null);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({
                      description: "Depósito inicial de caja chica",
                      amount: 0,
                      date: new Date(),
                      reference: "",
                      branchId: GENERAL_ACCOUNT_VALUE,
                    });
                    onClose();
                  }}
                  aria-label="Cancelar"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} aria-label="Confirmar Depósito">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  "Confirmar Depósito"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositForm;

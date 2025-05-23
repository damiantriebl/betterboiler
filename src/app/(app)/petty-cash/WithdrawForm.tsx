"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPettyCashWithdrawalSchema } from "@/zod/PettyCashZod";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { CreatePettyCashWithdrawalState } from "@/types/action-states";
import React from "react";

interface User {
  id: string;
  name: string;
}

interface WithdrawFormProps {
  depositId: string | null;
  onSubmitAction: (
    prevState: CreatePettyCashWithdrawalState,
    formData: FormData,
  ) => Promise<CreatePettyCashWithdrawalState>;
  onClose: () => void;
  users: User[];
  organizationId: string;
}

type WithdrawFormValues = {
  userId: string;
  amountGiven: number;
  date: Date;
  description?: string | null;
};

const initialWithdrawalState: CreatePettyCashWithdrawalState = {
  status: "idle",
  message: "",
  errors: {},
};

const WithdrawForm = ({
  depositId,
  onSubmitAction,
  onClose,
  users,
  organizationId,
}: WithdrawFormProps) => {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(onSubmitAction, initialWithdrawalState);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(
      createPettyCashWithdrawalSchema.pick({
        userId: true,
        amountGiven: true,
        date: true,
        description: true,
      }),
    ),
    defaultValues: {
      userId: users.length > 0 ? users[0].id : undefined,
      amountGiven: 0,
      date: new Date(),
      description: "",
    },
  });

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Éxito",
        description: state.message || "Retiro registrado correctamente.",
      });
      form.reset();
      onClose();
    } else if (state.status === "error") {
      toast({
        title: "Error al registrar retiro",
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
            const key = fieldKey as keyof WithdrawFormValues;
            if (key in form.getValues()) {
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
    }
  }, [state, toast, form, onClose]);

  const handleFormSubmit = async (values: WithdrawFormValues) => {
    const selectedUser = users.find((u) => u.id === values.userId);
    if (!selectedUser) {
      toast({
        title: "Error de validación",
        description: "Usuario seleccionado no encontrado. Por favor, seleccione un usuario válido.",
        variant: "destructive",
      });
      form.setError("userId", { type: "manual", message: "Usuario no válido" });
      return;
    }

    const formData = new FormData();
    if (depositId) formData.append("depositId", depositId);
    formData.append("userId", values.userId);
    formData.append("userName", selectedUser.name);
    formData.append("amountGiven", values.amountGiven.toString());
    formData.append("date", values.date.toISOString().split("T")[0]);
    if (values.description) formData.append("description", values.description);
    formData.append("organizationId", organizationId);

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
          <DialogTitle>Registrar Retiro de Caja Chica</DialogTitle>
          <DialogDescription>
            Seleccione el beneficiario e ingrese el monto y la fecha del retiro.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiario</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={users.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            users.length === 0
                              ? "No hay usuarios disponibles"
                              : "Seleccionar beneficiario"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Compra de suministros, viáticos"
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
              name="amountGiven"
              render={({ field, fieldState, formState }) => (
                <FormItem>
                  <FormLabel>Monto a Retirar</FormLabel>
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
                  <FormLabel>Fecha del Retiro</FormLabel>
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
                    form.reset();
                    onClose();
                  }}
                  aria-label="Cancelar"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending || !form.formState.isValid}
                aria-label="Confirmar Retiro"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  "Confirmar Retiro"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawForm;

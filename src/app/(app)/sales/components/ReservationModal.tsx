"use client";

import { getOrganizationPaymentMethods } from "@/actions/payment-methods/get-payment-methods";
import { createReservation } from "@/actions/sales/create-reservation";
import { getOrganizationIdFromSession } from "@/actions/util";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import type { OrganizationPaymentMethodDisplay } from "@/types/payment-methods";
import { type CreateReservationInput, createReservationSchema } from "@/zod/ReservationZod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Client } from "@prisma/client";
import { BookmarkPlus, Calendar, CreditCard, DollarSign, Loader2, User } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  motorcycle: MotorcycleWithFullDetails | null;
  clients: Client[];
}

export function ReservationModal({
  isOpen,
  onClose,
  onSuccess,
  motorcycle,
  clients,
}: ReservationModalProps) {
  const [isPending, startTransition] = useTransition();
  const [paymentMethods, setPaymentMethods] = useState<OrganizationPaymentMethodDisplay[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      motorcycleId: 0,
      clientId: "",
      amount: 0,
      currency: "ARS",
      expirationDate: null,
      paymentMethod: "",
      notes: "",
    },
  });

  const watchedCurrency = watch("currency");

  // Actualizar el formulario cuando cambie la motocicleta
  useEffect(() => {
    if (motorcycle && isOpen) {
      console.log("🔄 Updating form with motorcycle:", motorcycle.id);
      setValue("motorcycleId", motorcycle.id);
      setValue("currency", motorcycle.currency as "USD" | "ARS");
    }
  }, [motorcycle, isOpen, setValue]);

  // Cargar métodos de pago cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setIsLoadingPaymentMethods(true);

      const loadPaymentMethods = async () => {
        try {
          const orgResult = await getOrganizationIdFromSession();
          if (!orgResult.organizationId) {
            throw new Error("No se pudo obtener el ID de la organización");
          }

          const methods = await getOrganizationPaymentMethods(orgResult.organizationId);
          setPaymentMethods(methods.filter((method) => method.isEnabled));
        } catch (error) {
          console.error("Error loading payment methods:", error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los métodos de pago.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingPaymentMethods(false);
        }
      };

      loadPaymentMethods();
    }
  }, [isOpen, toast]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: CreateReservationInput) => {
    console.log("🚀 onSubmit called with data:", data);

    if (!motorcycle) {
      console.error("❌ No motorcycle available");
      toast({
        title: "Error",
        description: "No se ha seleccionado una motocicleta.",
        variant: "destructive",
      });
      return;
    }

    if (!data.motorcycleId || data.motorcycleId <= 0) {
      console.error("❌ Invalid motorcycleId:", data.motorcycleId);
      toast({
        title: "Error",
        description: "ID de motocicleta inválido.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ Starting reservation creation for motorcycle:", motorcycle.id);

    startTransition(async () => {
      try {
        console.log("🔄 Processing data...");

        // Convertir string de fecha a Date object si existe
        const processedData = {
          ...data,
          motorcycleId: motorcycle.id, // Usar directamente el ID de la moto
          expirationDate: data.expirationDate
            ? new Date(data.expirationDate as unknown as string)
            : null,
        };

        console.log("📤 Sending processed data:", processedData);

        const result = await createReservation(processedData);

        console.log("📥 Received result:", result);

        if (result.success) {
          console.log("✅ Reservation created successfully");
          toast({
            title: "Reserva creada exitosamente",
            description: `La motocicleta ${motorcycle.brand?.name} ${motorcycle.model?.name} ha sido reservada.`,
          });
          handleClose();
          onSuccess();
        } else {
          console.error("❌ Reservation creation failed:", result.error);
          toast({
            title: "Error al crear la reserva",
            description: result.error || "Ha ocurrido un error inesperado.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("💥 Exception in reservation creation:", error);
        toast({
          title: "Error",
          description: "Ha ocurrido un error al crear la reserva.",
          variant: "destructive",
        });
      }
    });
  };

  if (!motorcycle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5 text-blue-600" />
            Crear Reserva de Motocicleta
          </DialogTitle>
          <DialogDescription>
            Complete los datos para reservar la motocicleta seleccionada.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log("❌ Form validation errors:", errors);
            toast({
              title: "Error de validación",
              description: "Por favor, revise los campos requeridos.",
              variant: "destructive",
            });
          })}
          className="space-y-6"
        >
          {/* Campo oculto para motorcycleId */}
          <input type="hidden" {...register("motorcycleId")} value={motorcycle?.id || 0} />

          {/* Información de la motocicleta */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4" />
              Motocicleta Seleccionada
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Marca/Modelo:</span> {motorcycle.brand?.name}{" "}
                {motorcycle.model?.name}
              </div>
              <div>
                <span className="font-medium">Año:</span> {motorcycle.year}
              </div>
              <div>
                <span className="font-medium">Color:</span> {motorcycle.color?.name || "N/A"}
              </div>
              <div>
                <span className="font-medium">Precio:</span>{" "}
                {formatPrice(motorcycle.retailPrice, motorcycle.currency)}
              </div>
              <div>
                <span className="font-medium">Chasis:</span> {motorcycle.chassisNumber}
              </div>
              <div>
                <span className="font-medium">Sucursal:</span> {motorcycle.branch?.name || "N/A"}
              </div>
            </div>
          </div>

          {/* Selección de cliente */}
          <div className="space-y-2">
            <Label htmlFor="clientId" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente *
            </Label>
            <Select
              value={watch("clientId")}
              onValueChange={(value) => setValue("clientId", value)}
            >
              <SelectTrigger id="clientId">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} - {client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-sm text-red-500">{errors.clientId.message}</p>}
          </div>

          {/* Monto y moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monto de la Reserva *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", {
                  valueAsNumber: true,
                  setValueAs: (value) => {
                    // Convertir a número y eliminar ceros a la izquierda
                    const num = Number.parseFloat(value);
                    return Number.isNaN(num) ? 0 : num;
                  },
                })}
                onBlur={(e) => {
                  // Formatear el valor al perder el foco
                  const value = Number.parseFloat(e.target.value);
                  if (!Number.isNaN(value)) {
                    e.target.value = value.toString();
                    setValue("amount", value);
                  }
                }}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda *</Label>
              <Select
                value={watchedCurrency}
                onValueChange={(value) => setValue("currency", value as "USD" | "ARS")}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && <p className="text-sm text-red-500">{errors.currency.message}</p>}
            </div>
          </div>

          {/* Fecha de expiración */}
          <div className="space-y-2">
            <Label htmlFor="expirationDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha de Expiración (Opcional)
            </Label>
            <Input id="expirationDate" type="date" {...register("expirationDate")} />
            {errors.expirationDate && (
              <p className="text-sm text-red-500">{errors.expirationDate.message}</p>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Método de Pago (Opcional)
            </Label>
            {isLoadingPaymentMethods ? (
              <div className="text-sm text-muted-foreground">Cargando métodos de pago...</div>
            ) : (
              <Select
                value={watch("paymentMethod") || ""}
                onValueChange={(value) => setValue("paymentMethod", value)}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Seleccionar método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.card.name}>
                      {method.card.name}
                    </SelectItem>
                  ))}
                  {paymentMethods.length === 0 && (
                    <SelectItem value="" disabled>
                      No hay métodos de pago configurados
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Comentarios adicionales sobre la reserva..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-[120px]">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Crear Reserva
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

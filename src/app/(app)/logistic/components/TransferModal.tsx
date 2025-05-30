"use client";

import { createMotorcycleTransfer } from "@/actions/logistics/motorcycle-transfers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { useTransferPDF } from "@/hooks/use-transfer-pdf";
import { formatPrice } from "@/lib/utils";
import type { MotorcycleForTransfer } from "@/types/logistics";
import { type MotorcycleTransferFormOnlyData, motorcycleTransferFormSchema } from "@/zod/logistics";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Branch, LogisticProvider } from "@prisma/client";
import { Calendar, MapPin, Truck, User } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  motorcycles: MotorcycleForTransfer[];
  fromBranchId: number | null;
  toBranchId: number | null;
  branches: Branch[];
  logisticProviders: LogisticProvider[];
}

export default function TransferModal({
  isOpen,
  onClose,
  onSuccess,
  motorcycles,
  fromBranchId,
  toBranchId,
  branches,
  logisticProviders,
}: TransferModalProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { generateAndDownloadPDF } = useTransferPDF();

  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [cost, setCost] = useState<number | undefined>();
  const [currency, setCurrency] = useState("ARS");

  // Determinar la sucursal de origen automáticamente desde las motocicletas
  const actualFromBranchId = motorcycles.length > 0 ? motorcycles[0].branch?.id : null;

  // Verificar que todas las motocicletas sean de la misma sucursal
  const allFromSameBranch =
    motorcycles.length > 0 && motorcycles.every((m) => m.branch?.id === actualFromBranchId);

  // Obtener todas las sucursales de origen únicas
  const uniqueFromBranches = Array.from(
    new Set(motorcycles.map((m) => m.branch?.id).filter(Boolean)),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<MotorcycleTransferFormOnlyData>({
    resolver: zodResolver(motorcycleTransferFormSchema),
    defaultValues: {
      fromBranchId: actualFromBranchId || 0,
      toBranchId: toBranchId || 0,
      logisticProviderId: undefined,
      notes: "",
    },
  });

  // Actualizar valores del formulario cuando cambien las props o motocicletas
  useEffect(() => {
    console.log("🔍 useEffect - Actualizando valores del formulario");
    console.log("🔍 actualFromBranchId:", actualFromBranchId, "tipo:", typeof actualFromBranchId);
    console.log("🔍 toBranchId:", toBranchId, "tipo:", typeof toBranchId);

    if (actualFromBranchId && actualFromBranchId > 0) {
      setValue("fromBranchId", actualFromBranchId, { shouldValidate: true });
      console.log("🔍 setValue fromBranchId:", actualFromBranchId);
    }
    if (toBranchId && toBranchId > 0) {
      setValue("toBranchId", toBranchId, { shouldValidate: true });
      console.log("🔍 setValue toBranchId:", toBranchId);
    }
  }, [actualFromBranchId, toBranchId, setValue]);

  // Resetear formulario cuando se abra el modal
  useEffect(() => {
    if (isOpen) {
      console.log("🔍 Modal abierto - reseteando formulario");
      reset({
        fromBranchId: actualFromBranchId || 0,
        toBranchId: toBranchId || 0,
        logisticProviderId: undefined,
        notes: "",
      });
    }
  }, [isOpen, actualFromBranchId, toBranchId, reset]);

  // Log para verificar errores de validación
  console.log("🔍 Errores de validación completos:", errors);
  console.log("🔍 Errores individuales:");
  for (const key of Object.keys(errors)) {
    console.log(`🔍 ${key}:`, errors[key as keyof typeof errors]);
  }
  console.log("🔍 fromBranchId:", fromBranchId);
  console.log("🔍 toBranchId:", toBranchId);
  console.log("🔍 motorcycles length:", motorcycles.length);

  const selectedLogisticProvider = watch("logisticProviderId");

  const fromBranch = branches.find((b) => b.id === actualFromBranchId);
  const toBranch = branches.find((b) => b.id === toBranchId);

  console.log("🔍 Sucursales determinadas:");
  console.log("🔍 actualFromBranchId:", actualFromBranchId);
  console.log("🔍 allFromSameBranch:", allFromSameBranch);
  console.log("🔍 fromBranch:", fromBranch?.name);
  console.log("🔍 toBranch:", toBranch?.name);

  // Log para verificar valores actuales del formulario
  const currentFormValues = watch();
  console.log("🔍 Valores actuales del formulario:", currentFormValues);
  console.log("🔍 Valores de props:");
  console.log("🔍 fromBranchId (prop):", fromBranchId, "tipo:", typeof fromBranchId);
  console.log("🔍 toBranchId (prop):", toBranchId, "tipo:", typeof toBranchId);
  console.log(
    "🔍 fromBranchId (form):",
    currentFormValues.fromBranchId,
    "tipo:",
    typeof currentFormValues.fromBranchId,
  );
  console.log(
    "🔍 toBranchId (form):",
    currentFormValues.toBranchId,
    "tipo:",
    typeof currentFormValues.toBranchId,
  );

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: MotorcycleTransferFormOnlyData) => {
    console.log("🚀 onSubmit llamado con data:", data);
    console.log("🚀 motorcycles:", motorcycles);
    console.log("🚀 fromBranchId (prop):", fromBranchId, "tipo:", typeof fromBranchId);
    console.log("🚀 toBranchId (prop):", toBranchId, "tipo:", typeof toBranchId);
    console.log("🚀 fromBranchId (form):", data.fromBranchId, "tipo:", typeof data.fromBranchId);
    console.log("🚀 toBranchId (form):", data.toBranchId, "tipo:", typeof data.toBranchId);
    console.log("🚀 estimatedDeliveryDate:", estimatedDeliveryDate);
    console.log("🚀 selectedLogisticProvider:", selectedLogisticProvider);
    console.log("🚀 Validando datos antes de enviar...");

    // Usar el toBranchId de las props o del formulario
    const finalToBranchId = data.toBranchId && data.toBranchId > 0 ? data.toBranchId : toBranchId;

    console.log("🚀 Valores finales:", { finalToBranchId, uniqueFromBranches });

    // Verificar que tenemos los datos mínimos requeridos
    if (!finalToBranchId || finalToBranchId <= 0) {
      console.error("❌ Falta sucursal de destino:", {
        finalToBranchId,
        dataToBranchId: data.toBranchId,
        propToBranchId: toBranchId,
      });
      toast({
        title: "Error de validación",
        description: "Debe seleccionar una sucursal de destino",
        variant: "destructive",
      });
      return;
    }

    // Verificar que todas las motocicletas tengan sucursal de origen
    const motosWithoutBranch = motorcycles.filter((m) => !m.branch?.id);
    if (motosWithoutBranch.length > 0) {
      console.error("❌ Motocicletas sin sucursal:", motosWithoutBranch);
      toast({
        title: "Error de validación",
        description: `${motosWithoutBranch.length} motocicleta(s) no tienen sucursal de origen asignada`,
        variant: "destructive",
      });
      return;
    }

    if (motorcycles.length === 0) {
      console.error("❌ No hay motocicletas seleccionadas");
      toast({
        title: "Error de validación",
        description: "Debe seleccionar al menos una motocicleta",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      console.log("🚀 Iniciando transición...");
      try {
        // Crear una transferencia por cada motocicleta usando su sucursal específica
        const transferPromises = motorcycles.map((motorcycle) => {
          // Usar la sucursal específica de cada motocicleta como origen
          const motorcycleFromBranchId = motorcycle.branch?.id;

          if (!motorcycleFromBranchId) {
            throw new Error(
              `La motocicleta ${motorcycle.chassisNumber} no tiene sucursal asignada`,
            );
          }

          // Crear los datos de transferencia SIN motorcycleId en el objeto base
          // porque lo vamos a agregar específicamente para cada moto
          const baseTransferData = {
            fromBranchId: motorcycleFromBranchId, // Usar la sucursal específica de la moto
            toBranchId: finalToBranchId,
            logisticProviderId: data.logisticProviderId,
            notes: data.notes || "",
            scheduledPickupDate: estimatedDeliveryDate
              ? new Date(estimatedDeliveryDate)
              : undefined,
          };

          // Agregar el motorcycleId específico para esta moto
          const transferData = {
            ...baseTransferData,
            motorcycleId: motorcycle.id, // Asegurar que sea el ID correcto
          };

          console.log(
            "🚀 Creando transferencia para moto:",
            motorcycle.chassisNumber,
            "desde sucursal:",
            motorcycle.branch?.name,
            "con data:",
            transferData,
          );
          console.log("🚀 Tipo de motorcycle.id:", typeof motorcycle.id, "valor:", motorcycle.id);

          return createMotorcycleTransfer(transferData);
        });

        console.log("🚀 Ejecutando Promise.all con", transferPromises.length, "promesas");
        const results = await Promise.all(transferPromises);
        console.log("🚀 Resultados de transferencias:", results);

        // Verificar si todas las transferencias fueron exitosas
        const failedTransfers = results.filter((result) => !result.success);
        console.log("🚀 Transferencias fallidas:", failedTransfers);

        if (failedTransfers.length > 0) {
          console.log("❌ Algunas transferencias fallaron");
          toast({
            title: "Error en algunas transferencias",
            description: `${failedTransfers.length} de ${results.length} transferencias fallaron. Error: ${failedTransfers[0].error}`,
            variant: "destructive",
          });
          return;
        }

        console.log("✅ Todas las transferencias exitosas");

        // Generar PDFs para todas las transferencias creadas
        const successfulTransfers = results.filter((result) => result.success && result.transfer);
        console.log("📄 Generando PDFs para", successfulTransfers.length, "transferencias");

        // Generar PDFs en paralelo (sin esperar a que terminen para no bloquear la UI)
        for (const result of successfulTransfers) {
          if (result.transfer) {
            generateAndDownloadPDF(result.transfer.id).catch((error) => {
              console.error("Error al generar PDF de transferencia:", error);
              // Toast de error opcional, pero sin bloquear el flujo principal
              toast({
                title: "Advertencia",
                description: "Error al generar el PDF de la transferencia",
                variant: "destructive",
              });
            });
          }
        }

        toast({
          title: "Transferencias creadas",
          description: `Se crearon ${results.length} transferencia${results.length !== 1 ? "s" : ""} exitosamente. Los PDFs se están generando automáticamente.`,
        });

        // Cerrar modal y notificar éxito para actualizar la UI
        onSuccess();
      } catch (error) {
        console.error("❌ Error creando transferencias:", error);
        toast({
          title: "Error",
          description: "Error al crear las transferencias. Inténtelo nuevamente.",
          variant: "destructive",
        });
      }
    });
  };

  // Handler para errores de validación
  const onError = (errors: any) => {
    console.log("❌ Errores de validación en submit:", errors);
    console.log("❌ Detalles de errores:");
    for (const key of Object.keys(errors)) {
      console.log(`❌ ${key}:`, errors[key]);
    }

    // Mostrar el primer error al usuario
    const firstError = Object.values(errors)[0] as any;
    toast({
      title: "Error de validación",
      description: firstError?.message || "Hay errores en el formulario",
      variant: "destructive",
    });
  };

  // Calcular fecha mínima (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  console.log("🔍 Renderizando TransferModal con:", {
    isOpen,
    motorcycles: motorcycles.length,
    fromBranchId,
    toBranchId,
    logisticProviders: logisticProviders.length,
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Nueva Transferencia de Motocicletas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
          {/* Campos ocultos para asegurar que los valores se registren */}
          <input type="hidden" {...register("fromBranchId", { valueAsNumber: true })} />
          <input type="hidden" {...register("toBranchId", { valueAsNumber: true })} />

          {/* Advertencia si las motocicletas son de diferentes sucursales */}
          {!allFromSameBranch && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <span className="text-lg">⚠️</span>
                <p className="font-medium">Advertencia: Motocicletas de diferentes sucursales</p>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Las motocicletas seleccionadas pertenecen a diferentes sucursales. Se crearán
                transferencias separadas para cada sucursal de origen.
              </p>
            </div>
          )}

          {/* Resumen de transferencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Origen
                </h3>
                {allFromSameBranch ? (
                  <>
                    <p className="text-lg">{fromBranch?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {motorcycles.length} motocicleta{motorcycles.length !== 1 ? "s" : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">Múltiples sucursales</p>
                    <p className="text-sm text-muted-foreground">
                      {uniqueFromBranches.length} sucursal
                      {uniqueFromBranches.length !== 1 ? "es" : ""} de origen
                    </p>
                    <div className="mt-2 space-y-1">
                      {uniqueFromBranches.map((branchId) => {
                        const branch = branches.find((b) => b.id === branchId);
                        const count = motorcycles.filter((m) => m.branch?.id === branchId).length;
                        return (
                          <div key={branchId} className="text-xs text-muted-foreground">
                            • {branch?.name}: {count} moto{count !== 1 ? "s" : ""}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Destino
                </h3>
                <p className="text-lg">{toBranch?.name}</p>
                <Badge variant="secondary">Transferencia pendiente</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Lista de motocicletas */}
          <div>
            <h3 className="font-semibold mb-3">Motocicletas a transferir:</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {motorcycles.map((motorcycle) => (
                <div
                  key={motorcycle.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {motorcycle.brand?.name} {motorcycle.model?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Chasis: {motorcycle.chassisNumber} • Año: {motorcycle.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatPrice(motorcycle.retailPrice, motorcycle.currency)}
                    </p>
                    <Badge variant="outline">{motorcycle.state}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario de transferencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proveedor de logística */}
            <div className="space-y-2">
              <Label htmlFor="logisticProviderId">Proveedor de Logística *</Label>
              <Select
                value={selectedLogisticProvider?.toString() || undefined}
                onValueChange={(value) => setValue("logisticProviderId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {logisticProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.logisticProviderId && (
                <p className="text-sm text-red-500">{errors.logisticProviderId.message}</p>
              )}
            </div>

            {/* Fecha estimada de entrega */}
            <div className="space-y-2">
              <Label htmlFor="estimatedDeliveryDate">Fecha Estimada de Entrega</Label>
              <Input
                type="date"
                min={minDate}
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              />
            </div>

            {/* Costo */}
            <div className="space-y-2">
              <Label htmlFor="cost">Costo del Transporte</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cost || ""}
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS (Pesos Argentinos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                  <SelectItem value="EUR">EUR (Euros)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              placeholder="Instrucciones especiales, contactos, horarios de entrega, etc."
              rows={3}
              {...register("notes")}
            />
            {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
          </div>

          {/* Información del proveedor seleccionado */}
          {selectedLogisticProvider && (
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Información del Proveedor</h4>
                {(() => {
                  const provider = logisticProviders.find((p) => p.id === selectedLogisticProvider);
                  if (!provider) return null;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Nombre:</strong> {provider.name}
                        </p>
                        {provider.contactName && (
                          <p>
                            <strong>Contacto:</strong> {provider.contactName}
                          </p>
                        )}
                        {provider.contactPhone && (
                          <p>
                            <strong>Teléfono:</strong> {provider.contactPhone}
                          </p>
                        )}
                      </div>
                      <div>
                        {provider.contactEmail && (
                          <p>
                            <strong>Email:</strong> {provider.contactEmail}
                          </p>
                        )}
                        {provider.pricePerKm && (
                          <p>
                            <strong>Precio por km:</strong>{" "}
                            {formatPrice(provider.pricePerKm, provider.currency)}
                          </p>
                        )}
                        {provider.baseFee && (
                          <p>
                            <strong>Tarifa base:</strong>{" "}
                            {formatPrice(provider.baseFee, provider.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              onClick={() => {
                console.log("🔍 Click en botón submit");
                console.log("🔍 Estado del formulario:", {
                  errors,
                  values: watch(),
                  isValid: Object.keys(errors).length === 0,
                });
              }}
            >
              {isPending
                ? "Creando..."
                : `Crear ${motorcycles.length} Transferencia${motorcycles.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

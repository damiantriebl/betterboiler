"use client";

import { createLogisticProvider } from "@/actions/logistics/logistic-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  COVERAGE_ZONES,
  PROVIDER_STATUS_OPTIONS,
  TRANSPORT_TYPES,
  VEHICLE_TYPES,
} from "@/types/logistics";
import { type LogisticProviderFormData, logisticProviderSchema } from "@/zod/logistics";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Truck, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

interface LogisticProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogisticProviderModal({
  isOpen,
  onClose,
  onSuccess,
}: LogisticProviderModalProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LogisticProviderFormData>({
    resolver: zodResolver(logisticProviderSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      transportTypes: [],
      vehicleTypes: [],
      coverageZones: [],
      pricePerKm: undefined,
      baseFee: undefined,
      currency: "ARS",
      insurance: false,
      maxWeight: undefined,
      maxVolume: undefined,
      notes: "",
      status: "activo",
    },
  });

  const watchedFields = watch([
    "transportTypes",
    "vehicleTypes",
    "coverageZones",
    "insurance",
    "currency",
  ]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: LogisticProviderFormData) => {
    startTransition(async () => {
      try {
        const result = await createLogisticProvider(data);

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Error al crear el proveedor",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Proveedor creado",
          description: `El proveedor "${data.name}" ha sido creado exitosamente.`,
        });

        onSuccess();
      } catch (error) {
        console.error("Error creando proveedor:", error);
        toast({
          title: "Error",
          description: "Error al crear el proveedor. Inténtelo nuevamente.",
          variant: "destructive",
        });
      }
    });
  };

  // Funciones para manejar arrays
  const handleArrayChange = (
    fieldName: "transportTypes" | "vehicleTypes" | "coverageZones",
    value: string,
    checked: boolean,
  ) => {
    const currentValues = watch(fieldName) || [];
    if (checked) {
      setValue(fieldName, [...currentValues, value] as any);
    } else {
      setValue(fieldName, currentValues.filter((v) => v !== value) as any);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nuevo Proveedor de Logística
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Información Básica</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa *</Label>
                  <Input placeholder="Ej. Transportes Rápidos SA" {...register("name")} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={watch("status") || undefined}
                    onValueChange={(value) => setValue("status", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactName">Nombre del Contacto</Label>
                  <Input placeholder="Ej. Juan Pérez" {...register("contactName")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Teléfono</Label>
                  <Input placeholder="Ej. +54 11 1234-5678" {...register("contactPhone")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    type="email"
                    placeholder="contacto@empresa.com"
                    {...register("contactEmail")}
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-red-500">{errors.contactEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input placeholder="Dirección completa" {...register("address")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Servicios y capacidades */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Servicios y Capacidades</h3>

              {/* Tipos de transporte */}
              <div className="space-y-2">
                <Label>Tipos de Transporte *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TRANSPORT_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        checked={watchedFields[0]?.includes(type)}
                        onCheckedChange={(checked) =>
                          handleArrayChange("transportTypes", type, checked as boolean)
                        }
                      />
                      <Label className="text-sm">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.transportTypes && (
                  <p className="text-sm text-red-500">{errors.transportTypes.message}</p>
                )}
              </div>

              {/* Tipos de vehículos */}
              <div className="space-y-2">
                <Label>Tipos de Vehículos *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        checked={watchedFields[1]?.includes(type)}
                        onCheckedChange={(checked) =>
                          handleArrayChange("vehicleTypes", type, checked as boolean)
                        }
                      />
                      <Label className="text-sm">
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.vehicleTypes && (
                  <p className="text-sm text-red-500">{errors.vehicleTypes.message}</p>
                )}
              </div>

              {/* Zonas de cobertura */}
              <div className="space-y-2">
                <Label>Zonas de Cobertura *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COVERAGE_ZONES.map((zone) => (
                    <div key={zone} className="flex items-center space-x-2">
                      <Checkbox
                        checked={watchedFields[2]?.includes(zone)}
                        onCheckedChange={(checked) =>
                          handleArrayChange("coverageZones", zone, checked as boolean)
                        }
                      />
                      <Label className="text-sm">
                        {zone.charAt(0).toUpperCase() + zone.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.coverageZones && (
                  <p className="text-sm text-red-500">{errors.coverageZones.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tarifas y capacidades */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Tarifas y Capacidades</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">Precio por Kilómetro</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("pricePerKm", { valueAsNumber: true })}
                  />
                  {errors.pricePerKm && (
                    <p className="text-sm text-red-500">{errors.pricePerKm.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseFee">Tarifa Base</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("baseFee", { valueAsNumber: true })}
                  />
                  {errors.baseFee && (
                    <p className="text-sm text-red-500">{errors.baseFee.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={watch("currency") || undefined}
                    onValueChange={(value) => setValue("currency", value)}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="maxWeight">Peso Máximo (kg)</Label>
                  <Input
                    type="number"
                    placeholder="Ej. 5000"
                    {...register("maxWeight", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxVolume">Volumen Máximo (m³)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 50.5"
                    {...register("maxVolume", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={watchedFields[3]}
                  onCheckedChange={(checked) => setValue("insurance", checked as boolean)}
                />
                <Label>Incluye Seguro de Transporte</Label>
              </div>
            </CardContent>
          </Card>

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              placeholder="Información adicional sobre el proveedor, requisitos especiales, etc."
              rows={3}
              {...register("notes")}
            />
          </div>

          {/* Resumen */}
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Resumen del Proveedor</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Tipos de Transporte:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {watchedFields[0]?.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p>
                    <strong>Vehículos:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {watchedFields[1]?.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p>
                    <strong>Cobertura:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {watchedFields[2]?.map((zone) => (
                      <Badge key={zone} variant="secondary" className="text-xs">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

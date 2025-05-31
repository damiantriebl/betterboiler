"use client";

import { createSupplier, updateSupplier } from "@/actions/suppliers/suppliers-unified";
import LoadingButton from "@/components/custom/LoadingButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { type SupplierFormData, supplierSchema } from "@/zod/SuppliersZod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Supplier } from "@prisma/client";
import React, { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { AdicionalSection } from "./form-sections/AdicionalSection";
import { BancariaSection } from "./form-sections/BancariaSection";
import { ComercialSection } from "./form-sections/ComercialSection";
import { ContactoSection } from "./form-sections/ContactoSection";
import { DireccionesSection } from "./form-sections/DireccionesSection";
import { FiscalSection } from "./form-sections/FiscalSection";
import { IdentificacionSection } from "./form-sections/IdentificacionSection";
import { LogisticaSection } from "./form-sections/LogisticaSection";

interface SupplierFormProps {
  onSuccess?: (data: SupplierFormData) => void;
  onCancel?: () => void;
  initialData?: Supplier | null;
  supplierId?: number | null;
}

// Helper function para asegurar que el valor esté en el enum o devolver un default
const ensureEnumOrDefault = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
  defaultValue: T,
): T => {
  if (value && allowedValues.includes(value as T)) {
    return value as T;
  }
  return defaultValue;
};

// Obtener los valores permitidos de los enums Zod para usarlos en la comprobación
const allowedVatConditions = supplierSchema.shape.vatCondition._def.values;
const allowedVoucherTypes = supplierSchema.shape.voucherType._def.values;
const allowedStatuses = supplierSchema.shape.status._def.innerType._def.values; // Acceder a innerType

const prepareDefaultValues = (data: Supplier | null): SupplierFormData => {
  if (!data) {
    return {
      legalName: "",
      commercialName: "",
      taxIdentification: "",
      vatCondition: "Responsable Inscripto",
      voucherType: "Factura A",
      grossIncome: "",
      localTaxRegistration: "",
      contactName: "",
      contactPosition: "",
      landlineNumber: "",
      mobileNumber: "",
      email: "",
      website: "",
      legalAddress: "",
      commercialAddress: "",
      deliveryAddress: "",
      bank: "",
      accountTypeNumber: "",
      cbu: "",
      bankAlias: "",
      swiftBic: "",
      paymentCurrency: "ARS",
      paymentMethods: [],
      paymentTermDays: null,
      discountsConditions: "",
      creditLimit: null,
      returnPolicy: "",
      shippingMethods: "",
      shippingCosts: "",
      deliveryTimes: "",
      transportConditions: "",
      itemsCategories: "",
      certifications: "",
      commercialReferences: "",
      status: "activo",
      notesObservations: "",
    };
  }
  // Valores por defecto para EDICIÓN (basados en initialData)
  return {
    legalName: data.legalName,
    commercialName: data.commercialName ?? "",
    taxIdentification: data.taxIdentification,
    vatCondition: ensureEnumOrDefault(
      data.vatCondition,
      allowedVatConditions,
      "Responsable Inscripto",
    ),
    voucherType: ensureEnumOrDefault(data.voucherType, allowedVoucherTypes, "Factura A"),
    grossIncome: data.grossIncome ?? "",
    localTaxRegistration: data.localTaxRegistration ?? "",
    contactName: data.contactName ?? "",
    contactPosition: data.contactPosition ?? "",
    landlineNumber: data.landlineNumber ?? "",
    mobileNumber: data.mobileNumber ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    legalAddress: data.legalAddress ?? "",
    commercialAddress: data.commercialAddress ?? "",
    deliveryAddress: data.deliveryAddress ?? "",
    bank: data.bank ?? "",
    accountTypeNumber: data.accountTypeNumber ?? "",
    cbu: data.cbu ?? "",
    bankAlias: data.bankAlias ?? "",
    swiftBic: data.swiftBic ?? "",
    paymentCurrency: data.paymentCurrency ?? "ARS",
    paymentMethods: data.paymentMethods ?? [],
    paymentTermDays: data.paymentTermDays,
    discountsConditions: data.discountsConditions ?? "",
    creditLimit: data.creditLimit,
    returnPolicy: data.returnPolicy ?? "",
    shippingMethods: data.shippingMethods ?? "",
    shippingCosts: data.shippingCosts ?? "",
    deliveryTimes: data.deliveryTimes ?? "",
    transportConditions: data.transportConditions ?? "",
    itemsCategories: data.itemsCategories ?? "",
    certifications: data.certifications ?? "",
    commercialReferences: data.commercialReferences ?? "",
    status: ensureEnumOrDefault(data.status, allowedStatuses, "activo"),
    notesObservations: data.notesObservations ?? "",
  };
};

export default function SupplierForm({
  onSuccess,
  onCancel,
  initialData,
  supplierId,
}: SupplierFormProps) {
  const [isPending, startTransition] = useTransition(); // Hook para manejar estado pendiente
  const isEditing = !!supplierId; // ✅ Detecta automáticamente si es edición

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: prepareDefaultValues(initialData ?? null),
  });

  useEffect(() => {
    form.reset(prepareDefaultValues(initialData ?? null));
  }, [initialData, form.reset]);

  function onSubmit(data: SupplierFormData) {
    startTransition(async () => {
      const result =
        isEditing && supplierId
          ? await updateSupplier(supplierId, data) // ✅ Actualizar existente
          : await createSupplier(data); // ✅ Crear nuevo

      if (result.success) {
        toast({
          title: isEditing ? "Proveedor Actualizado" : "Proveedor Guardado",
          description: `Se ${isEditing ? "actualizó" : "guardó"} el proveedor "${data.commercialName || data.legalName}".`,
        });
        if (onSuccess) {
          onSuccess(data); // Llamar al callback
        }
        if (!isEditing) {
          form.reset(); // Resetear solo si se está creando
        }
      } else {
        toast({
          variant: "destructive",
          title: isEditing ? "Error al actualizar" : "Error al guardar",
          description: result.error || "Ocurrió un error desconocido.",
        });
      }
    });
  }

  // Definir las pestañas
  const tabsConfig = [
    { value: "identificacion", label: "Identificación" },
    { value: "fiscal", label: "Datos Fiscales" },
    { value: "contacto", label: "Contacto" },
    { value: "direcciones", label: "Direcciones" },
    { value: "bancaria", label: "Info. Bancaria" },
    { value: "comercial", label: "Cond. Comerciales" },
    { value: "logistica", label: "Logística" },
    { value: "adicional", label: "Info. Adicional" },
  ];

  return (
    <Card className="w-full border-0 shadow-none">
      {/* Quitar bordes/sombra si está en modal */}
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}</CardTitle>
        {/* Podrías añadir una descripción si quieres */}
      </CardHeader>
      {/* Añadir scroll y padding si es necesario dentro de un modal */}
      <CardContent className="max-h-[70vh] overflow-y-auto p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="identificacion" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 mb-4">
                {tabsConfig.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* --- CONTENIDO DE CADA PESTAÑA --- */}

              {/* Pestaña Identificación */}
              <TabsContent value="identificacion">
                <IdentificacionSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Fiscal */}
              <TabsContent value="fiscal">
                <FiscalSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Contacto */}
              <TabsContent value="contacto">
                <ContactoSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Direcciones */}
              <TabsContent value="direcciones">
                <DireccionesSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Bancaria */}
              <TabsContent value="bancaria">
                <BancariaSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Comercial */}
              <TabsContent value="comercial">
                <ComercialSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Logística */}
              <TabsContent value="logistica">
                <LogisticaSection control={form.control} isSubmitting={isPending} />
              </TabsContent>

              {/* Pestaña Adicional */}
              <TabsContent value="adicional">
                <AdicionalSection control={form.control} isSubmitting={isPending} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              {/* Botón Cancelar */}
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                  Cancelar
                </Button>
              )}
              <LoadingButton pending={isPending}>
                {isEditing ? "Guardar Cambios" : "Guardar Proveedor"}
              </LoadingButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

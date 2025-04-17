"use client"; // Asegurarse de que es un Client Component por los hooks

import React, { useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supplierSchema, SupplierFormData } from "@/zod/SuppliersZod";
import { Button } from "@/components/ui/button";
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Importar Tabs
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingButton from "@/components/custom/LoadingButton"; // Asumo que tienes este componente
import { toast } from "@/hooks/use-toast"; // Añadir import para toast
import { createSupplier, updateSupplier } from '@/actions/suppliers/manage-suppliers'; // Importar ambas acciones
import { Supplier } from '@prisma/client'; // Importar tipo Supplier

interface SupplierFormProps {
    onSuccess?: (data: SupplierFormData) => void; // Use imported type
    onCancel?: () => void; // Para cerrar el modal
    initialData?: Supplier | null; // Hacer initialData opcional y permitir null
    supplierId?: number | null; // ID para saber si estamos editando
}

// Helper function para asegurar que el valor esté en el enum o devolver un default
const ensureEnumOrDefault = <T extends string>(value: string | null | undefined, allowedValues: readonly T[], defaultValue: T): T => {
    if (value && allowedValues.includes(value as T)) {
        return value as T;
    }
    return defaultValue;
};

export default function SupplierForm({ onSuccess, onCancel, initialData, supplierId }: SupplierFormProps) {
    const [isPending, startTransition] = useTransition(); // Hook para manejar estado pendiente
    const isEditing = !!supplierId; // Determinar si estamos editando

    // Obtener los valores permitidos de los enums Zod para usarlos en la comprobación
    const allowedVatConditions = supplierSchema.shape.vatCondition._def.values;
    const allowedVoucherTypes = supplierSchema.shape.voucherType._def.values;
    const allowedStatuses = supplierSchema.shape.status._def.innerType._def.values; // Acceder a innerType

    // Preparar defaultValues asegurando tipos correctos
    const prepareDefaultValues = (data: Supplier | null): SupplierFormData => {
        if (!data) {
            // Valores por defecto para CREACIÓN
            return {
                legalName: "", commercialName: "", taxIdentification: "",
                vatCondition: "Responsable Inscripto", voucherType: "Factura A",
                grossIncome: "", localTaxRegistration: "", contactName: "",
                contactPosition: "", landlineNumber: "", mobileNumber: "",
                email: "", website: "", legalAddress: "", commercialAddress: "",
                deliveryAddress: "", bank: "", accountTypeNumber: "", cbu: "",
                bankAlias: "", swiftBic: "", paymentCurrency: "ARS",
                paymentMethods: [], paymentTermDays: null, discountsConditions: "",
                creditLimit: null, returnPolicy: "", shippingMethods: "",
                shippingCosts: "", deliveryTimes: "", transportConditions: "",
                itemsCategories: "", certifications: "", commercialReferences: "",
                status: "activo", notesObservations: "",
            };
        }
        // Valores por defecto para EDICIÓN (basados en initialData)
        return {
            legalName: data.legalName,
            commercialName: data.commercialName ?? "",
            taxIdentification: data.taxIdentification,
            vatCondition: ensureEnumOrDefault(data.vatCondition, allowedVatConditions, "Responsable Inscripto"),
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

    const form = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: prepareDefaultValues(initialData ?? null),
    });

    useEffect(() => {
        // Resetear con valores preparados cuando initialData cambie
        form.reset(prepareDefaultValues(initialData ?? null));
    }, [initialData, form.reset]); // Quitar prepareDefaultValues de las dependencias

    function onSubmit(data: SupplierFormData) {
        startTransition(async () => {
            const result = isEditing && supplierId
                ? await updateSupplier(supplierId, data)
                : await createSupplier(data);

            if (result.success) {
                toast({
                    title: isEditing ? "Proveedor Actualizado" : "Proveedor Guardado",
                    description: `Se ${isEditing ? 'actualizó' : 'guardó'} el proveedor "${data.commercialName || data.legalName}".`
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
                    description: result.error || "Ocurrió un error desconocido."
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
        <Card className="w-full border-0 shadow-none"> {/* Quitar bordes/sombra si está en modal */}
            <CardHeader>
                <CardTitle>{isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}</CardTitle>
                {/* Podrías añadir una descripción si quieres */}
            </CardHeader>
            {/* Añadir scroll y padding si es necesario dentro de un modal */}
            <CardContent className="max-h-[70vh] overflow-y-auto p-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="identificacion" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 mb-4"> {/* Ajustar grid */}
                                {tabsConfig.map((tab) => (
                                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                                ))}
                            </TabsList>

                            {/* --- CONTENIDO DE CADA PESTAÑA --- */}

                            {/* Pestaña Identificación */}
                            <TabsContent value="identificacion" className="space-y-4">
                                <FormField control={form.control} name="legalName" render={({ field }) => (<FormItem><FormLabel>Razón Social</FormLabel><FormControl><Input placeholder="Nombre legal completo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="commercialName" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input placeholder="Nombre de fantasía (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="taxIdentification" render={({ field }) => (<FormItem><FormLabel>Identificación Tributaria (CUIT/CUIL/etc.)</FormLabel><FormControl><Input placeholder="Ej: 20-12345678-9" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Fiscal */}
                            <TabsContent value="fiscal" className="space-y-4">
                                <FormField control={form.control} name="vatCondition" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condición frente al IVA</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                                                <SelectItem value="Monotributista">Monotributista</SelectItem>
                                                <SelectItem value="Exento">Exento</SelectItem>
                                                <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                                                <SelectItem value="Otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="voucherType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Comprobante Emitido</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Factura A">Factura A</SelectItem>
                                                <SelectItem value="Factura B">Factura B</SelectItem>
                                                <SelectItem value="Factura C">Factura C</SelectItem>
                                                <SelectItem value="Recibo X">Recibo X</SelectItem>
                                                <SelectItem value="Otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="grossIncome" render={({ field }) => (<FormItem><FormLabel>Ingresos Brutos (Nro./Convenio)</FormLabel><FormControl><Input placeholder="Número o 'Convenio Multilateral'" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="localTaxRegistration" render={({ field }) => (<FormItem><FormLabel>Inscripción Tributaria Local</FormLabel><FormControl><Input placeholder="Número de inscripción municipal/provincial (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Contacto */}
                            <TabsContent value="contacto" className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Grid para mejor layout */}
                                <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><FormLabel>Persona de Contacto</FormLabel><FormControl><Input placeholder="Nombre completo (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="contactPosition" render={({ field }) => (<FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Cargo (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="landlineNumber" render={({ field }) => (<FormItem><FormLabel>Teléfono Fijo</FormLabel><FormControl><Input type="tel" placeholder="Ej: +54 11 4... (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Teléfono Móvil</FormLabel><FormControl><Input type="tel" placeholder="Ej: +54 9 11 5... (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" placeholder="proveedor@email.com (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Sitio Web</FormLabel><FormControl><Input type="url" placeholder="https://www.proveedor.com (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Direcciones */}
                            <TabsContent value="direcciones" className="space-y-4">
                                <FormField control={form.control} name="legalAddress" render={({ field }) => (<FormItem><FormLabel>Domicilio Legal</FormLabel><FormControl><Textarea placeholder="Dirección legal completa (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="commercialAddress" render={({ field }) => (<FormItem><FormLabel>Domicilio Comercial/Oficina</FormLabel><FormControl><Textarea placeholder="Dirección de la oficina (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="deliveryAddress" render={({ field }) => (<FormItem><FormLabel>Domicilio de Entrega</FormLabel><FormControl><Textarea placeholder="Dirección donde se recibe mercadería (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Bancaria */}
                            <TabsContent value="bancaria" className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="bank" render={({ field }) => (<FormItem><FormLabel>Banco</FormLabel><FormControl><Input placeholder="Nombre del banco (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="accountTypeNumber" render={({ field }) => (<FormItem><FormLabel>Tipo y Número de Cuenta</FormLabel><FormControl><Input placeholder="Ej: Caja de Ahorro 123... (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="cbu" render={({ field }) => (<FormItem><FormLabel>CBU/IBAN</FormLabel><FormControl><Input placeholder="Número CBU/IBAN (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="bankAlias" render={({ field }) => (<FormItem><FormLabel>Alias Bancario</FormLabel><FormControl><Input placeholder="Alias (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="swiftBic" render={({ field }) => (<FormItem><FormLabel>SWIFT/BIC</FormLabel><FormControl><Input placeholder="Código SWIFT/BIC (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Comercial */}
                            <TabsContent value="comercial" className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="paymentCurrency" render={({ field }) => (<FormItem><FormLabel>Moneda de Pago Preferida</FormLabel><FormControl><Input placeholder="Ej: ARS, USD (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="paymentMethods" render={({ field }) => (<FormItem><FormLabel>Formas de Pago Aceptadas</FormLabel><FormControl><Input placeholder="Ej: Transferencia, Cheque (opcional)" {...field} /></FormControl><FormDescription>Separar por comas o describir</FormDescription><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="paymentTermDays" render={({ field }) => (<FormItem><FormLabel>Plazo de Pago (días)</FormLabel><FormControl><Input type="number" placeholder="Ej: 30 (opcional)" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="creditLimit" render={({ field }) => (<FormItem><FormLabel>Límite de Crédito ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 50000 (opcional)" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="discountsConditions" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Descuentos o Condiciones Especiales</FormLabel><FormControl><Textarea placeholder="Detallar descuentos por pronto pago, volumen, etc. (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="returnPolicy" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Política de Devoluciones y Garantías</FormLabel><FormControl><Textarea placeholder="Describir política (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Logística */}
                            <TabsContent value="logistica" className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="shippingMethods" render={({ field }) => (<FormItem><FormLabel>Métodos de Envío</FormLabel><FormControl><Input placeholder="Ej: Correo Argentino, Flete propio (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="shippingCosts" render={({ field }) => (<FormItem><FormLabel>Costos de Envío</FormLabel><FormControl><Input placeholder="Detallar costos o 'Según cotización' (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="deliveryTimes" render={({ field }) => (<FormItem><FormLabel>Tiempos de Entrega Promedio</FormLabel><FormControl><Input placeholder="Ej: 24-72hs hábiles (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="transportConditions" render={({ field }) => (<FormItem><FormLabel>Condiciones de Transporte</FormLabel><FormControl><Input placeholder="Ej: Requiere cadena de frío (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                            {/* Pestaña Adicional */}
                            <TabsContent value="adicional" className="space-y-4">
                                <FormField control={form.control} name="itemsCategories" render={({ field }) => (<FormItem><FormLabel>Rubros / Categorías</FormLabel><FormControl><Input placeholder="Productos o servicios ofrecidos (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="certifications" render={({ field }) => (<FormItem><FormLabel>Certificaciones</FormLabel><FormControl><Input placeholder="ISO 9001, etc. (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="commercialReferences" render={({ field }) => (<FormItem><FormLabel>Referencias Comerciales</FormLabel><FormControl><Textarea placeholder="Otros clientes (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="activo">Activo</SelectItem>
                                                <SelectItem value="inactivo">Inactivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="notesObservations" render={({ field }) => (<FormItem><FormLabel>Notas / Observaciones Internas</FormLabel><FormControl><Textarea placeholder="Cualquier nota adicional (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>

                        </Tabs>

                        <div className="flex justify-end gap-2 pt-4"> {/* Añadir gap y padding top */}
                            {/* Botón Cancelar */}
                            {onCancel && ( // Mostrar solo si se proporciona onCancel
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
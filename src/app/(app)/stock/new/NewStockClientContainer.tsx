"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { createLoteMotosAction, CreateBatchState } from "@/actions/stock/create-lote-motos";
import { type BranchData } from "@/actions/stock/get-sucursales";
import { type BrandForCombobox } from "./page";
import { type ColorConfig } from "@/types/ColorType";
import NuevaMotoForm from "./NewMotoForm"; // El formulario simplificado
import { MotoPreviewCard } from "./BikePreviewCard";
import { Form } from "@/components/ui/form";
import {
    motorcycleBatchSchema,
    MotorcycleBatchFormData,
    UnitIdentificationFormData
} from "@/zod/NewBikeZod";
import { Supplier } from '@prisma/client';

export type IdentificacionData = UnitIdentificationFormData;

interface StockNuevoClientContainerProps {
    availableBrands: BrandForCombobox[];
    availableColors: ColorConfig[];
    sucursales: BranchData[];
    availableSuppliers: Supplier[];
    initialData?: Partial<MotorcycleBatchFormData>; // Podría usarse para edición futura
}

export default function NewStockClientContainer({
    availableBrands,
    availableColors,
    sucursales,
    availableSuppliers,
    initialData = {} // Usar initialData si se proporciona
}: StockNuevoClientContainerProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [actionState, setActionState] = React.useState<CreateBatchState | null>(null);

    const form = useForm<MotorcycleBatchFormData>({
        resolver: zodResolver(motorcycleBatchSchema),
        defaultValues: {
            marcaId: initialData.marcaId ?? 0,
            modeloId: initialData.modeloId ?? 0,
            año: initialData.año ?? new Date().getFullYear(),
            cilindrada: initialData.cilindrada ?? null,
            units: initialData.units ?? [],
            precioCompra: initialData.precioCompra ?? null,
            precioVentaMinorista: initialData.precioVentaMinorista ?? 0,
            precioVentaMayorista: initialData.precioVentaMayorista ?? null,
            proveedorId: initialData.proveedorId ?? null,
            imagenPrincipalUrl: initialData.imagenPrincipalUrl ?? null,
            patente: initialData.patente ?? null,
        }
    });

    const { fields: unitFields, append, remove } = useFieldArray({
        control: form.control,
        name: "units"
    });

    // Añadir la primera unidad si no hay ninguna (o si no hay initialData.units)
    React.useEffect(() => {
        if (unitFields.length === 0 && !initialData.units?.length) {
            append({
                idTemporal: Date.now(),
                nroChasis: "",
                nroMotor: null,
                colorId: 0,
                kilometraje: 0,
                sucursalId: 0
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [append, unitFields.length]); // No incluir initialData en deps para que solo corra al inicio


    const onSubmit = (data: MotorcycleBatchFormData) => {
        console.log("Enviando lote completo desde Container:", data);
        startTransition(async () => {
            const result = await createLoteMotosAction(null, data);
            setActionState(result);
            if (result.success) {
                toast({ title: "Lote Guardado", description: `Se añadieron ${result.createdCount} motos correctamente.` });
                form.reset(); // Resetea a defaultValues (incluyendo array units vacío)
                // Volver a añadir una unidad inicial después del reset
                append({ idTemporal: Date.now(), nroChasis: "", nroMotor: null, colorId: 0, kilometraje: 0, sucursalId: 0 });

            } else if (result.error) {
                toast({ variant: "destructive", title: "Error al guardar lote", description: result.error });
            }
        });
    };

    // Observar datos para la vista previa
    const watchedDataArray = form.watch([
        "marcaId", // 0
        "modeloId", // 1
        "año", // 2
        "cilindrada", // 3
        "precioVentaMinorista", // 4
        "units" // 5
    ]);

    const previewFormData = {
        marcaId: watchedDataArray[0],
        modeloId: watchedDataArray[1],
        año: watchedDataArray[2],
        cilindrada: watchedDataArray[3],
        precioVentaMinorista: watchedDataArray[4],
        units: watchedDataArray[5]
    };


    return (
        <div className="space-y-8"> {/* Espacio entre secciones */}

            {/* Sección Superior: Vista Previa y Tabla de Unidades */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    {/* Vista Previa General */}
                    <MotoPreviewCard
                        formData={previewFormData}
                        availableBrands={availableBrands}
                        availableColors={availableColors}
                    />
                </div>
                <div className="lg:col-span-2">
                    {/* Tabla de Unidades Añadidas */}
                    {(previewFormData.units && previewFormData.units.length > 0) && (
                        <div className="border rounded-md p-3 h-full"> {/* Ocupar altura */}
                            <h3 className="text-md font-semibold mb-2">Unidades Añadidas ({previewFormData.units.length})</h3>
                            <div className="max-h-[300px] overflow-y-auto"> {/* Scroll si hay muchas unidades */}
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground text-xs border-b sticky top-0 bg-background z-10">
                                            <th className="py-1 px-2 font-medium">Chasis</th>
                                            <th className="py-1 px-2 font-medium">Color</th>
                                            <th className="py-1 px-2 font-medium">Año</th>
                                            <th className="py-1 px-2 font-medium">Sucursal</th>
                                            <th className="py-1 px-2 font-medium">Km</th>
                                            {/* Añadir Acciones si se quiere eliminar desde aquí */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewFormData.units.map((unit, index) => {
                                            const selectedColor = availableColors.find(c => c.dbId === unit.colorId);
                                            const selectedSucursal = sucursales.find(s => s.id === unit.sucursalId);
                                            const year = previewFormData.año;

                                            return (
                                                <tr key={unit.idTemporal} className="border-b last:border-b-0 hover:bg-muted/50">
                                                    <td className="py-2 px-2 font-mono text-xs truncate max-w-[100px]">{unit.nroChasis || '-'}</td>
                                                    <td className="py-2 px-2 truncate max-w-[80px]">{selectedColor?.nombre || '-'}</td>
                                                    <td className="py-2 px-2">{year || '-'}</td>
                                                    <td className="py-2 px-2 truncate max-w-[80px]">{selectedSucursal?.nombre || '-'}</td>
                                                    <td className="py-2 px-2">{unit.kilometraje ?? 0}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sección Inferior: Formulario de Entrada (Tabs) */}
            <div>
                <Form {...form}>
                    <NuevaMotoForm
                        // Pasar control y métodos necesarios
                        formControl={form.control}
                        formSetValue={form.setValue}
                        formClearErrors={form.clearErrors}
                        formGetValues={form.getValues} // Podría ser útil para lógica interna del form
                        formState={form.formState} // Pasar formState para errores
                        unitFields={unitFields}
                        appendUnit={append}
                        removeUnit={remove}
                        isPending={isPending}
                        onSubmit={form.handleSubmit(onSubmit)} // Pasar el handler ya envuelto
                        // Pasar datos necesarios para selectores
                        availableBrands={availableBrands}
                        availableColors={availableColors}
                        sucursales={sucursales}
                        availableSuppliers={availableSuppliers}
                    />
                </Form>
            </div>
        </div>
    );
}

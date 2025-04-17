"use client";

import React from 'react';
import { MotorcycleBatchFormData } from '@/zod/NewBikeZod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NewMotoForm } from './NewMotoForm';
import { motorcycleBatchSchema } from '@/zod/NewBikeZod';
import { useActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createMotorcycleBatch } from '@/actions/stock/create-motorcycle-batch';
import { type ColorConfig } from '@/types/ColorType';
import { type BranchData } from '@/actions/stock/get-branch';
import { type Supplier } from '@prisma/client';
import { type UseFormReturn } from 'react-hook-form';
import { type BrandForCombobox } from './page';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

interface BatchPreviewProps {
    formData: Partial<MotorcycleBatchFormData>;
    availableBrands: BrandForCombobox[];
    availableColors: ColorConfig[];
    availableBranches: BranchData[];
    suppliers: Supplier[];
}

function BatchPreview({ formData, availableBrands, availableColors, availableBranches, suppliers }: BatchPreviewProps) {
    const selectedBrand = formData.brandId ? availableBrands.find(b => b.id === formData.brandId) : null;
    const selectedModel = selectedBrand && formData.modelId ? selectedBrand.models.find(m => m.id === formData.modelId) : null;
    const selectedSupplier = formData.supplierId ? suppliers.find(s => s.id === formData.supplierId) : null;

    const formatCurrency = (value: number | null | undefined, currency: string = 'ARS') => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency }).format(value);
    };

    const renderValue = (value: any, fallback = '...') => value ?? <span className="text-muted-foreground">{fallback}</span>;

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start sticky top-20">
            <Card className="flex-1 w-full">
                <CardHeader>
                    <CardTitle>Información del Lote</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div className="space-y-2">
                        <h4 className="font-semibold mb-1 text-base">General</h4>
                        <p><span className="font-medium">Marca:</span> {renderValue(selectedBrand?.name)}</p>
                        <p><span className="font-medium">Modelo:</span> {renderValue(selectedModel?.name)}</p>
                        <p><span className="font-medium">Año:</span> {renderValue(formData.year)}</p>
                        <p><span className="font-medium">Cilindrada:</span> {formData.displacement ? `${formData.displacement} cc` : <span className="text-muted-foreground">N/A</span>}</p>
                        <p><span className="font-medium">Proveedor:</span> {renderValue(selectedSupplier?.commercialName || selectedSupplier?.legalName, 'N/A')}</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold mb-1 text-base">Precios ({formData.currency})</h4>
                        <p><span className="font-medium">Costo:</span> {formatCurrency(formData.costPrice, formData.currency)}</p>
                        <p><span className="font-medium">Minorista:</span> {formatCurrency(formData.retailPrice, formData.currency)}</p>
                        <p><span className="font-medium">Mayorista:</span> {formatCurrency(formData.wholesalePrice, formData.currency)}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="flex-1 w-full">
                <CardHeader>
                    <CardTitle>Unidades ({formData.units?.length || 0})</CardTitle>
                    <CardDescription>Detalle de cada unidad en el lote.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[450px] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Chasis</TableHead>
                                    <TableHead>Motor</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Sucursal</TableHead>
                                    <TableHead className="text-right">Km</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {formData.units && formData.units.length > 0 ? (
                                    formData.units.map((unit, index) => {
                                        const selectedColor = unit.colorId ? availableColors.find(c => c.dbId === unit.colorId) : null;
                                        const selectedBranch = unit.branchId ? availableBranches.find(b => b.id === unit.branchId) : null;
                                        return (
                                            <TableRow key={unit.idTemporal || index}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{renderValue(unit.chassisNumber)}</TableCell>
                                                <TableCell>{renderValue(unit.engineNumber, 'N/A')}</TableCell>
                                                <TableCell>{renderValue(selectedColor?.name)}</TableCell>
                                                <TableCell>{renderValue(selectedBranch?.nombre)}</TableCell>
                                                <TableCell className="text-right">{unit.mileage ?? 0}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                            Aún no hay unidades añadidas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

interface NewStockClientContainerProps {
    availableColors: ColorConfig[];
    availableBrands: BrandForCombobox[];
    availableBranches: BranchData[];
    suppliers: Supplier[];
}

export function NewStockClientContainer({
    availableColors,
    availableBrands,
    availableBranches,
    suppliers
}: NewStockClientContainerProps) {
    const { toast } = useToast();
    const form = useForm<MotorcycleBatchFormData>({
        resolver: zodResolver(motorcycleBatchSchema),
        defaultValues: {
            brandId: undefined,
            modelId: undefined,
            year: new Date().getFullYear(),
            units: [],
            supplierId: null,
            costPrice: null,
            retailPrice: 0,
            wholesalePrice: null,
            currency: 'ARS',
            ivaPorcentajeMinorista: 21,
            otrosImpuestosMinorista: null,
            gananciaPorcentajeMinorista: null,
            ivaPorcentajeMayorista: 21,
            otrosImpuestosMayorista: null,
            gananciaPorcentajeMayorista: null,
            imageUrl: null,
            licensePlate: null,
            displacement: null
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'units'
    });

    const [formState, formAction] = useActionState(createMotorcycleBatch, null);
    const isSubmitting = form.formState.isSubmitting;

    const onSubmit = (data: MotorcycleBatchFormData) => {
        console.log("Enviando lote completo desde Container:", data);
        formAction(data);
    };

    const prevFormStateRef = React.useRef(formState);

    React.useEffect(() => {
        if (prevFormStateRef.current !== formState && formState !== null) {
            if (form.formState.isSubmitSuccessful) {
                toast({
                    title: "Éxito",
                    description: "¡Lote guardado exitosamente!",
                    variant: "default",
                });
                form.reset();
            } else {
                const errorMessage = (formState as any)?.error || (formState as any)?.message || "Error desconocido al guardar el lote.";
                toast({
                    title: "Error al guardar",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        }
        prevFormStateRef.current = formState;

    }, [formState, form.formState.isSubmitSuccessful, form.reset, toast]);

    const watchedFormData = form.watch();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold mb-6">Ingresar Nuevo Lote</h1>
                <Card>
                    <CardContent className="pt-6">
                        <NewMotoForm
                            form={form}
                            availableColors={availableColors}
                            availableBrands={availableBrands}
                            availableBranches={availableBranches}
                            suppliers={suppliers}
                            isSubmitting={isSubmitting}
                            onSubmit={form.handleSubmit(onSubmit)}
                            submitButtonLabel="Guardar Lote"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-1">
                <BatchPreview
                    formData={watchedFormData}
                    availableBrands={availableBrands}
                    availableColors={availableColors}
                    availableBranches={availableBranches}
                    suppliers={suppliers}
                />
            </div>
        </div>
    );
}

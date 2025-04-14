"use client";

import * as React from "react";
import { type Control, type UseFormSetValue, type UseFormClearErrors, type UseFormGetValues, type FormState, type FieldValues, type UseFieldArrayAppend, type UseFieldArrayRemove } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import UploadButton from "@/components/custom/UploadCropperButton";
import { Loader2, Plus, Trash2, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BrandModelCombobox } from "@/components/custom/BrandModelCombobox";
import { ColorSelector } from "@/components/custom/ColorSelector";
import { type BranchData } from "@/actions/stock/get-sucursales";
import { SucursalSelector } from "@/components/custom/SucursalSelector";
import { type BrandForCombobox, type ModelInfo } from "./page";
import { type ColorConfig } from "@/types/ColorType";
import { type UnitIdentificationFormData as IdentificacionData } from "@/zod/NewBikeZod";
import { z } from "zod";
import { type Supplier } from '@prisma/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EstadoVenta } from "@/types/BikesType";

// Tipos inferidos de react-hook-form para los field arrays
type UnitField = IdentificacionData & { id: string }; // react-hook-form añade un 'id' propio

// Constantes para pestañas
const TABS_ORDER = ["producto", "identificacion", "comercial", "multimedia", "legal"] as const;
type TabValue = typeof TABS_ORDER[number];

// Copiar Helper DisplayData para mostrar info en modal
const DisplayData = ({ label, value }: { label: string, value: string | number | string[] | null | undefined }) => {
    const displayValue = value === null || value === undefined || (Array.isArray(value) && value.length === 0) || value === ''
        ? <span className="text-muted-foreground italic">N/A</span>
        : Array.isArray(value) ? value.join(', ') : value;
    return (
        <div className="grid grid-cols-3 gap-2 py-1 border-b border-dashed last:border-b-0">
            <span className="font-medium text-sm col-span-1">{label}:</span>
            <span className="text-sm col-span-2">{displayValue}</span>
        </div>
    );
};

// Interfaz de Props - Recibe control, funciones, datos y estado
interface NuevaMotoFormProps {
    formControl: Control<any>; // Usar any o un tipo más específico si es necesario
    formSetValue: UseFormSetValue<any>;
    formClearErrors: UseFormClearErrors<any>;
    formGetValues: UseFormGetValues<any>;
    formState: FormState<any>;
    unitFields: UnitField[]; // Array de unidades del useFieldArray
    appendUnit: UseFieldArrayAppend<any, "units">;
    removeUnit: UseFieldArrayRemove;
    isPending: boolean;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    availableBrands: BrandForCombobox[];
    availableColors: ColorConfig[];
    sucursales: BranchData[];
    availableSuppliers: Supplier[];
}

export default function NuevaMotoForm({
    formControl,
    formSetValue,
    formClearErrors,
    formGetValues,
    formState,
    unitFields,
    appendUnit,
    removeUnit,
    isPending,
    onSubmit,
    availableBrands,
    availableColors,
    sucursales,
    availableSuppliers,
}: NuevaMotoFormProps) {
    const [activeTab, setActiveTab] = React.useState<TabValue>(TABS_ORDER[0]);
    // --- Añadir estado para el modal de información del proveedor ---
    const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
    const [selectedSupplierInfo, setSelectedSupplierInfo] = React.useState<Supplier | null>(null);

    // Usar appendUnit directamente donde sea necesario
    const addIdentificacion = React.useCallback(() => {
        appendUnit({ // Usar la función pasada por props
            idTemporal: Date.now(),
            nroChasis: "",
            nroMotor: null,
            colorId: 0,
            kilometraje: 0,
            sucursalId: 0,
            estadoVenta: EstadoVenta.STOCK
        });
    }, [appendUnit]);

    const handleNextTab = async () => {
        const currentIndex = TABS_ORDER.indexOf(activeTab);
        if (currentIndex < TABS_ORDER.length - 1) {
            setActiveTab(TABS_ORDER[currentIndex + 1]);
        }
    };

    // Helper para inputs numéricos nullable (puede quedarse)
    const handleNullableNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
        field.onChange(e.target.value === '' ? null : e.target.valueAsNumber);
    };

    // --- FUNCIONES DE RENDERIZADO --- 
    // (Estas funciones ahora usan formControl en lugar de form.control)

    const renderProductoFields = React.useCallback(() => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={formControl}
                name="modeloId"
                render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                        <FormLabel>Marca y Modelo</FormLabel>
                        <BrandModelCombobox
                            brands={availableBrands}
                            selectedModelId={field.value}
                            onSelect={(modelId, brandId) => {
                                formSetValue("modeloId", modelId, { shouldValidate: true });
                                formSetValue("marcaId", brandId, { shouldValidate: true });
                                formClearErrors(["modeloId", "marcaId"]);
                            }}
                            placeholder="Selecciona Marca y Modelo"
                            searchPlaceholder="Buscar Marca o Modelo..."
                            notFoundMessage="No se encontraron coincidencias."
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formControl}
                name="año"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Año</FormLabel>
                        <FormControl>
                            <Input className="h-10" type="number" placeholder="Ej: 2023" {...field} onChange={e => handleNullableNumberChange(e, field)} value={field.value ?? 0} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formControl}
                name="cilindrada"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cilindrada (cc)</FormLabel>
                        <FormControl>
                            <Input className="h-10" type="number" placeholder="Ej: 190" {...field} onChange={e => handleNullableNumberChange(e, field)} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    ), [formControl, availableBrands, formSetValue, formClearErrors, handleNullableNumberChange]);

    const renderIdentificacionFields = React.useCallback(() => (
        <div className="space-y-6">
            {unitFields.map((fieldItem: UnitField, index: number) => (
                <div key={fieldItem.id} className="p-4 border rounded-md space-y-4 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeUnit(index)}
                        disabled={isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <h4 className="text-md font-medium border-b pb-1">Unidad {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField
                            control={formControl}
                            name={`units.${index}.nroChasis` as const}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nro. Chasis</FormLabel>
                                    <FormControl><Input className="h-10" placeholder="ABC123XYZ" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={formControl}
                            name={`units.${index}.nroMotor` as const}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nro. Motor</FormLabel>
                                    <FormControl><Input className="h-10" placeholder="Opcional" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={formControl}
                            name={`units.${index}.colorId` as const}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Color</FormLabel>
                                    <ColorSelector colors={availableColors} selectedColorId={field.value} onSelect={(id: number | null) => field.onChange(id)} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={formControl}
                            name={`units.${index}.kilometraje` as const}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kilometraje</FormLabel>
                                    <FormControl><Input className="h-10" type="number" placeholder="0" {...field} onChange={e => handleNullableNumberChange(e, field)} value={field.value ?? 0} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={formControl}
                            name={`units.${index}.sucursalId` as const}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Sucursal</FormLabel>
                                    <SucursalSelector sucursales={sucursales} selectedSucursalId={field.value} onSelect={(id: number | null) => field.onChange(id)} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={formControl}
                            name={`units.${index}.estadoVenta` as const}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado Inicial</FormLabel>
                                    <Select
                                        value={field.value || EstadoVenta.STOCK}
                                        onValueChange={(value: EstadoVenta) => field.onChange(value)}
                                        disabled={isPending}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar estado..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.values(EstadoVenta).map((estado) => (
                                                <SelectItem key={estado} value={estado}>
                                                    {estado}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                onClick={addIdentificacion}
                disabled={isPending}
            >
                <Plus className="mr-2 h-4 w-4" />
                Añadir Unidad
            </Button>
            {formState.errors.units?.root && (
                <p className="text-sm font-medium text-destructive mt-2">
                    {typeof formState.errors.units.root.message === 'string' ? formState.errors.units.root.message : 'Error en unidades'}
                </p>
            )}
        </div>
    ), [formControl, unitFields, removeUnit, isPending, availableColors, sucursales, addIdentificacion, formState, handleNullableNumberChange]);

    const renderComercialFields = React.useCallback(() => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={formControl}
                name="precioCompra"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio Compra</FormLabel>
                        <FormControl>
                            <Input className="h-10" type="number" placeholder="Opcional" {...field} onChange={e => handleNullableNumberChange(e, field)} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formControl}
                name="precioVentaMinorista"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio Vta. Minorista</FormLabel>
                        <FormControl>
                            <Input className="h-10" type="number" placeholder="Requerido" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : e.target.valueAsNumber)} value={field.value ?? 0} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formControl}
                name="precioVentaMayorista"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio Vta. Mayorista</FormLabel>
                        <FormControl>
                            <Input className="h-10" type="number" placeholder="Opcional" {...field} onChange={e => handleNullableNumberChange(e, field)} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formControl}
                name="proveedorId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Proveedor (Opcional)</FormLabel>
                        {/* --- Envolver Select y Botón Info --- */}
                        <div className="flex items-center gap-2">
                            <Select
                                value={field.value?.toString() ?? "none"}
                                onValueChange={(value) => {
                                    const numericValue = parseInt(value, 10);
                                    formSetValue('proveedorId', isNaN(numericValue) ? null : numericValue, { shouldValidate: true });
                                }}
                                disabled={isPending}
                            >
                                <FormControl>
                                    {/* Hacer el trigger un poco más pequeño si es necesario */}
                                    <SelectTrigger className="flex-grow">
                                        <SelectValue placeholder="Seleccionar proveedor..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">-- Ninguno --</SelectItem>
                                    {availableSuppliers.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                            {supplier.commercialName || supplier.legalName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* --- Modal y Trigger para Info Proveedor --- */}
                            <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 flex-shrink-0" // Ajustar tamaño
                                        disabled={!field.value || field.value === 'none'} // Deshabilitar si no hay proveedor
                                        onClick={() => {
                                            const supplierId = field.value;
                                            if (supplierId && supplierId !== 'none') {
                                                // Buscar proveedor en la lista ya cargada
                                                const supplier = availableSuppliers.find(s => s.id === supplierId);
                                                if (supplier) {
                                                    setSelectedSupplierInfo(supplier);
                                                    setIsSupplierModalOpen(true);
                                                } else {
                                                    // Opcional: Mostrar error si no se encuentra (no debería pasar)
                                                    console.error("Proveedor seleccionado no encontrado en la lista.")
                                                }
                                            }
                                        }}
                                    >
                                        <Info className="h-4 w-4" />
                                        <span className="sr-only">Ver Info Proveedor</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>Información del Proveedor</DialogTitle>
                                    </DialogHeader>
                                    {selectedSupplierInfo ? (
                                        <div className="max-h-[60vh] overflow-y-auto p-1 pr-3 space-y-1">
                                            <DisplayData label="Razón Social" value={selectedSupplierInfo.legalName} />
                                            <DisplayData label="Nombre Comercial" value={selectedSupplierInfo.commercialName} />
                                            <DisplayData label="CUIT/CUIL" value={selectedSupplierInfo.taxIdentification} />
                                            <DisplayData label="Condición IVA" value={selectedSupplierInfo.vatCondition} />
                                            <DisplayData label="Teléfono Móvil" value={selectedSupplierInfo.mobileNumber} />
                                            <DisplayData label="Email" value={selectedSupplierInfo.email} />
                                            <DisplayData label="Dirección Comercial" value={selectedSupplierInfo.commercialAddress} />
                                            <DisplayData label="Estado" value={selectedSupplierInfo.status} />
                                            {/* Añadir más campos si se necesitan */}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Selecciona un proveedor para ver su información.</p>
                                    )}
                                    {/* Se puede añadir un botón de cierre si se quiere */}
                                </DialogContent>
                            </Dialog>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    ), [formControl, handleNullableNumberChange, isPending, availableSuppliers, formSetValue, isSupplierModalOpen, setIsSupplierModalOpen, selectedSupplierInfo, setSelectedSupplierInfo]);

    const renderMultimediaFields = React.useCallback(() => (
        <div className="grid grid-cols-1 gap-4">
            <FormField
                control={formControl}
                name="imagenPrincipalUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Imagen Principal</FormLabel>
                        <FormControl>
                            <UploadButton
                                onChange={(url) => formSetValue("imagenPrincipalUrl", url)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    ), [formControl, formSetValue]);

    const renderLegalFields = React.useCallback(() => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={formControl}
                name="patente"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Patente</FormLabel>
                        <FormControl><Input className="h-10" placeholder="Opcional" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    ), [formControl]);

    // *** RETORNO SIMPLIFICADO: Solo el formulario con Tabs y botones ***
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4 h-auto">
                    {TABS_ORDER.map(tab => (
                        <TabsTrigger key={tab} value={tab} className="capitalize text-xs px-1 py-2 h-full">
                            {tab === 'identificacion' ? 'Unidades' : tab}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Renderizar contenido de cada tab */}
                <TabsContent value="producto">{renderProductoFields()}</TabsContent>
                <TabsContent value="identificacion">{renderIdentificacionFields()}</TabsContent>
                <TabsContent value="comercial">{renderComercialFields()}</TabsContent>
                <TabsContent value="multimedia">{renderMultimediaFields()}</TabsContent>
                <TabsContent value="legal">{renderLegalFields()}</TabsContent>
            </Tabs>

            {/* Botones de Navegación / Envío */}
            <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={() => {/* Lógica para tab anterior si se desea */ }}
                    disabled={activeTab === TABS_ORDER[0] || isPending}>
                    Anterior
                </Button>
                {activeTab !== TABS_ORDER[TABS_ORDER.length - 1] ? (
                    <Button type="button" onClick={handleNextTab} disabled={isPending}>
                        Siguiente
                    </Button>
                ) : (
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Lote
                    </Button>
                )}
            </div>
        </form>
    );
}

"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useForm, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createMotoAction } from "@/actions/stock/create-moto";
import UploadButton from "@/components/custom/UploadCropperButton";
import { Loader2 } from "lucide-react";
import { useActionState, startTransition } from "react";

const motoSchema = z.object({
    // Identificación
    numeroChasis: z.string().min(1, 'El número de chasis es obligatorio'),
    numeroMotor: z.string().min(1, 'El número de motor es obligatorio'),
    dominio: z.string().optional(),
    cedulaVerde: z.string().optional(),
    numeroCuadro: z.string().min(1, 'El número de cuadro es obligatorio'),

    // Datos del producto
    marca: z.string().min(1, 'La marca es obligatoria'),
    modelo: z.string().min(1, 'El modelo es obligatorio'),
    año: z.number().min(1900).max(new Date().getFullYear() + 1),
    cilindrada: z.number().min(0),
    tipo: z.string().min(1, 'El tipo es obligatorio'),
    color: z.string().min(1, 'El color es obligatorio'),
    tipoMotor: z.string().min(1, 'El tipo de motor es obligatorio'),
    transmision: z.string().min(1, 'El tipo de transmisión es obligatorio'),
    combustible: z.string().min(1, 'El tipo de combustible es obligatorio'),

    // Datos comerciales
    codigoInterno: z.string().min(1, 'El código interno es obligatorio'),
    costo: z.number().min(0),
    precioVenta: z.number().min(0),
    margenGanancia: z.number(),
    precioSinIva: z.number(),
    iva: z.number(),
    precioFinal: z.number(),
    precioMayorista: z.number().optional(),
    precioMinorista: z.number().optional(),
    precioContado: z.number().optional(),
    precioFinanciado: z.number().optional(),
    stockTotal: z.number().min(0),
    stockPorSucursal: z.record(z.string(), z.number()).optional(),

    // Multimedia
    fotos: z.array(z.instanceof(File)).optional(),
    etiquetaQR: z.instanceof(File).optional(),

    // Datos legales
    formularioCETA: z.string().optional(),
    estadoDominio: z.string().optional(),
    verificacionPolicial: z.string().optional(),
    patenteAlDia: z.boolean(),
    seguroVigente: z.boolean(),
    historialPropietarios: z.array(z.string()).optional(),
});

type MotoFormData = z.infer<typeof motoSchema>;

// Orden de las pestañas (debe coincidir con el de la página padre)
const TABS_ORDER: Array<'identificacion' | 'producto' | 'comercial' | 'multimedia' | 'legal'> = [
    'identificacion',
    'producto',
    'comercial',
    'multimedia',
    'legal'
];

// Mapeo de pestañas a campos
const TAB_FIELDS: Record<typeof TABS_ORDER[number], FieldPath<MotoFormData>[]> = {
    identificacion: ['numeroChasis', 'numeroMotor', 'dominio', 'cedulaVerde', 'numeroCuadro'],
    producto: ['marca', 'modelo', 'año', 'cilindrada', 'tipo', 'color', 'tipoMotor', 'transmision', 'combustible'],
    comercial: ['codigoInterno', 'costo', 'precioVenta', 'stockTotal'], // Ajustado a campos con FormField
    multimedia: ['fotos'], // 'fotos' es el array de File
    legal: ['formularioCETA', 'estadoDominio', 'verificacionPolicial'], // Ajustado a campos con FormField
};

interface NuevaMotoFormProps {
    activeTab: typeof TABS_ORDER[number];
    onNextTab: () => void; // Función para ir a la siguiente tab
}

function SubmitButton({ activeTab, isPending }: { activeTab: string, isPending: boolean }) {
    return (
        <Button type="submit" disabled={isPending} className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {activeTab === 'legal' ? 'Guardar Moto' : 'Guardar y Continuar'}
        </Button>
    );
}

export default function NuevaMotoForm({ activeTab, onNextTab }: NuevaMotoFormProps) {
    const { toast } = useToast();
    const [state, formAction, isPending] = useActionState(createMotoAction, {
        success: false,
        error: '',
        activeTab
    });

    const form = useForm<MotoFormData>({
        resolver: zodResolver(motoSchema),
        defaultValues: {
            stockTotal: 0,
            patenteAlDia: false,
            seguroVigente: false,
            año: new Date().getFullYear(),
            fotos: [],
            historialPropietarios: []
        }
    });

    const onSubmit = async () => {
        const fieldsToValidate = TAB_FIELDS[activeTab];
        const isValid = await form.trigger(fieldsToValidate);

        if (isValid) {
            if (activeTab === 'legal') {
                const data = form.getValues();
                const formData = new FormData();
                Object.entries(data).forEach(([key, value]) => {
                    if (value instanceof File) {
                        formData.append(key, value);
                    } else if (Array.isArray(value)) {
                        value.forEach((item, index) => {
                            if (item instanceof File) {
                                formData.append(`${key}[${index}]`, item);
                            } else if (item !== undefined && item !== null) {
                                formData.append(`${key}[${index}]`, item.toString());
                            }
                        });
                    } else if (typeof value === 'object' && value !== null) {
                        formData.append(key, JSON.stringify(value));
                    } else if (value !== undefined && value !== null) {
                        formData.append(key, value.toString());
                    }
                });

                startTransition(() => {
                    formAction(formData);
                });
            } else {
                onNextTab();
            }
        } else {
            console.log("Errores de validación en la pestaña:", activeTab, form.formState.errors);
            toast({
                title: "Campos incompletos",
                description: `Por favor, revisa los campos en la pestaña '${activeTab}'.`,
                variant: "destructive"
            });
        }
    };

    React.useEffect(() => {
        if (state?.error) {
            toast({
                title: "Error",
                description: state.error,
                variant: "destructive"
            });
        } else if (state?.success) {
            toast({
                title: "Éxito",
                description: "Moto guardada correctamente"
            });
        }
    }, [state, toast]);

    const renderIdentificacionFields = () => (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="numeroChasis"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número de Chasis</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="numeroMotor"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número de Motor</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="dominio"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Dominio (Patente)</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="cedulaVerde"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cédula Verde</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="numeroCuadro"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número de Cuadro</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    const renderProductoFields = () => (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar marca" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="honda">Honda</SelectItem>
                                <SelectItem value="yamaha">Yamaha</SelectItem>
                                <SelectItem value="kawasaki">Kawasaki</SelectItem>
                                <SelectItem value="suzuki">Suzuki</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="año"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Año</FormLabel>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="cilindrada"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cilindrada</FormLabel>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scooter">Scooter</SelectItem>
                                <SelectItem value="deportiva">Deportiva</SelectItem>
                                <SelectItem value="touring">Touring</SelectItem>
                                <SelectItem value="naked">Naked</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Color</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="tipoMotor"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Motor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo de motor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2t">2 Tiempos</SelectItem>
                                <SelectItem value="4t">4 Tiempos</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="transmision"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Transmisión</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar transmisión" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="automatica">Automática</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="combustible"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Combustible</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar combustible" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nafta">Nafta</SelectItem>
                                <SelectItem value="electrica">Eléctrica</SelectItem>
                                <SelectItem value="hibrida">Híbrida</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    const renderComercialFields = () => (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="codigoInterno"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Código Interno</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="costo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Costo</FormLabel>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="precioVenta"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio de Venta</FormLabel>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="stockTotal"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Stock Total</FormLabel>
                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    const renderMultimediaFields = () => (
        <div className="space-y-4">
            <FormField
                control={form.control}
                name="fotos"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fotos del Producto</FormLabel>
                        <UploadButton
                            placeholder="Subir foto (una a la vez)"
                            onChange={({ originalFile }) => {
                                const currentFotos = field.value || [];
                                field.onChange([...currentFotos, originalFile]);
                            }}
                        />
                        {(field.value || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(field.value || []).map((foto: File, index: number) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={URL.createObjectURL(foto)}
                                            alt={`Foto ${index + 1}`}
                                            className="w-24 h-24 object-cover rounded-md"
                                            onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentFotos = field.value || [];
                                                const newFotos = currentFotos.filter((_, i) => i !== index);
                                                field.onChange(newFotos);
                                            }}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 leading-none flex items-center justify-center"
                                            style={{ width: '20px', height: '20px', fontSize: '14px' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    const renderLegalFields = () => (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="formularioCETA"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Formulario CETA</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="estadoDominio"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estado de Dominio</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="verificacionPolicial"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Verificación Policial</FormLabel>
                        <Input {...field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'identificacion':
                return renderIdentificacionFields();
            case 'producto':
                return renderProductoFields();
            case 'comercial':
                return renderComercialFields();
            case 'multimedia':
                return renderMultimediaFields();
            case 'legal':
                return renderLegalFields();
            default:
                return null;
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }} className="space-y-6">
                {renderActiveTabContent()}
                <div className="flex justify-end">
                    <SubmitButton activeTab={activeTab} isPending={isPending} />
                </div>
            </form>
        </Form>
    );
} 
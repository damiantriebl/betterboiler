"use client";

import * as React from "react";
// Quitar useState, useEffect, useWatch si ya no se usan aquí
import { useActionState, startTransition } from "react";
import { useForm, FieldPath } from "react-hook-form"; // Quitar useWatch
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Mantener si se usa en otros campos
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createMotoAction } from "@/actions/stock/create-moto";
import UploadButton from "@/components/custom/UploadCropperButton";
import { Loader2 } from "lucide-react";
import GestionMarcas from "@/components/custom/GestionMarcas"; // <--- IMPORTAR

// Schema (sin cambios)
const motoSchema = z.object({ /* ... */ });
type MotoFormData = z.infer<typeof motoSchema>;

// TABS_ORDER y TAB_FIELDS (sin cambios)
const TABS_ORDER = [ /* ... */];
const TAB_FIELDS: Record<typeof TABS_ORDER[number], FieldPath<MotoFormData>[]> = { /* ... */ };

// --- QUITAR DATOS MODELOS_POR_MARCA ---

interface NuevaMotoFormProps {
    activeTab: typeof TABS_ORDER[number];
    onNextTab: () => void;
}

function SubmitButton({ activeTab, isPending }: { activeTab: string, isPending: boolean }) { /* ... (sin cambios) ... */ }

export default function NuevaMotoForm({ activeTab, onNextTab }: NuevaMotoFormProps) {
    const { toast } = useToast();
    const [state, formAction, isPending] = useActionState(createMotoAction, { /* ... */ });

    const form = useForm<MotoFormData>({
        resolver: zodResolver(motoSchema),
        defaultValues: { /* ... (sin cambios) ... */ }
    });

    // --- QUITAR useState para modelos y useWatch ---
    // --- QUITAR useEffect para actualizar modelos ---

    const onSubmit = async () => { /* ... (sin cambios) ... */ };

    React.useEffect(() => { /* ... (lógica toast sin cambios) ... */ });

    // --- Modificar renderProductoFields ---
    const renderProductoFields = () => (
        <div className="grid grid-cols-2 gap-4">
            {/* --- USAR GestionMarcas --- */}
            <GestionMarcas
                control={form.control}
                setValue={form.setValue} // Pasamos setValue
                marcaFieldName="marca"     // Nombre del campo marca en MotoFormData
                modeloFieldName="modelo"   // Nombre del campo modelo en MotoFormData
            />
            {/* --- FIN GestionMarcas --- */}

            {/* Mantener el resto de campos de producto (año, cilindrada, etc.) */}
            <FormField
                control={form.control}
                name="año"
                render={({ field }) => ( /* ... */ )}
            />
            <FormField
                control={form.control}
                name="cilindrada"
                render={({ field }) => ( /* ... */ )}
            />
            {/* ... otros campos ... */}
        </div>
    );

    // ... (resto de funciones render y return sin cambios) ...
    const renderIdentificacionFields = () => { /* ... */ };
    const renderComercialFields = () => { /* ... */ };
    const renderMultimediaFields = () => { /* ... */ };
    const renderLegalFields = () => { /* ... */ };
    const renderActiveTabContent = () => { /* ... */ };

    return (<Form {...form}> {/* ... */} </Form>);
}

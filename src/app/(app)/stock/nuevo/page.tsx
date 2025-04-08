"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NuevaMotoForm from "./NuevaMotoForm";

// Definir el orden de las pestañas
const TABS_ORDER: Array<| 'producto' | 'identificacion' | 'comercial' | 'multimedia' | 'legal'> = [
    'producto',
    'identificacion',
    'comercial',
    'multimedia',
    'legal'
];

export default function NuevaMotoPage() {
    // Estado para controlar la pestaña activa
    const [activeTab, setActiveTab] = React.useState<typeof TABS_ORDER[number]>(TABS_ORDER[0]);

    // Función para avanzar a la siguiente pestaña
    const handleNextTab = () => {
        const currentIndex = TABS_ORDER.indexOf(activeTab);
        if (currentIndex < TABS_ORDER.length - 1) {
            setActiveTab(TABS_ORDER[currentIndex + 1]);
        }
        // Si ya está en la última, no hace nada (la acción final la maneja el form)
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Nueva Moto en Stock</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof TABS_ORDER[number])} className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="identificacion">Identificación</TabsTrigger>
                            <TabsTrigger value="producto">Datos del Producto</TabsTrigger>
                            <TabsTrigger value="comercial">Datos Comerciales</TabsTrigger>
                            <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
                            <TabsTrigger value="legal">Datos Legales</TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                            <NuevaMotoForm
                                key={activeTab}
                                activeTab={activeTab}
                                onNextTab={handleNextTab}
                            />
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
} 
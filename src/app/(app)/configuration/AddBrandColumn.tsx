"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AddBrandColumnProps {
    onAdd: () => void; // Función a llamar al hacer clic
}

export default function AddBrandColumn({ onAdd }: AddBrandColumnProps) {
    return (
        // Usamos las mismas clases de tamaño que BrandContainer para consistencia
        <Card className=" flex flex-col flex-shrink-0 border-dashed border-muted-foreground /50 hover: border - primary / 80 transition - colors">
            <Card  className="flex-grow flex items-center justify-center p-4" >
                <Button
                    variant="outline"
                    className="w-full h-full text-muted-foreground hover:text-primary hover:border-primary/80 flex flex-col gap-2"
                    onClick={onAdd}
                    aria-label="Añadir nueva marca"
                >
                    <Plus className="h-12 w-12" />
                    <span>Añadir Marca</span>
                </Button>
            </Card >
        </Card >
    );
} 
// src/app/(app)/configuracion/BrandContainer.tsx
import React, { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area'; // Importar si no existe en Shadcn
import { Button } from '@/components/ui/button'; // Importar Button
import { Trash2, Edit } from 'lucide-react'; // Importar iconos
import { cn } from '@/lib/utils'; // Para estilos condicionales

interface BrandContainerProps {
    id: string; // Nombre de la marca
    children: ReactNode;
    models: string[]; // Puede ser útil para mostrar un contador, etc.
    onDelete: (brandId: string) => void; // Handler para borrar
    onEdit: (brandId: string) => void; // Handler para editar nombre
    brandColor?: string; // Color actual para visualización
    renderColorButton?: (triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;
}

export default function BrandContainer({
    id,
    children,
    models,
    onDelete,
    onEdit,
    brandColor = '#ffffff', // Valor por defecto
    renderColorButton,
}: BrandContainerProps) {
    const brandTitle = id.charAt(0).toUpperCase() + id.slice(1); // Capitalizar

    return (
        // Añadir borde izquierdo coloreado
        <Card
            className={cn(
                "flex flex-col flex-shrink-0 relative border-l-4"
            )}
            style={{ borderLeftColor: brandColor }}
        >
            {/* El handle de drag de SingleBrandColumn se posicionará sobre esto */}
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-x-2"> {/* Flex para alinear título y botones */}
                <CardTitle className="text-lg font-semibold truncate">
                    {brandTitle} ({models.length})
                </CardTitle>
                {/* Grupo de botones de acción Y HANDLE */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                    {/* Botón Editar */}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(id)} aria-label={`Editar nombre de ${brandTitle}`}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    {renderColorButton ? renderColorButton({}) : null}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(id)} aria-label={`Eliminar marca ${brandTitle}`}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {/* Añadir ScrollArea vertical si la lista de modelos puede ser muy larga */}
            <ScrollArea className="h-[400px]"> {/* Altura fija para el área de scroll */}
                <CardContent className="p-4 flex flex-col gap-2">
                    {children}
                </CardContent>
            </ScrollArea>
        </Card>
    );
} 
"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ColorConfig } from './types'; // Importar la interfaz
import { cn } from '@/lib/utils';

interface AddColorItemProps {
    onAdd: (newColor: ColorConfig) => void; // La función recibe el objeto ColorConfig completo
    className?: string;
}

export default function AddColorItem({ onAdd, className }: AddColorItemProps) {
    const [newColorName, setNewColorName] = useState('');

    const handleAddClick = () => {
        const trimmedName = newColorName.trim();
        if (trimmedName) {
            // Crear el objeto ColorConfig por defecto
            const newColor: ColorConfig = {
                id: trimmedName,       // Usar nombre como ID inicial
                nombre: trimmedName,
                tipo: 'SOLIDO',        // Por defecto es 'SOLIDO'
                color1: '#FFFFFF',     // Por defecto es blanco
                // color2 no se define inicialmente
            };
            onAdd(newColor);         // Llamar al handler del padre
            setNewColorName('');     // Limpiar input
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleAddClick();
        }
    };

    return (
        <div className={cn("flex items-center space-x-2 p-3 border rounded-md shadow-sm bg-card", className)}> {/* Añadido estilo base */}
            <Input
                type="text"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nombre del nuevo color..."
                className="h-9 flex-grow"
                aria-label="Nombre del nuevo color"
            />
            <Button onClick={handleAddClick} size="sm" className="h-9" aria-label="Añadir nuevo color">
                <Plus className="h-4 w-4 mr-1" /> Añadir Color
            </Button>
        </div>
    );
} 
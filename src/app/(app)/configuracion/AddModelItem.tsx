"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddModelItemProps {
    onAdd: (modelName: string) => void;
    className?: string;
}

export default function AddModelItem({ onAdd, className }: AddModelItemProps) {
    const [modelName, setModelName] = useState('');
    const [isAdding, setIsAdding] = useState(false); // Para mostrar/ocultar input

    const handleAddClick = () => {
        if (modelName.trim()) {
            onAdd(modelName.trim());
            setModelName(''); // Limpiar input
            setIsAdding(false); // Ocultar input después de añadir
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setModelName(event.target.value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleAddClick();
        } else if (event.key === 'Escape') {
            setModelName('');
            setIsAdding(false);
        }
    };

    return (
        <Card className={cn("p-3 flex items-center gap-2 bg-muted/40 border-dashed", className)}>
            {!isAdding ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-1 px-2"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Modelo
                </Button>
            ) : (
                <>
                    <Input
                        autoFocus
                        type="text"
                        placeholder="Nombre del nuevo modelo..."
                        value={modelName}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="h-8 flex-grow"
                    />
                    <Button size="icon" className="h-8 w-8" onClick={handleAddClick} disabled={!modelName.trim()}>
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsAdding(false)}>
                        X {/* O un icono de cerrar */}
                    </Button>
                </>
            )}
        </Card>
    );
} 
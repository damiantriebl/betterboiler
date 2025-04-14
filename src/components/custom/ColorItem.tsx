"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HexColorPicker } from 'react-colorful'; // Asegúrate de que la importación sea correcta

import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Importar Popover
import { GripVertical, Edit, Trash2, Palette, Copy, Replace, Check, X as CancelIcon } from 'lucide-react'; // Añadir iconos
import { cn } from '@/lib/utils';
import { ColorConfig, ColorType } from '@/types/ColorType';

interface ColorItemProps {
    colorConfig: ColorConfig;
    onUpdate?: (updatedConfig: ColorConfig) => void; // Hacer opcionales para displayMode
    onDelete?: (id: string) => void; // Hacer opcionales para displayMode
    // Nuevas props para unificar
    displayMode?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showName?: boolean;
    nameClassName?: string;
    // Props de useSortable (pasadas externamente si no es displayMode)
    attributes?: ReturnType<typeof useSortable>['attributes'];
    listeners?: ReturnType<typeof useSortable>['listeners'];
    setNodeRef?: ReturnType<typeof useSortable>['setNodeRef'];
    style?: React.CSSProperties;
    isDragging?: boolean;
}

export default function ColorItem({
    colorConfig,
    onUpdate,
    onDelete,
    displayMode = false,
    size = 'sm', // Default size
    showName = true,
    nameClassName,
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging
}: ColorItemProps) {
    // Sacar los hooks de useSortable solo si no estamos en displayMode
    const sortable = !displayMode ? useSortable({ id: colorConfig.id }) : null;
    // Usar los props pasados o los del hook interno
    const finalAttributes = attributes ?? sortable?.attributes;
    const finalListeners = listeners ?? sortable?.listeners;
    const finalSetNodeRef = setNodeRef ?? sortable?.setNodeRef;
    const finalStyle = style ?? (sortable ? { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? 0.8 : 1, zIndex: sortable.isDragging ? 10 : undefined } : {});
    const finalIsDragging = isDragging ?? sortable?.isDragging ?? false;

    const { id, nombre, tipo, color1, color2 } = colorConfig;

    // --- Estados (Solo necesarios si no es displayMode) ---
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState(nombre);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isPopover1Open, setIsPopover1Open] = useState(false);
    const [isPopover2Open, setIsPopover2Open] = useState(false);
    const [tempColor1, setTempColor1] = useState(color1);
    const [tempColor2, setTempColor2] = useState(color2 ?? '');

    // Sincronizar nombre si cambia externamente
    useEffect(() => {
        if (!isEditingName) {
            setEditingName(nombre);
        }
    }, [nombre, isEditingName]);

    // Enfocar input al editar nombre
    useEffect(() => {
        if (isEditingName && inputRef.current) {
            inputRef.current.select();
        }
    }, [isEditingName]);

    // Sincronizar colores temporales cuando se abre el Popover correspondiente
    useEffect(() => {
        if (isPopover1Open) setTempColor1(color1);
    }, [isPopover1Open, color1]);

    useEffect(() => {
        // Solo sincronizar color2 si el tipo lo requiere y el popover está abierto
        if (isPopover2Open && (tipo === 'BITONO' || tipo === 'PATRON')) {
            setTempColor2(color2 ?? '#FFFFFF'); // Poner un default si es null/undefined
        }
    }, [isPopover2Open, color2, tipo]);

    // --- Handlers para el Nombre ---
    const handleNameEditClick = () => setIsEditingName(true);
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value);
    const submitNameChange = () => {
        const trimmedNewName = editingName.trim();
        if (trimmedNewName && trimmedNewName !== nombre) {
            // Solo llamar a onUpdate si el nombre realmente cambió y onUpdate existe
            if (onUpdate) {
                onUpdate({ ...colorConfig, nombre: trimmedNewName });
            }
        }
        setIsEditingName(false);
    };
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') submitNameChange();
        else if (e.key === 'Escape') {
            setIsEditingName(false);
            setEditingName(nombre); // Revertir
        }
    };
    const handleNameBlur = () => submitNameChange();

    // --- Handlers para Colores (Modificados) ---
    // Ahora solo actualizan el estado temporal
    const handleTempColor1Change = setTempColor1;
    const handleTempColor2Change = setTempColor2;

    // Función para guardar los cambios de color (llamada desde el botón OK)
    const handleApplyColorChanges = (popoverToClose: 'popover1' | 'popover2') => {
        // Crear el objeto actualizado basado en los temp
        const updatedData = {
            ...colorConfig,
            color1: tempColor1,
            // Incluir color2 solo si el tipo lo requiere
            color2: (tipo === 'BITONO' || tipo === 'PATRON') ? tempColor2 : undefined
        };
        // Validar que color2 no esté vacío si es requerido (extra check)
        if ((tipo === 'BITONO' || tipo === 'PATRON') && !tempColor2) {
            alert("Color 2 no puede estar vacío para este tipo.");
            return;
        }

        // Llamar a la acción del servidor solo si onUpdate existe
        if (onUpdate) {
            onUpdate(updatedData);
        }

        // Cerrar el popover correspondiente
        if (popoverToClose === 'popover1') setIsPopover1Open(false);
        if (popoverToClose === 'popover2') setIsPopover2Open(false);
    };

    // Función para cancelar (cierra popover sin guardar)
    const handleCancelColorChange = (popoverToClose: 'popover1' | 'popover2') => {
        if (popoverToClose === 'popover1') setIsPopover1Open(false);
        if (popoverToClose === 'popover2') setIsPopover2Open(false);
        // No es necesario resetear temp, useEffect lo hará al reabrir
    };

    // --- Handler para Tipo ---
    const handleTypeChange = (newType: ColorType) => {
        let updatedConfig: ColorConfig = { ...colorConfig, tipo: newType };
        // Si cambiamos DESDE BITONO O PATRON A SOLIDO, eliminar color2
        if ((tipo === 'BITONO' || tipo === 'PATRON') && newType === 'SOLIDO') {
            delete updatedConfig.color2;
        }
        // Si cambiamos A BITONO O PATRON y NO hay color2, añadir uno por defecto
        else if ((newType === 'BITONO' || newType === 'PATRON') && !colorConfig.color2) {
            updatedConfig.color2 = '#000000'; // Default negro para el segundo color/líneas
        }
        // Si cambiamos entre BITONO y PATRON, mantener color2
        // Llamar a la acción del servidor solo si onUpdate existe
        if (onUpdate) {
            onUpdate(updatedConfig);
        }
    };

    // --- Función reutilizable para renderizar el círculo ---
    const renderColorCircle = (currentSize: 'sm' | 'md' | 'lg') => {
        const sizeClasses = {
            sm: 'w-6 h-6', // Tamaño original del ColorItem interactivo
            md: 'w-8 h-8',
            lg: 'w-10 h-10',
        };
        const baseClasses = "rounded-full border border-gray-300 shrink-0";
        const finalClassName = cn(baseClasses, sizeClasses[currentSize]);
        switch (tipo) {
            case 'SOLIDO':
                return <div className={finalClassName} style={{ backgroundColor: color1 }} title={nombre} />;
            case 'BITONO':
                return (
                    <div
                        className={finalClassName}
                        style={{
                            backgroundImage: `linear-gradient(to right, ${color1} 50%, ${color2 ?? '#FFFFFF'} 50%)`
                        }}
                        title={`${nombre} (Bitono)`}
                    />
                );
            case 'PATRON':
                return (
                    <div
                        className={cn(finalClassName, "pattern-diagonal-lines")}
                        style={{ '--pattern-bg-color': color1, '--pattern-fg-color': color2 ?? '#000000' } as React.CSSProperties}
                        title={`${nombre} (Patrón)`}
                    />
                );
            default:
                return <div className={cn(finalClassName, "bg-gray-200")} title="Color desconocido" />; // Fallback
        }
    };

    // --- Renderizado Condicional ---
    if (displayMode) {
        // Renderizado simple (como ColorDisplay)
        return (
            <span className={cn("inline-flex items-center gap-2", nameClassName)}> {/* Usar nameClassName en el span wrapper? O ajustar */}
                {renderColorCircle(size)}
                {showName && <span className={cn("truncate", nameClassName)}>{nombre}</span>}
            </span>
        );
    }

    // Renderizado interactivo (Card con D&D, edición, etc.)
    return (
        <Card ref={finalSetNodeRef} style={finalStyle} className={cn("relative group", finalIsDragging ? "shadow-lg" : "shadow-sm")}>
            <CardHeader className="p-3 flex flex-row items-center justify-between space-x-3">
                {/* Popover Color 1 - Usar renderColorCircle como trigger */}
                <div className="flex items-center space-x-1">
                    <Popover open={isPopover1Open} onOpenChange={setIsPopover1Open}>
                        <PopoverTrigger asChild>
                            {/* Llamar a renderColorCircle con el tamaño deseado para el trigger */}
                            <button className="p-0 border-none bg-transparent cursor-pointer">
                                {renderColorCircle('sm')}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 space-y-2" align="start">
                            <HexColorPicker color={tempColor1} onChange={handleTempColor1Change} />
                            <Input type="text" value={tempColor1} onChange={(e) => handleTempColor1Change(e.target.value)} className="h-8 text-xs" placeholder="#RRGGBB" />
                            <div className='flex justify-end gap-2'>
                                <Button variant="ghost" size="icon" onClick={() => handleCancelColorChange('popover1')} className='h-7 w-7'><CancelIcon className='h-4 w-4' /></Button>
                                <Button variant="default" size="icon" onClick={() => handleApplyColorChanges('popover1')} className='h-7 w-7'><Check className='h-4 w-4' /></Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {/* Popover Color 2 ... (sin cambios) */}
                    {(tipo === 'BITONO' || tipo === 'PATRON') && (
                        <Popover open={isPopover2Open} onOpenChange={setIsPopover2Open}>
                            <PopoverTrigger asChild>
                                {/* Usar un div simple para el trigger del color 2 */}
                                <div className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer shrink-0" style={{ backgroundColor: color2 ?? '#FFFFFF' }} />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 space-y-2" align="start">
                                <HexColorPicker color={tempColor2} onChange={handleTempColor2Change} />
                                <Input type="text" value={tempColor2} onChange={(e) => handleTempColor2Change(e.target.value)} className="h-8 text-xs" placeholder="#RRGGBB" />
                                <div className='flex justify-end gap-2'>
                                    <Button variant="ghost" size="icon" onClick={() => handleCancelColorChange('popover2')} className='h-7 w-7'><CancelIcon className='h-4 w-4' /></Button>
                                    <Button variant="default" size="icon" onClick={() => handleApplyColorChanges('popover2')} className='h-7 w-7'><Check className='h-4 w-4' /></Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {/* Nombre (Editable) ... (sin cambios) */}
                <div className="flex-grow min-w-0">
                    {isEditingName ? (
                        <Input
                            ref={inputRef}
                            value={editingName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-8 text-sm"
                        />
                    ) : (
                        <span
                            className="text-sm font-medium truncate cursor-pointer hover:text-primary/80"
                            onClick={handleNameEditClick}
                            title={nombre}
                        >
                            {nombre}
                        </span>
                    )}
                </div>

                {/* Botones de Tipo ... (sin cambios) */}
                <div className="flex items-center border border-gray-200 rounded-md p-0.5">
                    <Button
                        variant={tipo === 'SOLIDO' ? 'secondary' : 'ghost'}
                        size="icon" className="h-6 w-6"
                        onClick={() => handleTypeChange('SOLIDO')} title="Color sólido">
                        <Palette className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={tipo === 'BITONO' ? 'secondary' : 'ghost'}
                        size="icon" className="h-6 w-6"
                        onClick={() => handleTypeChange('BITONO')} title="Bitono">
                        <Copy className="h-4 w-4" /> {/* Icono representativo */}
                    </Button>
                    <Button
                        variant={tipo === 'PATRON' ? 'secondary' : 'ghost'}
                        size="icon" className="h-6 w-6"
                        onClick={() => handleTypeChange('PATRON')} title="Patrón">
                        <Replace className="h-4 w-4" /> {/* Icono representativo */}
                    </Button>
                </div>

                {/* Controles (Editar nombre, Borrar, Mover) - Usar finalAttributes/finalListeners */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                    {/* Botón editar nombre - asegurar que onUpdate existe */}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNameEditClick} disabled={!onUpdate} aria-label={`Editar nombre color ${nombre}`}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    {/* Botón borrar - asegurar que onDelete existe */}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete && onDelete(id)} disabled={!onDelete} aria-label={`Eliminar color ${nombre}`}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    {/* Handle de D&D - usar los listeners/attributes finales */}
                    <button {...finalAttributes} {...finalListeners}
                        className="cursor-grab p-1 text-muted-foreground hover:text-foreground focus:outline-none"
                        aria-label={`Mover color ${nombre}`}
                    >
                        <GripVertical className="h-5 w-5" />
                    </button>
                </div>
            </CardHeader>
        </Card>
    );
} 
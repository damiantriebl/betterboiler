"use client";

import { Button } from "@/components/ui/button";
import { usePriceDisplayStore, type PriceDisplayMode } from "@/stores/price-display-store";
import { Diamond, Percent } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

export function PriceModeSelector() {
    const { mode, setMode } = usePriceDisplayStore();

    // Añadir efecto para registrar cambios en el modo
    useEffect(() => {
        console.log("PriceModeSelector - Modo actual:", mode);
    }, [mode]);

    const handleSetMode = (newMode: PriceDisplayMode) => {
        // Log antes de actualizar
        console.log("Cambiando modo de:", mode, "a:", newMode);
        setMode(newMode);
        // Forzar actualización de la UI
        setTimeout(() => {
            console.log("Modo actualizado a:", newMode);
        }, 100);
    };

    return (
        <TooltipProvider>
            <div className="flex items-center gap-1 border rounded-md bg-background p-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={mode === 'all' ? "default" : "ghost"}
                            size="sm"
                            className="h-8 min-w-8 px-2 sm:px-3 flex items-center gap-1"
                            onClick={() => handleSetMode('all')}
                        >
                            <div className="relative">
                                <Diamond className="h-4 w-4" />
                                <Badge variant="outline" className="absolute -top-2 -right-2 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] font-bold">3</Badge>
                            </div>
                            <span className="hidden sm:inline">Todos</span>
                            <span className="sr-only">Todos los precios</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mostrar todos los precios</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={mode === 'retail-wholesale' ? "default" : "ghost"}
                            size="sm"
                            className="h-8 min-w-8 px-2 sm:px-3 flex items-center gap-1"
                            onClick={() => handleSetMode('retail-wholesale')}
                        >
                            <div className="relative">
                                <Diamond className="h-4 w-4" />
                                <Badge variant="outline" className="absolute -top-2 -right-2 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] font-bold">2</Badge>
                            </div>
                            <span className="hidden sm:inline">Mayorista</span>
                            <span className="sr-only">Mayorista y minorista</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mostrar mayorista y minorista</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={mode === 'retail-only' ? "default" : "ghost"}
                            size="sm"
                            className="h-8 min-w-8 px-2 sm:px-3 flex items-center gap-1"
                            onClick={() => handleSetMode('retail-only')}
                        >
                            <div className="relative">
                                <Diamond className="h-4 w-4" />
                                <Percent className="absolute -top-2 -right-2 h-3.5 w-3.5 text-[9px] font-bold" />
                            </div>
                            <span className="hidden sm:inline">Minorista</span>
                            <span className="sr-only">Solo minorista</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mostrar solo minorista</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
} 
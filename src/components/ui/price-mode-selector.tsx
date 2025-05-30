"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type PriceDisplayMode, usePriceDisplayStore } from "@/stores/price-display-store";
import { Diamond, DiamondMinus, DiamondPlus } from "lucide-react";
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
      <div className="flex gap-1 bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === "all" ? "default" : "ghost"}
              size="sm"
              className="h-8 min-w-8 px-2 sm:px-3 flex items-center gap-1 transition-all duration-200"
              onClick={() => handleSetMode("all")}
            >
              <div className="relative">
                <Diamond className="h-4 w-4" />
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
              variant={mode === "retail-wholesale" ? "default" : "ghost"}
              size="sm"
              className="h-8 min-w-8 px-2 sm:px-3 flex items-center gap-1 transition-all duration-200"
              onClick={() => handleSetMode("retail-wholesale")}
            >
              <div className="relative">
                <DiamondMinus className="h-4 w-4" />
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
              variant={mode === "retail-only" ? "default" : "ghost"}
              size="sm"
              className="h-8 min-w-8 px-2 sm:px-3 flex items-center gap-1 transition-all duration-200"
              onClick={() => handleSetMode("retail-only")}
            >
              <div className="relative">
                <DiamondPlus className="h-4 w-4" />
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

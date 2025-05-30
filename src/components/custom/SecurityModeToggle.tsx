"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSecurityStore } from "@/stores/security-store";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";

interface SecurityModeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: "button" | "badge";
}

export function SecurityModeToggle({
  className = "",
  showLabel = true,
  variant = "button",
}: SecurityModeToggleProps) {
  const { secureMode, toggleSecureMode } = useSecurityStore();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);

    // Pequeño delay para mostrar el feedback visual
    setTimeout(() => {
      toggleSecureMode();
      setIsToggling(false);
    }, 200);
  };

  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={secureMode ? "destructive" : "secondary"}
              className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
              onClick={handleToggle}
            >
              {secureMode ? (
                <ShieldCheck className="h-3 w-3 mr-1" />
              ) : (
                <ShieldOff className="h-3 w-3 mr-1" />
              )}
              {showLabel && (secureMode ? "Modo Seguro" : "Normal")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {secureMode
                ? "Modo seguro activado - Requiere OTP para operaciones críticas"
                : "Modo normal - Sin restricciones adicionales"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={secureMode ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggle}
            disabled={isToggling}
            className={`transition-all duration-200 ${className}`}
          >
            {secureMode ? (
              <ShieldCheck className="h-4 w-4 mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            {showLabel && (secureMode ? "Modo Seguro" : "Activar Modo Seguro")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium mb-1">
              {secureMode ? "Modo Seguro Activado" : "Modo Normal"}
            </p>
            <p className="text-sm">
              {secureMode
                ? "Las operaciones críticas (como devolver una moto vendida a stock) requieren verificación OTP."
                : "Sin restricciones adicionales. Todas las operaciones se ejecutan normalmente."}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

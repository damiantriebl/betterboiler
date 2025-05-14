"use client";

import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { usePriceDisplayStore } from "@/stores/price-display-store";
import { useEffect, useState } from "react";

interface PriceDisplayProps {
  costPrice?: number | null;
  wholesalePrice?: number | null;
  retailPrice: number;
  size?: "sm" | "md" | "lg";
  currency?: string;
  className?: string;
}

export function PriceDisplay({
  costPrice,
  wholesalePrice,
  retailPrice,
  size = "md",
  currency = "ARS",
  className,
}: PriceDisplayProps) {
  // Asegurarnos de que el componente se actualice cuando cambia el estado
  const [mounted, setMounted] = useState(false);
  const { mode, showCost, showWholesale, showRetail } = usePriceDisplayStore();

  // Forzar re-renderizado después de montar el componente
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Log para depuración cuando cambian las props o el estado interno
    console.log("PriceDisplay render:", {
      mode,
      showCost: showCost(),
      showWholesale: showWholesale(),
      showRetail: showRetail(),
      costPrice,
      wholesalePrice,
      retailPrice,
    });
  }, [mode, costPrice, wholesalePrice, retailPrice, showCost, showWholesale, showRetail]);

  // Determinar tamaños basados en la prop size
  const sizeClasses = {
    sm: {
      container: "space-y-0.5",
      label: "text-xs",
      value: "text-sm font-medium",
    },
    md: {
      container: "space-y-1",
      label: "text-sm",
      value: "text-base font-medium",
    },
    lg: {
      container: "space-y-1.5",
      label: "text-base",
      value: "text-lg font-semibold",
    },
  }[size];

  // Si no estamos montados, mostrar sólo el precio minorista inicialmente
  if (!mounted) {
    return (
      <div className={cn("flex flex-col", sizeClasses.container, className)}>
        <div>
          <span className={cn(sizeClasses.value, "text-green-600")}>
            {formatPrice(retailPrice, currency)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", sizeClasses.container, className)}>
      {showCost() && costPrice !== undefined && costPrice !== null && (
        <div>
          <span className={cn("text-muted-foreground text-base", sizeClasses.label)}>Costo:</span>{" "}
          <span className={cn(sizeClasses.value, "text-base")}>
            {formatPrice(costPrice, currency)}
          </span>
        </div>
      )}

      {showWholesale() && wholesalePrice !== undefined && wholesalePrice !== null && (
        <div>
          <span className={cn("text-muted-foreground text-base", sizeClasses.label)}>
            Mayorista:
          </span>{" "}
          <span className={cn(sizeClasses.value, "text-base")}>
            {formatPrice(wholesalePrice, currency)}
          </span>
        </div>
      )}

      {showRetail() && (
        <div>
          <span className={cn("text-muted-foreground text-base", sizeClasses.label)}>
            Minorista:
          </span>{" "}
          <span className={cn(sizeClasses.value, "text-green-600 text-base")}>
            {formatPrice(retailPrice, currency)}
          </span>
        </div>
      )}
    </div>
  );
}

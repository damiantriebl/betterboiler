"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/ui/price-display";
import { usePriceDisplayStore } from "@/stores/price-display-store";
import { useEffect, useState } from "react";

export default function DebugPriceDisplay() {
  const [mounted, setMounted] = useState(false);
  const { mode, showCost, showWholesale, showRetail } = usePriceDisplayStore();

  // Asegurarse de que estamos en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Depuración de Estado de Precios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Modo actual:</strong> {mode}
            </p>
            <p>
              <strong>showCost():</strong> {showCost() ? "true" : "false"}
            </p>
            <p>
              <strong>showWholesale():</strong> {showWholesale() ? "true" : "false"}
            </p>
            <p>
              <strong>showRetail():</strong> {showRetail() ? "true" : "false"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ejemplo con todos los precios</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay
              costPrice={10000000}
              wholesalePrice={12000000}
              retailPrice={15000000}
              currency="ARS"
              size="md"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

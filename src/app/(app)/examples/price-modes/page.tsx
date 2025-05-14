"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/ui/price-display";
import { usePriceDisplayStore } from "@/stores/price-display-store";

export default function PriceModesExamplePage() {
  const { mode } = usePriceDisplayStore();

  // Ejemplos de motocicletas con diferentes precios
  const motorcycles = [
    {
      id: 1,
      brand: "Honda",
      model: "CBR 600RR",
      costPrice: 15000000,
      wholesalePrice: 18000000,
      retailPrice: 22000000,
      currency: "ARS",
    },
    {
      id: 2,
      brand: "Yamaha",
      model: "YZF R6",
      costPrice: 14500000,
      wholesalePrice: 17500000,
      retailPrice: 21000000,
      currency: "ARS",
    },
    {
      id: 3,
      brand: "Kawasaki",
      model: "Ninja 650",
      costPrice: 10000000,
      wholesalePrice: 12000000,
      retailPrice: 15000000,
      currency: "ARS",
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ejemplo de Modos de Precio</h1>
        <p className="text-muted-foreground">
          Este ejemplo muestra cómo los diferentes modos de visualización de precios afectan la
          interfaz. Utiliza los botones en la barra superior para cambiar entre modos.
        </p>
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p>
            <strong>Modo actual:</strong>{" "}
            {mode === "all"
              ? "Todos los precios (Costo, Mayorista, Minorista)"
              : mode === "retail-wholesale"
                ? "Mayorista y Minorista"
                : "Solo Minorista"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {motorcycles.map((moto) => (
          <Card key={moto.id}>
            <CardHeader>
              <CardTitle>
                {moto.brand} {moto.model}
              </CardTitle>
              <CardDescription>Ejemplo de visualización de precios</CardDescription>
            </CardHeader>
            <CardContent>
              <PriceDisplay
                costPrice={moto.costPrice}
                wholesalePrice={moto.wholesalePrice}
                retailPrice={moto.retailPrice}
                currency={moto.currency}
                size="md"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

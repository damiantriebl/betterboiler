import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryStatusReport } from "@/types/reports";
import type { MotorcycleState } from "@prisma/client";

interface InventoryReportProps {
  data: InventoryStatusReport;
}

const stateLabels: Record<MotorcycleState, string> = {
  STOCK: "En Stock",
  VENDIDO: "Vendido",
  PAUSADO: "Pausado",
  RESERVADO: "Reservado",
  PROCESANDO: "Procesando",
  ELIMINADO: "Eliminado",
};

export function InventoryReport({ data }: InventoryReportProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.inStock}</div>
              <div className="text-sm text-muted-foreground">En Stock</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.reserved}</div>
              <div className="text-sm text-muted-foreground">Reservadas</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.sold}</div>
              <div className="text-sm text-muted-foreground">Vendidas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.byState.map((item) => (
                <div key={item.state} className="flex justify-between items-center">
                  <span>{stateLabels[item.state]}</span>
                  <span className="font-semibold">{item._count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Marca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.byBrand.map((item) => (
                <div key={item.brandId} className="flex justify-between items-center">
                  <span>{item.brandName}</span>
                  <span className="font-semibold">{item._count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valor por Estado y Moneda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.valueByState.map((item, index) => (
              <div key={`${item.state}-${item.currency}-${index}`} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>
                    {stateLabels[item.state]} ({item.currency})
                  </span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: item.currency,
                    }).format(item._sum.retailPrice || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Costo</span>
                  <span>
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: item.currency,
                    }).format(item._sum.costPrice || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ReservationsReport as ReservationsReportType } from "@/types/reports";

interface ReservationsReportProps {
  data: ReservationsReportType;
}

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    active: "Activa",
    completed: "Completada",
    cancelled: "Cancelada",
    expired: "Expirada",
  };
  return translations[status] || status;
};

export function ReservationsReport({ data }: ReservationsReportProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.totalReservations}</div>
              <div className="text-sm text-muted-foreground">Total Reservas</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.activeReservations}</div>
              <div className="text-sm text-muted-foreground">Reservas Activas</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.completedReservations}</div>
              <div className="text-sm text-muted-foreground">Completadas</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-2xl font-bold">{data.summary.cancelledReservations}</div>
              <div className="text-sm text-muted-foreground">Canceladas</div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Montos Totales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data.summary.totalAmount).map(([currency, amount]) => (
                <div key={currency} className="p-4 rounded-lg bg-secondary">
                  <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
                  <div className="text-sm text-muted-foreground">Total en {currency}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reservas por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.reservationsByStatus).map(([status, info]) => (
              <div key={status} className="p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{translateStatus(status)}</h4>
                  <span className="text-lg font-bold">{info.count}</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(info.amount).map(([currency, amount]) => (
                    <div
                      key={currency}
                      className="flex justify-between text-sm text-muted-foreground"
                    >
                      <span>{currency}</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

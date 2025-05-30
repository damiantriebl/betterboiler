import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ReportDataForPdf } from "@/types/PettyCashActivity";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PettyCashReportProps {
  data: ReportDataForPdf[];
}

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    JUSTIFIED: "Justificado",
    PARTIALLY_JUSTIFIED: "Parcialmente Justificado",
    NOT_JUSTIFIED: "No Justificado",
    PENDING: "Pendiente",
    PARTIAL: "Parcial",
    REJECTED: "Rechazado",
  };
  return translations[status] || status;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "JUSTIFIED":
      return "bg-green-100 text-green-800";
    case "PARTIALLY_JUSTIFIED":
      return "bg-yellow-100 text-yellow-800";
    case "NOT_JUSTIFIED":
    case "REJECTED":
      return "bg-red-100 text-red-800";
    case "PENDING":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function PettyCashReport({ data }: PettyCashReportProps) {
  // Calcular totales
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalSpends = 0;

  for (const deposit of data) {
    totalDeposits += deposit.amount;
    for (const withdrawal of deposit.withdrawals) {
      totalWithdrawals += withdrawal.amountGiven;
      for (const spend of withdrawal.spends) {
        totalSpends += spend.amount;
      }
    }
  }

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: es });
  };

  const formatDateTime = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
  };

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Depósitos</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDeposits)}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Retiros</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalWithdrawals)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Gastos</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpends)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Diferencia</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalDeposits - totalSpends)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de Movimientos */}
      {data.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detalle de Movimientos</h3>
          {data.map((deposit) => (
            <Card key={deposit.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-blue-700">
                      Sucursal: {deposit.branch?.name || "Cuenta General"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Depósito • {formatDate(deposit.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(deposit.amount)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Información del depósito */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  {deposit.reference && (
                    <p className="text-sm">
                      <span className="font-medium">Referencia:</span> {deposit.reference}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Descripción:</span> {deposit.description}
                  </p>
                </div>

                {/* Retiros */}
                {deposit.withdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {deposit.withdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="border-l-4 border-l-orange-400 pl-4 bg-orange-50 p-3 rounded-r-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-orange-700">
                              Usuario: {withdrawal.userName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Retiro • {formatDate(withdrawal.date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-600">
                              {formatCurrency(withdrawal.amountGiven)}
                            </p>
                            <Badge className={getStatusColor(withdrawal.status)}>
                              {translateStatus(withdrawal.status)}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm mb-3">
                          <span className="font-medium">Monto Justificado:</span>{" "}
                          {formatCurrency(withdrawal.amountJustified)}
                        </p>

                        {/* Gastos */}
                        {withdrawal.spends.length > 0 ? (
                          <div className="bg-white rounded-lg p-3">
                            <h5 className="font-medium text-sm mb-2">Gastos Registrados:</h5>
                            <div className="space-y-2">
                              {withdrawal.spends.map((spend) => (
                                <div
                                  key={spend.id}
                                  className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0"
                                >
                                  <div>
                                    <p className="font-medium">{spend.description}</p>
                                    <p className="text-muted-foreground">
                                      {formatDate(spend.date)} • {spend.motive || "Sin motivo"}
                                    </p>
                                  </div>
                                  <p className="font-bold text-red-600">
                                    {formatCurrency(spend.amount)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Sin gastos registrados para este retiro.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sin retiros registrados para este depósito.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No se encontraron datos de actividad de caja chica para el período y sucursal
              seleccionados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

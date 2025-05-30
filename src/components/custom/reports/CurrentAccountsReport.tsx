import type { CurrentAccountsReport as CurrentAccountsReportType } from "@/actions/reports/get-current-accounts-report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CurrentAccountsReportProps {
  data: CurrentAccountsReportType;
}

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    ACTIVE: "Activa",
    PAID_OFF: "Pagada",
    OVERDUE: "Vencida",
    DEFAULTED: "En Mora",
    CANCELLED: "Cancelada",
  };
  return translations[status] || status;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "PAID_OFF":
      return "bg-blue-100 text-blue-800";
    case "OVERDUE":
      return "bg-yellow-100 text-yellow-800";
    case "DEFAULTED":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const calculateProgress = (account: any): number => {
  const totalAmount = account.totalAmount || 0;
  const paidAmount = account.payments.reduce(
    (sum: number, payment: any) => sum + payment.amountPaid,
    0,
  );

  if (totalAmount === 0) return 0;
  return Math.round((paidAmount / totalAmount) * 100);
};

export function CurrentAccountsReport({ data }: CurrentAccountsReportProps) {
  const { summary, accounts } = data;

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: es });
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return format(date, "MMM yyyy", { locale: es });
  };

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Cuentas</p>
              <p className="text-2xl font-bold text-blue-600">{summary.totalAccounts}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Financiado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalFinancedAmount)}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Pagado</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.totalPaidAmount)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalPendingAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribución por Estado */}
      {summary.accountsByStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.accountsByStatus.map((statusData) => (
                <div
                  key={statusData.status}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(statusData.status)}>
                      {translateStatus(statusData.status)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {statusData.count} cuenta{statusData.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(statusData.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribución por Sucursal */}
      {summary.accountsByBranch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.accountsByBranch.map((branchData) => (
                <div
                  key={branchData.branchName}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{branchData.branchName}</p>
                    <p className="text-sm text-muted-foreground">
                      {branchData.count} cuenta{branchData.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(branchData.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagos por Mes */}
      {summary.paymentsByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagos por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.paymentsByMonth.slice(-6).map((monthData) => (
                <div
                  key={monthData.month}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{formatMonth(monthData.month)}</p>
                    <p className="text-sm text-muted-foreground">
                      {monthData.totalPayments} pago{monthData.totalPayments !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(monthData.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle de Cuentas */}
      {accounts.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detalle de Cuentas Corrientes</h3>
          {accounts.map((account) => {
            const progress = calculateProgress(account);
            const paidAmount = account.payments.reduce(
              (sum: number, payment: any) => sum + payment.amountPaid,
              0,
            );

            return (
              <Card key={account.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-blue-700">
                        {account.client.firstName} {account.client.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {account.motorcycle?.brand?.name} {account.motorcycle?.model?.name} •{" "}
                        {formatDate(account.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(account.totalAmount)}
                      </p>
                      <Badge className={getStatusColor(account.status)}>
                        {translateStatus(account.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Información de la cuenta */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <p>
                        <span className="font-medium">Sucursal:</span>{" "}
                        {account.motorcycle?.branch?.name || "Sin Sucursal"}
                      </p>
                      <p>
                        <span className="font-medium">Vendedor:</span>{" "}
                        {account.motorcycle?.seller?.name || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Cuotas:</span>{" "}
                        {account.numberOfInstallments || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Frecuencia:</span> {account.paymentFrequency}
                      </p>
                    </div>
                  </div>

                  {/* Progreso de pagos */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso de Pagos</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Pagado: {formatCurrency(paidAmount)}</span>
                      <span>Pendiente: {formatCurrency(account.totalAmount - paidAmount)}</span>
                    </div>
                  </div>

                  {/* Últimos pagos */}
                  {account.payments.length > 0 && (
                    <div className="bg-white rounded-lg border p-3">
                      <h5 className="font-medium text-sm mb-2">Últimos Pagos:</h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {account.payments.slice(-3).map((payment) => (
                          <div
                            key={payment.id}
                            className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0"
                          >
                            <div>
                              <p className="font-medium">Cuota #{payment.installmentNumber}</p>
                              <p className="text-muted-foreground">
                                {formatDate(payment.paymentDate || payment.createdAt)} •{" "}
                                {payment.paymentMethod}
                              </p>
                            </div>
                            <p className="font-bold text-green-600">
                              {formatCurrency(payment.amountPaid)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No se encontraron cuentas corrientes para los filtros seleccionados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SalesReport as SalesReportType } from "@/types/reports";
import { formatCurrency } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface SalesReportProps {
    data: SalesReportType | null;
    dateRange?: DateRange;
}

export function SalesReport({ data }: SalesReportProps) {
    if (!data) {
        return <div>Seleccione un rango de fechas y genere el reporte</div>;
    }

    const mainCurrency = Object.keys(data.summary.totalRevenue)[0] || "USD";

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Resumen de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-secondary">
                            <div className="text-2xl font-bold">{data.summary.totalSales}</div>
                            <div className="text-sm text-muted-foreground">Total Ventas</div>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary">
                            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue[mainCurrency] || 0)}</div>
                            <div className="text-sm text-muted-foreground">Ingresos Totales</div>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary">
                            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalProfit[mainCurrency] || 0)}</div>
                            <div className="text-sm text-muted-foreground">Ganancia Total</div>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary">
                            <div className="text-2xl font-bold">{formatCurrency(data.summary.averagePrice[mainCurrency] || 0)}</div>
                            <div className="text-sm text-muted-foreground">Precio Promedio</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Vendedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(data.salesBySeller).map(([id, seller]) => (
                            <div key={id} className="p-4 rounded-lg border">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">{seller.name}</h4>
                                    <span className="text-lg font-bold">{seller.count}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Ingresos</span>
                                        <span>{formatCurrency(seller.revenue[mainCurrency] || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Ganancia</span>
                                        <span>{formatCurrency(seller.profit[mainCurrency] || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Sucursal</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(data.salesByBranch).map(([id, branch]) => (
                            <div key={id} className="p-4 rounded-lg border">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">{branch.name}</h4>
                                    <span className="text-lg font-bold">{branch.count}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Ingresos</span>
                                    <span>{formatCurrency(branch.revenue[mainCurrency] || 0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Mes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(data.salesByMonth).map(([month, info]) => (
                            <div key={month} className="p-4 rounded-lg border">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">{month}</h4>
                                    <span className="text-lg font-bold">{info.count}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Ingresos</span>
                                    <span>{formatCurrency(info.revenue[mainCurrency] || 0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 
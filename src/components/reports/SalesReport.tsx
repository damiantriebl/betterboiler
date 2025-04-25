"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSalesReport } from "@/actions/reports/get-sales-report";
import type { SalesReport as SalesReportType } from "@/types/reports";
import { formatPrice } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface SalesReportProps {
    dateRange?: {
        from?: Date;
        to?: Date;
    };
}

export function SalesReport({ dateRange }: SalesReportProps) {
    const [report, setReport] = useState<SalesReportType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReport = async () => {
            try {
                setLoading(true);
                const data = await getSalesReport(dateRange);
                setReport(data);
            } catch (error) {
                console.error("Error loading sales report:", error);
            } finally {
                setLoading(false);
            }
        };

        loadReport();
    }, [dateRange]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!report) {
        return <div>No hay datos disponibles</div>;
    }

    return (
        <div className="space-y-6">
            {/* Resumen General */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumen de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total Ventas</p>
                            <p className="text-2xl font-bold">{report.summary.totalSales}</p>
                        </div>
                        {Object.entries(report.summary.totalRevenue).map(([currency, amount]) => (
                            <div key={currency} className="space-y-1">
                                <p className="text-sm text-muted-foreground">Ingresos ({currency})</p>
                                <p className="text-2xl font-bold">{formatPrice(amount, currency)}</p>
                            </div>
                        ))}
                        {Object.entries(report.summary.totalProfit).map(([currency, amount]) => (
                            <div key={currency} className="space-y-1">
                                <p className="text-sm text-muted-foreground">Ganancia ({currency})</p>
                                <p className="text-2xl font-bold">{formatPrice(amount, currency)}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Ventas por Vendedor */}
            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Vendedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendedor</TableHead>
                                <TableHead>Ventas</TableHead>
                                <TableHead>Ingresos</TableHead>
                                <TableHead>Ganancia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(report.salesBySeller).map(([id, data]) => (
                                <TableRow key={id}>
                                    <TableCell className="font-medium">{data.name}</TableCell>
                                    <TableCell>{data.count}</TableCell>
                                    <TableCell>
                                        {Object.entries(data.revenue).map(([currency, amount]) => (
                                            <div key={currency}>{formatPrice(amount, currency)}</div>
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        {Object.entries(data.profit).map(([currency, amount]) => (
                                            <div key={currency}>{formatPrice(amount, currency)}</div>
                                        ))}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Ventas por Sucursal */}
            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Sucursal</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Ventas</TableHead>
                                <TableHead>Ingresos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(report.salesByBranch).map(([id, data]) => (
                                <TableRow key={id}>
                                    <TableCell className="font-medium">{data.name}</TableCell>
                                    <TableCell>{data.count}</TableCell>
                                    <TableCell>
                                        {Object.entries(data.revenue).map(([currency, amount]) => (
                                            <div key={currency}>{formatPrice(amount, currency)}</div>
                                        ))}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Ventas por Mes */}
            <Card>
                <CardHeader>
                    <CardTitle>Ventas por Mes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mes</TableHead>
                                <TableHead>Ventas</TableHead>
                                <TableHead>Ingresos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(report.salesByMonth)
                                .sort((a, b) => b[0].localeCompare(a[0])) // Ordenar por fecha descendente
                                .map(([month, data]) => (
                                    <TableRow key={month}>
                                        <TableCell className="font-medium">
                                            {new Date(month).toLocaleDateString("es", {
                                                year: "numeric",
                                                month: "long",
                                            })}
                                        </TableCell>
                                        <TableCell>{data.count}</TableCell>
                                        <TableCell>
                                            {Object.entries(data.revenue).map(([currency, amount]) => (
                                                <div key={currency}>{formatPrice(amount, currency)}</div>
                                            ))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
} 
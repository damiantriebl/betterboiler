"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Loader2, LineChart, Download } from "lucide-react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { getInventoryStatusReport } from "@/actions/reports/get-inventory-report";
import { getSalesReport } from "@/actions/reports/get-sales-report";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getSuppliersReport } from "@/actions/reports/get-suppliers-report";
import type { ReportFilters } from "@/types/reports";
import { useOrganization } from "@/hooks/use-organization";
import type { DateRange } from "react-day-picker";
import { InventoryReport } from "@/components/custom/reports/InventoryReport";
import type { InventoryStatusReport } from "@/types/reports";
import { SalesReport } from "@/components/reports/SalesReport";

const reportFetchers = {
    "inventory-status": getInventoryStatusReport,
    "inventory-value": getInventoryStatusReport,
    "sales-by-period": getSalesReport,
    "sales-profitability": getSalesReport,
    "active-reservations": getReservationsReport,
    "reservation-conversion": getReservationsReport,
    "purchases-by-supplier": getSuppliersReport,
    "cost-analysis": getSuppliersReport,
} as const;

export default function ReportsPage() {
    const { organization, loading: orgLoading, error: orgError } = useOrganization();
    const orgId = organization?.id ?? "";
    const [selectedDateRange, setSelectedDateRange] = useState<PredefinedDateRange>("currentMonth");
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
    const [reportLoading, setReportLoading] = useState(false);
    const [inventoryReport, setInventoryReport] = useState<InventoryStatusReport | null>(null);
    const [filters, setFilters] = useState<Omit<ReportFilters, 'dateRange'> & { dateRange?: DateRange }>({
        organizationId: orgId,
        dateRange: undefined,
        branchId: "all",
        brandId: "all",
        modelId: "all",
    });

    const getPredefinedDateRange = (range: PredefinedDateRange): DateRange => {
        const now = new Date();
        switch (range) {
            case "today":
                return { from: startOfDay(now), to: endOfDay(now) };
            case "currentMonth":
                return { from: startOfMonth(now), to: endOfMonth(now) };
            case "lastMonth":
                const lastMonth = subMonths(now, 1);
                return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
            case "ytd":
                return { from: startOfYear(now), to: now };
            case "lastYear":
                const lastYear = subYears(now, 1);
                return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
            default:
                return customDateRange || { from: undefined, to: undefined };
        }
    };

    const handleDateRangeChange = (range: PredefinedDateRange) => {
        setSelectedDateRange(range);
        const newDateRange = (range === "custom" ? customDateRange : getPredefinedDateRange(range));
        setFilters(prev => ({ ...prev, dateRange: newDateRange }));
    };

    const handleCustomDateRangeChange = (range: DateRange | undefined) => {
        setCustomDateRange(range);
        if (selectedDateRange === "custom") {
            setFilters(prev => ({ ...prev, dateRange: range }));
        }
    };

    const handleGenerateReport = async (reportType: keyof typeof reportFetchers) => {
        if (!organization?.id) return;

        setReportLoading(true);
        try {
            const fetcher = reportFetchers[reportType];
            if (fetcher) {
                const reportData = await fetcher({ ...filters, organizationId: organization.id });
                if (reportType.includes("inventory")) setInventoryReport(reportData as InventoryStatusReport);
                console.log("Reporte generado:", reportData);
            }
        } catch (error) {
            console.error("Error generando reporte:", error);
        } finally {
            setReportLoading(false);
        }
    };

    const handleExportInventoryPDF = async () => {
        if (!organization?.id) return;

        setReportLoading(true);
        try {
            const response = await fetch("/api/reports/inventory/generate-pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ dateRange: filters.dateRange }),
            });

            if (!response.ok) throw new Error("Error generando PDF");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "reporte-inventario.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exportando PDF:", error);
        } finally {
            setReportLoading(false);
        }
    };

    const handleExportSalesPDF = async () => {
        if (!organization?.id) return;

        setReportLoading(true);
        try {
            const response = await fetch("/api/reports/sales/generate-pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    dateRange: filters.dateRange,
                    organizationId: organization.id,
                    branchId: filters.branchId,
                    brandId: filters.brandId
                }),
            });

            if (!response.ok) throw new Error("Error generando PDF");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "reporte-ventas.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exportando PDF:", error);
        } finally {
            setReportLoading(false);
        }
    };

    if (!organization) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="py-10">
                        <div className="text-center text-muted-foreground">
                            {orgLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Cargando organización...</span>
                                </div>
                            ) : orgError ? (
                                <div className="text-destructive">Error: {orgError.message}</div>
                            ) : (
                                "No hay una organización seleccionada"
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Reportes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="inventory" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="inventory">Inventario</TabsTrigger>
                            <TabsTrigger value="sales">Ventas</TabsTrigger>
                            <TabsTrigger value="reservations">Reservas</TabsTrigger>
                            <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
                        </TabsList>

                        <TabsContent value="inventory" className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant={selectedDateRange === "today" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("today")}
                                >
                                    Hoy
                                </Button>
                                <Button
                                    variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("currentMonth")}
                                >
                                    Este Mes
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastMonth")}
                                >
                                    Mes Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "ytd" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("ytd")}
                                >
                                    Este Año
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastYear")}
                                >
                                    Año Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "custom" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("custom")}
                                >
                                    Personalizado
                                </Button>
                            </div>

                            {selectedDateRange === "custom" && (
                                <DatePickerWithRange
                                    value={customDateRange}
                                    onChange={handleCustomDateRangeChange}
                                />
                            )}

                            <div className="flex flex-wrap gap-4">
                                <Select
                                    value={filters.branchId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, branchId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add branch options */}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.brandId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, brandId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Marca" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add brand options */}
                                    </SelectContent>
                                </Select>

                                <Button onClick={() => setFilters({
                                    organizationId: orgId,
                                    branchId: "all",
                                    brandId: "all",
                                    modelId: "all"
                                })}>
                                    Limpiar Filtros
                                </Button>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button
                                    onClick={() => handleGenerateReport("inventory-status")}
                                    disabled={reportLoading}
                                >
                                    {reportLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <LineChart className="mr-2 h-4 w-4" />
                                            Generar Reporte
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleExportInventoryPDF}
                                    disabled={reportLoading || !inventoryReport}
                                    variant="outline"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar PDF
                                </Button>
                            </div>

                            {inventoryReport && <InventoryReport data={inventoryReport} />}
                        </TabsContent>

                        <TabsContent value="sales" className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant={selectedDateRange === "today" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("today")}
                                >
                                    Hoy
                                </Button>
                                <Button
                                    variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("currentMonth")}
                                >
                                    Este Mes
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastMonth")}
                                >
                                    Mes Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "ytd" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("ytd")}
                                >
                                    Este Año
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastYear")}
                                >
                                    Año Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "custom" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("custom")}
                                >
                                    Personalizado
                                </Button>
                            </div>

                            {selectedDateRange === "custom" && (
                                <DatePickerWithRange
                                    value={customDateRange}
                                    onChange={handleCustomDateRangeChange}
                                />
                            )}

                            <div className="flex flex-wrap gap-4">
                                <Select
                                    value={filters.branchId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, branchId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add branch options */}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.brandId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, brandId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Marca" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add brand options */}
                                    </SelectContent>
                                </Select>

                                <Button onClick={() => setFilters({
                                    organizationId: orgId,
                                    branchId: "all",
                                    brandId: "all",
                                    modelId: "all"
                                })}>
                                    Limpiar Filtros
                                </Button>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button
                                    onClick={() => handleGenerateReport("sales-by-period")}
                                    disabled={reportLoading}
                                >
                                    {reportLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <LineChart className="mr-2 h-4 w-4" />
                                            Generar Reporte
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleExportSalesPDF}
                                    disabled={reportLoading}
                                    variant="outline"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar PDF
                                </Button>
                            </div>

                            {/* Contenido del tab seleccionado */}
                            <div className="mt-4">
                                <SalesReport dateRange={filters.dateRange} />
                            </div>
                        </TabsContent>

                        <TabsContent value="reservations" className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant={selectedDateRange === "today" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("today")}
                                >
                                    Hoy
                                </Button>
                                <Button
                                    variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("currentMonth")}
                                >
                                    Este Mes
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastMonth")}
                                >
                                    Mes Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "ytd" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("ytd")}
                                >
                                    Este Año
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastYear")}
                                >
                                    Año Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "custom" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("custom")}
                                >
                                    Personalizado
                                </Button>
                            </div>

                            {selectedDateRange === "custom" && (
                                <DatePickerWithRange
                                    value={customDateRange}
                                    onChange={handleCustomDateRangeChange}
                                />
                            )}

                            <div className="flex flex-wrap gap-4">
                                <Select
                                    value={filters.branchId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, branchId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add branch options */}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.brandId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, brandId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Marca" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add brand options */}
                                    </SelectContent>
                                </Select>

                                <Button onClick={() => setFilters({
                                    organizationId: orgId,
                                    branchId: "all",
                                    brandId: "all",
                                    modelId: "all"
                                })}>
                                    Limpiar Filtros
                                </Button>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button
                                    onClick={() => handleGenerateReport("active-reservations")}
                                    disabled={reportLoading}
                                >
                                    {reportLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <LineChart className="mr-2 h-4 w-4" />
                                            Generar Reporte
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleExportInventoryPDF}
                                    disabled={reportLoading || !inventoryReport}
                                    variant="outline"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar PDF
                                </Button>
                            </div>

                            {/* Contenido del tab seleccionado */}
                            <div className="mt-4">
                                <div>Reporte de Reservas (En desarrollo)</div>
                            </div>
                        </TabsContent>

                        <TabsContent value="suppliers" className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant={selectedDateRange === "today" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("today")}
                                >
                                    Hoy
                                </Button>
                                <Button
                                    variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("currentMonth")}
                                >
                                    Este Mes
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastMonth")}
                                >
                                    Mes Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "ytd" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("ytd")}
                                >
                                    Este Año
                                </Button>
                                <Button
                                    variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("lastYear")}
                                >
                                    Año Anterior
                                </Button>
                                <Button
                                    variant={selectedDateRange === "custom" ? "default" : "outline"}
                                    onClick={() => handleDateRangeChange("custom")}
                                >
                                    Personalizado
                                </Button>
                            </div>

                            {selectedDateRange === "custom" && (
                                <DatePickerWithRange
                                    value={customDateRange}
                                    onChange={handleCustomDateRangeChange}
                                />
                            )}

                            <div className="flex flex-wrap gap-4">
                                <Select
                                    value={filters.branchId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, branchId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add branch options */}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.brandId}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, brandId: value }))}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Marca" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {/* Add brand options */}
                                    </SelectContent>
                                </Select>

                                <Button onClick={() => setFilters({
                                    organizationId: orgId,
                                    branchId: "all",
                                    brandId: "all",
                                    modelId: "all"
                                })}>
                                    Limpiar Filtros
                                </Button>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button
                                    onClick={() => handleGenerateReport("purchases-by-supplier")}
                                    disabled={reportLoading}
                                >
                                    {reportLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <LineChart className="mr-2 h-4 w-4" />
                                            Generar Reporte
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleExportInventoryPDF}
                                    disabled={reportLoading || !inventoryReport}
                                    variant="outline"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar PDF
                                </Button>
                            </div>

                            {/* Contenido del tab seleccionado */}
                            <div className="mt-4">
                                <div>Reporte de Proveedores (En desarrollo)</div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export type PredefinedDateRange = "today" | "currentMonth" | "lastMonth" | "ytd" | "lastYear" | "custom";

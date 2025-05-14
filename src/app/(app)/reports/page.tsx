"use client";

import { getInventoryStatusReport } from "@/actions/reports/get-inventory-report";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getSalesReport } from "@/actions/reports/get-sales-report";
import { getSuppliersReport } from "@/actions/reports/get-suppliers-report";
import { InventoryReport } from "@/components/custom/reports/InventoryReport";
import { SalesReport } from "@/components/custom/reports/SalesReport";
import { ReservationsReport } from "@/components/reports/ReservationsReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/use-organization";
import type { ReportFilters } from "@/types/reports";
import type {
  InventoryStatusReport,
  ReservationsReport as ReservationsReportType,
  SalesReport as SalesReportType,
} from "@/types/reports";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { Download, LineChart, Loader2 } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

type LocalFilters = {
  organizationId: string;
  branchId: string;
  brandId: string;
  modelId: string;
  dateRange: DateRange | undefined;
};

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
  const [selectedDateRange, setSelectedDateRange] = useState<string>("currentMonth");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [reportLoading, setReportLoading] = useState(false);
  const [inventoryReport, setInventoryReport] = useState<InventoryStatusReport | null>(null);
  const [reservationsReport, setReservationsReport] = useState<ReservationsReportType | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReportType | null>(null);
  const [filters, setFilters] = useState<LocalFilters>({
    organizationId: orgId,
    branchId: "all",
    brandId: "all",
    modelId: "all",
    dateRange: undefined,
  });

  const handleDateRangeChange = (newRange: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: newRange,
    }));
  };

  const handleCustomDateRangeChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (selectedDateRange === "custom") {
      setFilters((prev) => ({ ...prev, dateRange: range }));
    }
  };

  const handleGenerateReport = async (type: string) => {
    if (!organization?.id) return;

    setReportLoading(true);
    try {
      const requestData: LocalFilters = {
        ...filters,
        organizationId: organization.id,
      };

      const response = await fetch(`/api/reports/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error("Error generando reporte");

      const data = await response.json();
      switch (type) {
        case "inventory-status":
          setInventoryReport(data);
          break;
        case "reservations":
          setReservationsReport(data);
          break;
        case "sales":
          setSalesReport(data);
          break;
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
          brandId: filters.brandId,
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

  const handleExportReservationsPDF = async () => {
    if (!organization?.id) return;

    setReportLoading(true);
    try {
      const response = await fetch("/api/reports/reservation/generate-pdf", {
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
      a.download = "reporte-reservas.pdf";
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

  const handleClearFilters = () => {
    setFilters({
      organizationId: orgId,
      branchId: "all",
      brandId: "all",
      modelId: "all",
      dateRange: undefined,
    });
    setSelectedDateRange("");
  };

  const handleBranchChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      branchId: value,
      dateRange: prev.dateRange,
    }));
  };

  const handleBrandChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      brandId: value,
      dateRange: prev.dateRange,
    }));
  };

  const handleModelChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      modelId: value,
      dateRange: prev.dateRange,
    }));
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
                  onClick={() => handleDateRangeChange({ from: new Date(), to: new Date() })}
                >
                  Hoy
                </Button>
                <Button
                  variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
                    })
                  }
                >
                  Este Mes
                </Button>
                <Button
                  variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                    })
                  }
                >
                  Mes Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "ytd" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), 0, 1),
                      to: new Date(),
                    })
                  }
                >
                  Este Año
                </Button>
                <Button
                  variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear() - 1, 0, 1),
                      to: new Date(new Date().getFullYear() - 1, 11, 31),
                    })
                  }
                >
                  Año Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "custom" ? "default" : "outline"}
                  onClick={() => handleDateRangeChange(undefined)}
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
                <Select value={filters.branchId} onValueChange={handleBranchChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {/* Add branch options */}
                  </SelectContent>
                </Select>

                <Select value={filters.brandId} onValueChange={handleBrandChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {/* Add brand options */}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() =>
                    setFilters({
                      organizationId: orgId,
                      branchId: "all",
                      brandId: "all",
                      modelId: "all",
                      dateRange: undefined,
                    })
                  }
                >
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
                  onClick={() => handleDateRangeChange({ from: new Date(), to: new Date() })}
                >
                  Hoy
                </Button>
                <Button
                  variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
                    })
                  }
                >
                  Este Mes
                </Button>
                <Button
                  variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                    })
                  }
                >
                  Mes Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "ytd" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), 0, 1),
                      to: new Date(),
                    })
                  }
                >
                  Este Año
                </Button>
                <Button
                  variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear() - 1, 0, 1),
                      to: new Date(new Date().getFullYear() - 1, 11, 31),
                    })
                  }
                >
                  Año Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "custom" ? "default" : "outline"}
                  onClick={() => handleDateRangeChange(undefined)}
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
                <Select value={filters.branchId} onValueChange={handleBranchChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {/* Add branch options */}
                  </SelectContent>
                </Select>

                <Select value={filters.brandId} onValueChange={handleBrandChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {/* Add brand options */}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() =>
                    setFilters({
                      organizationId: orgId,
                      branchId: "all",
                      brandId: "all",
                      modelId: "all",
                      dateRange: undefined,
                    })
                  }
                >
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
                <Button onClick={handleExportSalesPDF} disabled={reportLoading} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>

              {/* Contenido del tab seleccionado */}
              <div className="mt-4">
                <SalesReport data={salesReport} dateRange={filters.dateRange} />
              </div>
            </TabsContent>

            <TabsContent value="reservations" className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  variant={selectedDateRange === "today" ? "default" : "outline"}
                  onClick={() => handleDateRangeChange({ from: new Date(), to: new Date() })}
                >
                  Hoy
                </Button>
                <Button
                  variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
                    })
                  }
                >
                  Este Mes
                </Button>
                <Button
                  variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                    })
                  }
                >
                  Mes Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "ytd" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), 0, 1),
                      to: new Date(),
                    })
                  }
                >
                  Este Año
                </Button>
                <Button
                  variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear() - 1, 0, 1),
                      to: new Date(new Date().getFullYear() - 1, 11, 31),
                    })
                  }
                >
                  Año Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "custom" ? "default" : "outline"}
                  onClick={() => handleDateRangeChange(undefined)}
                >
                  Personalizado
                </Button>
              </div>

              {selectedDateRange === "custom" && (
                <DatePickerWithRange value={filters.dateRange} onChange={handleDateRangeChange} />
              )}

              <div className="flex justify-end gap-4">
                <Button
                  onClick={() => handleGenerateReport("reservations")}
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
                  onClick={handleExportReservationsPDF}
                  disabled={reportLoading}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>

              {/* Contenido del tab seleccionado */}
              <div className="mt-4">
                {reservationsReport ? (
                  <ReservationsReport data={reservationsReport} />
                ) : (
                  <div>Seleccione un rango de fechas y genere el reporte</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  variant={selectedDateRange === "today" ? "default" : "outline"}
                  onClick={() => handleDateRangeChange({ from: new Date(), to: new Date() })}
                >
                  Hoy
                </Button>
                <Button
                  variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
                    })
                  }
                >
                  Este Mes
                </Button>
                <Button
                  variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                      to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                    })
                  }
                >
                  Mes Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "ytd" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear(), 0, 1),
                      to: new Date(),
                    })
                  }
                >
                  Este Año
                </Button>
                <Button
                  variant={selectedDateRange === "lastYear" ? "default" : "outline"}
                  onClick={() =>
                    handleDateRangeChange({
                      from: new Date(new Date().getFullYear() - 1, 0, 1),
                      to: new Date(new Date().getFullYear() - 1, 11, 31),
                    })
                  }
                >
                  Año Anterior
                </Button>
                <Button
                  variant={selectedDateRange === "custom" ? "default" : "outline"}
                  onClick={() => handleDateRangeChange(undefined)}
                >
                  Personalizado
                </Button>
              </div>

              {selectedDateRange === "custom" && (
                <DatePickerWithRange value={filters.dateRange} onChange={handleDateRangeChange} />
              )}

              <div className="flex flex-wrap gap-4">
                <Select value={filters.branchId} onValueChange={handleBranchChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {/* Add branch options */}
                  </SelectContent>
                </Select>

                <Select value={filters.brandId} onValueChange={handleBrandChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {/* Add brand options */}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() =>
                    setFilters({
                      organizationId: orgId,
                      branchId: "all",
                      brandId: "all",
                      modelId: "all",
                      dateRange: undefined,
                    })
                  }
                >
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

export type PredefinedDateRange =
  | "today"
  | "currentMonth"
  | "lastMonth"
  | "ytd"
  | "lastYear"
  | "custom";

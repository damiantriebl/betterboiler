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
import type { Branch } from "@prisma/client";
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
import { Download, LineChart, Loader2, FileText } from "lucide-react";
import { useState, useEffect, startTransition } from "react";
import type { DateRange } from "react-day-picker";
import { getBranchesForOrganizationAction } from "@/actions/get-Branches-For-Organization-Action";

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

interface PettyCashReportLocalFilters {
  dateRange: DateRange | undefined;
  branchId: string | "all";
}

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

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const [pettyCashFilters, setPettyCashFilters] = useState<PettyCashReportLocalFilters>({
    dateRange: undefined,
    branchId: "all",
  });
  const [isPettyCashReportLoading, setIsPettyCashReportLoading] = useState(false);

  const getDateRangeFromPreset = (preset: string): DateRange | undefined => {
    const now = new Date();
    switch (preset) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "currentMonth":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "lastMonth":
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        return { from: lastMonthStart, to: lastMonthEnd };
      case "ytd":
        return { from: startOfYear(now), to: endOfDay(now) };
      case "lastYear":
        const lastYearStart = startOfYear(subYears(now, 1));
        const lastYearEnd = endOfYear(subYears(now, 1));
        return { from: lastYearStart, to: lastYearEnd };
      case "custom":
        return customDateRange;
      default:
        return undefined;
    }
  };

  const updateDateFilters = (newPreset: string) => {
    setSelectedDateRange(newPreset);
    const newDateRange = getDateRangeFromPreset(newPreset);
    setFilters(prev => ({ ...prev, dateRange: newDateRange }));
    setPettyCashFilters(prev => ({ ...prev, dateRange: newDateRange }));
    if (newPreset !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  useEffect(() => {
    updateDateFilters(selectedDateRange);
  }, []);

  useEffect(() => {
    const loadBranches = () => {
      if (!organization?.id) {
        setBranches([]);
        return;
      }

      setIsLoadingBranches(true);
      startTransition(() => {
        getBranchesForOrganizationAction(organization.id)
          .then(branchesData => {
            setBranches(branchesData || []);
          })
          .catch(error => {
            console.error("Error cargando sucursales con getBranchesForOrganizationAction:", error);
            setBranches([]);
          })
          .finally(() => {
            setIsLoadingBranches(false);
          });
      });
    };

    loadBranches();
  }, [organization?.id]);

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

  const handleGeneratePettyCashReportPDF = async () => {
    if (!organization?.id || !pettyCashFilters.dateRange?.from || !pettyCashFilters.dateRange?.to) {
      console.error("Por favor, seleccione un rango de fechas para el reporte de caja chica.");
      return;
    }
    setIsPettyCashReportLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate: pettyCashFilters.dateRange.from.toISOString(),
        toDate: pettyCashFilters.dateRange.to.toISOString(),
      });

      if (pettyCashFilters.branchId && pettyCashFilters.branchId !== "all") {
        params.append("branchId", pettyCashFilters.branchId);
      }

      const response = await fetch(
        `/api/reports/petty-cash-movements/generate-pdf?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Error al generar el reporte PDF de caja chica"
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "petty_cash_movements_report.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generando PDF de Caja Chica:", error);
    } finally {
      setIsPettyCashReportLoading(false);
    }
  };

  if (orgLoading) {
    return <p>Cargando organización...</p>;
  }

  if (orgError) {
    return <p>Error al cargar la organización: {orgError.message}</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Reportes</h1>
      <Tabs defaultValue="inventory-status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory-status">Inventario</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="petty-cash">Caja Chica</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory-status" className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              variant={selectedDateRange === "today" ? "default" : "outline"}
              onClick={() => updateDateFilters("today")}
            >
              Hoy
            </Button>
            <Button
              variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("currentMonth")}
            >
              Este Mes
            </Button>
            <Button
              variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastMonth")}
            >
              Mes Anterior
            </Button>
            <Button
              variant={selectedDateRange === "ytd" ? "default" : "outline"}
              onClick={() => updateDateFilters("ytd")}
            >
              Este Año
            </Button>
            <Button
              variant={selectedDateRange === "lastYear" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastYear")}
            >
              Año Anterior
            </Button>
            <Button
              variant={selectedDateRange === "custom" ? "default" : "outline"}
              onClick={() => updateDateFilters("custom")}
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
              </SelectContent>
            </Select>

            <Select value={filters.brandId} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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
              onClick={() => updateDateFilters("today")}
            >
              Hoy
            </Button>
            <Button
              variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("currentMonth")}
            >
              Este Mes
            </Button>
            <Button
              variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastMonth")}
            >
              Mes Anterior
            </Button>
            <Button
              variant={selectedDateRange === "ytd" ? "default" : "outline"}
              onClick={() => updateDateFilters("ytd")}
            >
              Este Año
            </Button>
            <Button
              variant={selectedDateRange === "lastYear" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastYear")}
            >
              Año Anterior
            </Button>
            <Button
              variant={selectedDateRange === "custom" ? "default" : "outline"}
              onClick={() => updateDateFilters("custom")}
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
              </SelectContent>
            </Select>

            <Select value={filters.brandId} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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

          <div className="mt-4">
            <SalesReport data={salesReport} dateRange={filters.dateRange} />
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              variant={selectedDateRange === "today" ? "default" : "outline"}
              onClick={() => updateDateFilters("today")}
            >
              Hoy
            </Button>
            <Button
              variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("currentMonth")}
            >
              Este Mes
            </Button>
            <Button
              variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastMonth")}
            >
              Mes Anterior
            </Button>
            <Button
              variant={selectedDateRange === "ytd" ? "default" : "outline"}
              onClick={() => updateDateFilters("ytd")}
            >
              Este Año
            </Button>
            <Button
              variant={selectedDateRange === "lastYear" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastYear")}
            >
              Año Anterior
            </Button>
            <Button
              variant={selectedDateRange === "custom" ? "default" : "outline"}
              onClick={() => updateDateFilters("custom")}
            >
              Personalizado
            </Button>
          </div>

          {selectedDateRange === "custom" && (
            <DatePickerWithRange value={customDateRange} onChange={handleCustomDateRangeChange} />
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
              onClick={() => updateDateFilters("today")}
            >
              Hoy
            </Button>
            <Button
              variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("currentMonth")}
            >
              Este Mes
            </Button>
            <Button
              variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastMonth")}
            >
              Mes Anterior
            </Button>
            <Button
              variant={selectedDateRange === "ytd" ? "default" : "outline"}
              onClick={() => updateDateFilters("ytd")}
            >
              Este Año
            </Button>
            <Button
              variant={selectedDateRange === "lastYear" ? "default" : "outline"}
              onClick={() => updateDateFilters("lastYear")}
            >
              Año Anterior
            </Button>
            <Button
              variant={selectedDateRange === "custom" ? "default" : "outline"}
              onClick={() => updateDateFilters("custom")}
            >
              Personalizado
            </Button>
          </div>

          {selectedDateRange === "custom" && (
            <DatePickerWithRange value={customDateRange} onChange={handleCustomDateRangeChange} />
          )}

          <div className="flex flex-wrap gap-4">
            <Select value={filters.branchId} onValueChange={handleBranchChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.brandId} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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

          <div className="mt-4">
            <div>Reporte de Proveedores (En desarrollo)</div>
          </div>
        </TabsContent>

        <TabsContent value="petty-cash" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Reporte de Movimientos de Caja Chica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: "Hoy", value: "today" },
                  { label: "Este Mes", value: "currentMonth" },
                  { label: "Mes Anterior", value: "lastMonth" },
                  { label: "Este Año", value: "ytd" },
                  { label: "Año Anterior", value: "lastYear" },
                  { label: "Personalizado", value: "custom" },
                ].map(preset => (
                  <Button
                    key={preset.value}
                    variant={selectedDateRange === preset.value ? "default" : "outline"}
                    onClick={() => updateDateFilters(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {selectedDateRange === "custom" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccione Rango Personalizado
                  </label>
                  <DatePickerWithRange
                    value={customDateRange}
                    onChange={(range) => {
                      setCustomDateRange(range);
                      if (selectedDateRange === "custom") {
                        setPettyCashFilters(prev => ({ ...prev, dateRange: range }));
                      }
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label
                    htmlFor="pettyCashBranch"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Sucursal
                  </label>
                  <Select
                    value={pettyCashFilters.branchId}
                    onValueChange={(value) =>
                      setPettyCashFilters((prev) => ({ ...prev, branchId: value }))
                    }
                    disabled={isLoadingBranches}
                  >
                    <SelectTrigger id="pettyCashBranch" className="w-full">
                      <SelectValue placeholder={isLoadingBranches ? "Cargando..." : "Seleccionar sucursal"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sucursales</SelectItem>
                      <SelectItem value="general_account">Cuenta General</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGeneratePettyCashReportPDF}
                disabled={isPettyCashReportLoading || !pettyCashFilters.dateRange?.from}
                className="w-full md:w-auto"
              >
                {isPettyCashReportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar PDF Caja Chica
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

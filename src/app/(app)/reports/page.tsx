"use client";

import { getCurrentAccountsReport } from "@/actions/reports/get-current-accounts-report";
import type { CurrentAccountsReport as CurrentAccountsReportType } from "@/actions/reports/get-current-accounts-report";
import { getInventoryStatusReport } from "@/actions/reports/get-inventory-report-unified";
import { getPettyCashReport } from "@/actions/reports/get-petty-cash-report";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getSalesReport } from "@/actions/reports/get-sales-report";
import { getBranchesForOrganizationAction } from "@/actions/util";
import { CurrentAccountsReport } from "@/components/custom/reports/CurrentAccountsReport";
import { InventoryReport } from "@/components/custom/reports/InventoryReport";
import { PettyCashReport } from "@/components/custom/reports/PettyCashReport";
import { ReportTabContent } from "@/components/custom/reports/ReportTabContent";
import { SalesReport } from "@/components/custom/reports/SalesReport";
import { ReservationsReport } from "@/components/reports/ReservationsReport";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useSessionStore } from "@/stores/SessionStore";
import type { ReportDataForPdf } from "@/types/PettyCashActivity";
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
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";
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
  "purchases-by-supplier": getCurrentAccountsReport,
  "cost-analysis": getCurrentAccountsReport,
  "petty-cash": getPettyCashReport,
} as const;

interface PettyCashReportLocalFilters {
  dateRange: DateRange | undefined;
  branchId: string | "all";
}

export default function ReportsPage() {
  const organizationId = useSessionStore((state) => state.organizationId);
  const organizationName = useSessionStore((state) => state.organizationName);

  const organization = organizationId
    ? {
        id: organizationId,
        name: organizationName || "Organización",
      }
    : null;

  const [selectedDateRange, setSelectedDateRange] = useState<string>("currentMonth");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [reportLoading, setReportLoading] = useState(false);
  const [inventoryReport, setInventoryReport] = useState<InventoryStatusReport | null>(null);
  const [reservationsReport, setReservationsReport] = useState<ReservationsReportType | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReportType | null>(null);
  const [currentAccountsReport, setCurrentAccountsReport] =
    useState<CurrentAccountsReportType | null>(null);
  const [pettyCashReport, setPettyCashReport] = useState<ReportDataForPdf[] | null>(null);
  const [filters, setFilters] = useState<LocalFilters>({
    organizationId: organizationId || "",
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

  useEffect(() => {
    if (organizationId) {
      setFilters((prev) => ({ ...prev, organizationId }));
    }
  }, [organizationId]);

  const now = new Date();
  const dateRangePresets: Record<string, DateRange> = {
    today: { from: startOfDay(now), to: endOfDay(now) },
    currentMonth: { from: startOfMonth(now), to: endOfMonth(now) },
    lastMonth: {
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1)),
    },
    ytd: { from: startOfYear(now), to: endOfDay(now) },
    lastYear: {
      from: startOfYear(subYears(now, 1)),
      to: endOfYear(subYears(now, 1)),
    },
  };

  const getDateRangeFromPreset = (rangeKey: string): DateRange | undefined => {
    if (rangeKey === "custom") {
      return customDateRange;
    }
    return dateRangePresets[rangeKey];
  };

  const updateDateFilters = (rangeKey: string) => {
    setSelectedDateRange(rangeKey);
    const newDateRange = getDateRangeFromPreset(rangeKey);
    setFilters((prev) => ({ ...prev, dateRange: newDateRange }));
    setPettyCashFilters((prev) => ({ ...prev, dateRange: newDateRange }));
    if (rangeKey !== "custom") {
      setCustomDateRange(undefined);
    }
  };

  useEffect(() => {
    const loadBranches = () => {
      if (!organizationId) {
        setBranches([]);
        return;
      }

      setIsLoadingBranches(true);
      startTransition(() => {
        getBranchesForOrganizationAction(organizationId)
          .then((branchesData) => {
            setBranches(branchesData || []);
          })
          .catch((error) => {
            console.error("Error cargando sucursales con getBranchesForOrganizationAction:", error);
            setBranches([]);
          })
          .finally(() => {
            setIsLoadingBranches(false);
          });
      });
    };

    loadBranches();
  }, [organizationId]);

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
    if (!organizationId) return;

    setReportLoading(true);
    try {
      // Usar las acciones directas del servidor en lugar de APIs
      switch (type) {
        case "inventory-status": {
          // Para inventario, usamos la acción directa
          const inventoryData = await getInventoryStatusReport(filters.dateRange);
          setInventoryReport(inventoryData);
          return;
        }

        case "sales-by-period": {
          // Para sales, usar acción directa con el rango de fechas
          const salesData = await getSalesReport(filters.dateRange);
          setSalesReport(salesData);
          return;
        }

        case "reservations": {
          // Para reservas, usar acción directa
          const reservationsData = await getReservationsReport(filters.dateRange);
          setReservationsReport(reservationsData);
          return;
        }

        case "petty-cash": {
          // Para caja chica, usar acción directa
          const pettyCashData = await getPettyCashReport(
            pettyCashFilters.dateRange,
            pettyCashFilters.branchId,
          );
          setPettyCashReport(pettyCashData);
          return;
        }

        case "current-accounts": {
          // Para cuentas corrientes, usar acción directa
          const currentAccountsData = await getCurrentAccountsReport(
            filters.dateRange,
            filters.branchId,
          );
          setCurrentAccountsReport(currentAccountsData);
          return;
        }

        default:
          throw new Error(`Tipo de reporte no soportado: ${type}`);
      }
    } catch (error) {
      console.error("Error generando reporte:", error);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportInventoryPDF = async () => {
    if (!organizationId) return;

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
    if (!organizationId) return;

    setReportLoading(true);
    try {
      const response = await fetch("/api/reports/sales/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRange: filters.dateRange,
          organizationId,
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
    if (!organizationId) return;

    setReportLoading(true);
    try {
      const response = await fetch("/api/reports/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRange: filters.dateRange,
          branchId: filters.branchId,
          brandId: filters.brandId,
        }),
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
      organizationId: organizationId || "",
      branchId: "all",
      brandId: "all",
      modelId: "all",
      dateRange: undefined,
    });
    setSelectedDateRange("currentMonth");
    setCustomDateRange(undefined);
  };

  const handleBranchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, branchId: value }));
    setPettyCashFilters((prev) => ({ ...prev, branchId: value }));
  };

  const handleBrandChange = (value: string) => {
    setFilters((prev) => ({ ...prev, brandId: value }));
  };

  const handleModelChange = (value: string) => {
    setFilters((prev) => ({ ...prev, modelId: value }));
  };

  const handleGeneratePettyCashReportPDF = async () => {
    if (!organizationId) return;

    setIsPettyCashReportLoading(true);
    try {
      // Verificar que tenemos un rango de fechas
      if (!pettyCashFilters.dateRange?.from || !pettyCashFilters.dateRange?.to) {
        throw new Error("Por favor, seleccione un rango de fechas válido");
      }

      // Construir los parámetros para la API
      const params = new URLSearchParams({
        fromDate: pettyCashFilters.dateRange.from.toISOString(),
        toDate: pettyCashFilters.dateRange.to.toISOString(),
      });

      // Agregar branchId si no es "all"
      if (pettyCashFilters.branchId && pettyCashFilters.branchId !== "all") {
        params.append("branchId", pettyCashFilters.branchId);
      }

      const response = await fetch(
        `/api/reports/petty-cash-movements/generate-pdf?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || "Error generando PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reporte-caja-chica.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generando PDF de Caja Chica:", error);
      // Mostrar el error al usuario
      alert(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setIsPettyCashReportLoading(false);
    }
  };

  const handleExportCurrentAccountsPDF = async () => {
    if (!organizationId) return;

    setReportLoading(true);
    try {
      const response = await fetch("/api/reports/current-accounts/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRange: filters.dateRange,
          branchId: filters.branchId,
          brandId: filters.brandId,
        }),
      });

      if (!response.ok) throw new Error("Error generando PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reporte-cuentas-corrientes.pdf";
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

  if (!organizationId) {
    return (
      <div className="container max-w-none p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar la organización</AlertTitle>
          <AlertDescription>
            No se pudo obtener los datos de la organización. Por favor, recarga la página o contacta
            al soporte.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-none p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Reportes
        </h1>
      </div>

      <Tabs defaultValue="inventory-status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inventory-status" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Reservas
          </TabsTrigger>
          <TabsTrigger value="current-accounts" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cuentas Corrientes
          </TabsTrigger>
          <TabsTrigger value="petty-cash" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Caja Chica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory-status">
          <ReportTabContent
            selectedDateRange={selectedDateRange}
            customDateRange={customDateRange}
            onDateRangeChange={updateDateFilters}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            branchId={filters.branchId}
            brandId={filters.brandId}
            onBranchChange={handleBranchChange}
            onBrandChange={handleBrandChange}
            onClearFilters={handleClearFilters}
            branches={branches}
            onGenerateReport={() => handleGenerateReport("inventory-status")}
            onExportPDF={handleExportInventoryPDF}
            isGenerating={reportLoading}
            hasData={!!inventoryReport}
          >
            {inventoryReport && <InventoryReport data={inventoryReport} />}
          </ReportTabContent>
        </TabsContent>

        <TabsContent value="sales">
          <ReportTabContent
            selectedDateRange={selectedDateRange}
            customDateRange={customDateRange}
            onDateRangeChange={updateDateFilters}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            branchId={filters.branchId}
            brandId={filters.brandId}
            onBranchChange={handleBranchChange}
            onBrandChange={handleBrandChange}
            onClearFilters={handleClearFilters}
            branches={branches}
            onGenerateReport={() => handleGenerateReport("sales-by-period")}
            onExportPDF={handleExportSalesPDF}
            isGenerating={reportLoading}
            hasData={!!salesReport}
          >
            <SalesReport data={salesReport} dateRange={filters.dateRange} />
          </ReportTabContent>
        </TabsContent>

        <TabsContent value="reservations">
          <ReportTabContent
            selectedDateRange={selectedDateRange}
            customDateRange={customDateRange}
            onDateRangeChange={updateDateFilters}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            branchId={filters.branchId}
            brandId={filters.brandId}
            onBranchChange={handleBranchChange}
            onBrandChange={handleBrandChange}
            onClearFilters={handleClearFilters}
            branches={branches}
            onGenerateReport={() => handleGenerateReport("reservations")}
            onExportPDF={handleExportReservationsPDF}
            isGenerating={reportLoading}
            hasData={!!reservationsReport}
          >
            {reservationsReport ? (
              <ReservationsReport data={reservationsReport} />
            ) : (
              <div>Seleccione un rango de fechas y genere el reporte</div>
            )}
          </ReportTabContent>
        </TabsContent>

        <TabsContent value="current-accounts">
          <ReportTabContent
            selectedDateRange={selectedDateRange}
            customDateRange={customDateRange}
            onDateRangeChange={updateDateFilters}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            branchId={filters.branchId}
            brandId={filters.brandId}
            onBranchChange={handleBranchChange}
            onBrandChange={handleBrandChange}
            onClearFilters={handleClearFilters}
            branches={branches}
            onGenerateReport={() => handleGenerateReport("current-accounts")}
            onExportPDF={handleExportCurrentAccountsPDF}
            isGenerating={reportLoading}
            hasData={!!currentAccountsReport}
          >
            {currentAccountsReport ? (
              <CurrentAccountsReport data={currentAccountsReport} />
            ) : (
              <div>Seleccione un rango de fechas y genere el reporte</div>
            )}
          </ReportTabContent>
        </TabsContent>

        <TabsContent value="petty-cash">
          <ReportTabContent
            selectedDateRange={selectedDateRange}
            customDateRange={customDateRange}
            onDateRangeChange={updateDateFilters}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            branchId={pettyCashFilters.branchId}
            brandId="all"
            onBranchChange={(value) =>
              setPettyCashFilters((prev) => ({ ...prev, branchId: value }))
            }
            onBrandChange={() => {}} // No se usa para caja chica
            onClearFilters={handleClearFilters}
            branches={branches}
            onGenerateReport={() => handleGenerateReport("petty-cash")}
            onExportPDF={handleGeneratePettyCashReportPDF}
            isGenerating={reportLoading || isPettyCashReportLoading}
            hasData={!!pettyCashReport}
          >
            {pettyCashReport ? (
              <PettyCashReport data={pettyCashReport} />
            ) : (
              <div>Seleccione un rango de fechas y genere el reporte</div>
            )}
          </ReportTabContent>
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

import type { ReactNode } from "react";
import { DateRangeButtons } from "./DateRangeButtons";
import { ReportFilters } from "./ReportFilters";
import { ReportActions } from "./ReportActions";
import type { DateRange } from "react-day-picker";

interface ReportTabContentProps {
  // Date range props
  selectedDateRange: string;
  customDateRange: DateRange | undefined;
  onDateRangeChange: (rangeKey: string) => void;
  onCustomDateRangeChange: (range: DateRange | undefined) => void;

  // Filter props
  branchId: string;
  brandId: string;
  onBranchChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onClearFilters: () => void;
  branches?: Array<{ id: number; name: string }>;
  brands?: Array<{ id: number; name: string }>;

  // Action props
  onGenerateReport: () => void;
  onExportPDF: () => void;
  isGenerating: boolean;
  hasData: boolean;
  generateText?: string;
  exportText?: string;

  // Content
  children?: ReactNode;
}

export function ReportTabContent({
  selectedDateRange,
  customDateRange,
  onDateRangeChange,
  onCustomDateRangeChange,
  branchId,
  brandId,
  onBranchChange,
  onBrandChange,
  onClearFilters,
  branches,
  brands,
  onGenerateReport,
  onExportPDF,
  isGenerating,
  hasData,
  generateText,
  exportText,
  children,
}: ReportTabContentProps) {
  return (
    <div className="space-y-4">
      <DateRangeButtons
        selectedDateRange={selectedDateRange}
        customDateRange={customDateRange}
        onDateRangeChange={onDateRangeChange}
        onCustomDateRangeChange={onCustomDateRangeChange}
      />

      <ReportFilters
        branchId={branchId}
        brandId={brandId}
        onBranchChange={onBranchChange}
        onBrandChange={onBrandChange}
        onClearFilters={onClearFilters}
        branches={branches}
        brands={brands}
      />

      <ReportActions
        onGenerateReport={onGenerateReport}
        onExportPDF={onExportPDF}
        isGenerating={isGenerating}
        hasData={hasData}
        generateText={generateText}
        exportText={exportText}
      />

      {children}
    </div>
  );
}

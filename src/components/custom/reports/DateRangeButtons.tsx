import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

interface DateRangeButtonsProps {
  selectedDateRange: string;
  customDateRange: DateRange | undefined;
  onDateRangeChange: (rangeKey: string) => void;
  onCustomDateRangeChange: (range: DateRange | undefined) => void;
}

export function DateRangeButtons({
  selectedDateRange,
  customDateRange,
  onDateRangeChange,
  onCustomDateRangeChange,
}: DateRangeButtonsProps) {
  return (
    <>
      <div className="flex flex-wrap gap-4">
        <Button
          variant={selectedDateRange === "today" ? "default" : "outline"}
          onClick={() => onDateRangeChange("today")}
        >
          Hoy
        </Button>
        <Button
          variant={selectedDateRange === "currentMonth" ? "default" : "outline"}
          onClick={() => onDateRangeChange("currentMonth")}
        >
          Este Mes
        </Button>
        <Button
          variant={selectedDateRange === "lastMonth" ? "default" : "outline"}
          onClick={() => onDateRangeChange("lastMonth")}
        >
          Mes Anterior
        </Button>
        <Button
          variant={selectedDateRange === "ytd" ? "default" : "outline"}
          onClick={() => onDateRangeChange("ytd")}
        >
          Este Año
        </Button>
        <Button
          variant={selectedDateRange === "lastYear" ? "default" : "outline"}
          onClick={() => onDateRangeChange("lastYear")}
        >
          Año Anterior
        </Button>
        <Button
          variant={selectedDateRange === "custom" ? "default" : "outline"}
          onClick={() => onDateRangeChange("custom")}
        >
          Personalizado
        </Button>
      </div>

      {selectedDateRange === "custom" && (
        <DatePickerWithRange value={customDateRange} onChange={onCustomDateRangeChange} />
      )}
    </>
  );
}

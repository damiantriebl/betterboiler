import { Button } from "@/components/ui/button";
import { Download, LineChart, Loader2 } from "lucide-react";

interface ReportActionsProps {
  onGenerateReport: () => void;
  onExportPDF: () => void;
  isGenerating: boolean;
  hasData: boolean;
  generateText?: string;
  exportText?: string;
}

export function ReportActions({
  onGenerateReport,
  onExportPDF,
  isGenerating,
  hasData,
  generateText = "Generar Reporte",
  exportText = "Exportar PDF",
}: ReportActionsProps) {
  return (
    <div className="flex justify-end gap-4">
      <Button onClick={onGenerateReport} disabled={isGenerating}>
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <LineChart className="mr-2 h-4 w-4" />
            {generateText}
          </>
        )}
      </Button>
      <Button onClick={onExportPDF} disabled={isGenerating || !hasData} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        {exportText}
      </Button>
    </div>
  );
}

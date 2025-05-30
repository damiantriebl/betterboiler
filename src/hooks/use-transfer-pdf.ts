"use client";

import { generateTransferPDFAction } from "@/actions/logistics/generate-transfer-pdf";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function useTransferPDF() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateAndDownloadPDF = async (transferId: number) => {
    try {
      setIsGenerating(true);

      console.log("🔄 Iniciando generación de PDF para transferencia:", transferId);

      const result = await generateTransferPDFAction(transferId);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Error al generar el PDF",
          variant: "destructive",
        });
        return;
      }

      // Convertir base64 a blob y descargar
      if (!result.pdfData || !result.filename) {
        toast({
          title: "Error",
          description: "Datos del PDF incompletos",
          variant: "destructive",
        });
        return;
      }

      const pdfBlob = new Blob([Uint8Array.from(atob(result.pdfData), (c) => c.charCodeAt(0))], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF generado",
        description: "El PDF de la transferencia se ha descargado correctamente.",
      });

      console.log("✅ PDF generado y descargado:", result.filename);
    } catch (error) {
      console.error("❌ Error generando PDF:", error);
      toast({
        title: "Error",
        description: "Error inesperado al generar el PDF. Inténtelo nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateAndDownloadPDF,
    isGenerating,
  };
}

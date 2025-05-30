import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { Branch, PettyCashSpend } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PettyCashSpendWithDetails extends PettyCashSpend {
  withdrawal: {
    deposit: {
      branch: Branch | null;
    };
  };
}

export async function generatePettyCashSpendPDF(
  movements: PettyCashSpendWithDetails[],
  fromDate: Date,
  toDate: Date,
): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();

  let currentY = height - margins.normal;
  const contentWidth = width - margins.normal * 2;

  const formatDate = (date: Date | string) => format(new Date(date), "P", { locale: es });
  const formatCurrency = (amount: number) => {
    return PDFBuilder.formatCurrency(amount, "ARS");
  };

  // Título principal
  pdf.addCenteredTitle("Reporte de Movimientos de Caja Chica", currentY);
  currentY -= 30;

  // Subtítulo con período
  const periodText = `Período: ${formatDate(fromDate)} - ${formatDate(toDate)}`;
  pdf.addCenteredTitle(periodText, currentY, fontSizes.medium);
  currentY -= 60;

  if (movements.length === 0) {
    pdf.addText("No se encontraron movimientos para el período seleccionado.", {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
  } else {
    // Tabla de movimientos
    currentY = pdf.addSection("Detalle de Movimientos", margins.normal, currentY, contentWidth);

    const headers = ["Fecha", "Sucursal", "Motivo/Gasto", "Descripción", "Monto"];
    const rows = movements.map((movement) => [
      formatDate(movement.date),
      movement.withdrawal.deposit.branch?.name || "Cuenta General",
      movement.motive || "-",
      movement.description,
      formatCurrency(movement.amount),
    ]);

    currentY = pdf.addTable({
      x: margins.normal,
      y: currentY,
      width: contentWidth,
      cellHeight: 20,
      headers,
      rows,
      fontSize: fontSizes.small,
    });

    currentY -= 30;

    // Resumen
    if (currentY < 100) {
      pdf.addPage();
      currentY = height - margins.normal;
    }

    currentY = pdf.addSection("Resumen", margins.normal, currentY, contentWidth);

    const totalAmountSpent = movements.reduce((sum, movement) => sum + movement.amount, 0);

    pdf.addText(`Total Gastado: ${formatCurrency(totalAmountSpent)}`, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.large,
    });
  }

  // Pie de página
  const now = new Date().toLocaleDateString("es-AR");
  pdf.addText(`Generado el: ${now}`, {
    x: margins.normal,
    y: 30,
    size: fontSizes.small,
    color: colors.gray,
  });

  return pdf.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createPettyCashSpendPDFResponse(pdfBytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBytes.length.toString(),
    },
  });
}

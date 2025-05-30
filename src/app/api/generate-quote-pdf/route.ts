import {
  type QuotePDFProps,
  createQuotePDFResponse,
  generateQuotePDF,
} from "@/lib/pdf-generators/quote-pdf";
import { NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb", // Ajusta según el tamaño de tus datos
    },
  },
};

export async function POST(req: Request) {
  try {
    const pdfProps: QuotePDFProps = await req.json();

    if (!pdfProps.motorcycle) {
      return NextResponse.json(
        { error: "No se pudo crear el documento PDF (faltan datos de motocicleta)" },
        { status: 400 },
      );
    }

    // Generar el PDF usando pdf-lib
    const pdfBytes = await generateQuotePDF(pdfProps);

    // Crear y retornar la respuesta HTTP
    return createQuotePDFResponse(pdfBytes, "Presupuesto.pdf");
  } catch (error) {
    console.error("Error en la generación del PDF:", error);
    return NextResponse.json(
      {
        error: "No se pudo generar el PDF",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

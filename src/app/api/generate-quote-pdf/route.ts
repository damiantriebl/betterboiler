import { QuotePDFDocument } from "@/app/(app)/sales/components/QuotePDF";
import { Document, renderToBuffer } from "@react-pdf/renderer";
import type { NextApiRequest, NextApiResponse } from "next";
import React from "react";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb", // Ajusta según el tamaño de tus datos
    },
  },
};

async function convertWebPToPNG(base64String: string): Promise<string> {
  try {
    // Extraer la parte de datos del base64
    const base64Data = base64String.split(";base64,").pop();
    if (!base64Data) throw new Error("Invalid base64 string");

    const buffer = Buffer.from(base64Data, "base64");
    const pngBuffer = await sharp(buffer)
      .png()
      .toBuffer();

    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Error converting WebP to PNG:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const pdfProps = await req.json();

    // Convertir la imagen si es necesario (antes de crear el PDF)
    if (pdfProps.organizationLogo) {
      const isWebP = pdfProps.organizationLogo.includes("data:image/webp") || 
                    pdfProps.organizationLogo.includes("/webp");
      
      if (isWebP) {
        console.log("Detectada imagen WebP, convirtiendo a PNG...");
        pdfProps.organizationLogo = await convertWebPToPNG(pdfProps.organizationLogo);
        console.log("Conversión completada");
      }
    }

    // Crear el contenido del PDF con la imagen ya convertida
    const pageContent = React.createElement(QuotePDFDocument, pdfProps);
    const documentElement = React.createElement(Document, {}, pageContent);

    if (!documentElement) {
      return Response.json(
        { error: "No se pudo crear el documento PDF (props inválidas)" },
        { status: 400 },
      );
    }

    const pdfBuffer = await renderToBuffer(documentElement);
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Presupuesto.pdf",
      },
    });
  } catch (error) {
    console.error("Error en la generación del PDF:", error);
    return Response.json({ 
      error: "No se pudo generar el PDF",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}

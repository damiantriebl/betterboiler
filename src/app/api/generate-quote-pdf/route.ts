import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { QuotePDFDocument } from '@/app/(app)/sales/components/QuotePDF';
import { renderToBuffer, Document } from '@react-pdf/renderer';
import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb', // Ajusta según el tamaño de tus datos
    },
  },
};

export async function POST(req: Request) {
  try {
    const pdfProps = await req.json();

    // Convertir la imagen si es necesario (antes de crear el PDF)
    if (pdfProps.organizationLogo && pdfProps.organizationLogo.startsWith('data:image/webp')) {
      const base64Data = pdfProps.organizationLogo.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const pngBuffer = await sharp(buffer).png().toBuffer();
      pdfProps.organizationLogo = 'data:image/png;base64,' + pngBuffer.toString('base64');
    }

    // Ahora sí, crear el contenido del PDF con la imagen ya convertida
    const pageContent = React.createElement(QuotePDFDocument, pdfProps);
    const documentElement = React.createElement(Document, {}, pageContent);

    if (!documentElement) {
      return Response.json({ error: 'No se pudo crear el documento PDF (props inválidas)' }, { status: 400 });
    }

    const pdfBuffer = await renderToBuffer(documentElement);
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=Presupuesto.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: 'No se pudo generar el PDF' }, { status: 500 });
  }
} 
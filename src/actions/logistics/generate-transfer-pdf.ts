"use server";

import { getOrganizationIdFromSession } from "@/actions/util";
import { generateTransferPDF } from "@/lib/pdf-generators/transfer-pdf";
import prisma from "@/lib/prisma";

export async function generateTransferPDFAction(transferId: number) {
  try {
    console.log("🔍 Generando PDF para transferencia:", transferId);

    // Verificar sesión y organización
    const sessionResult = await getOrganizationIdFromSession();
    if (!sessionResult.organizationId) {
      return {
        success: false,
        error: sessionResult.error || "No se pudo obtener la información de la organización",
      };
    }

    const organizationId = sessionResult.organizationId;

    // Obtener la transferencia con todas las relaciones necesarias
    const transfer = await prisma.motorcycleTransfer.findFirst({
      where: {
        id: transferId,
        organizationId: organizationId,
      },
      include: {
        motorcycle: {
          include: {
            brand: true,
            model: true,
            color: true,
            branch: true,
          },
        },
        fromBranch: true,
        toBranch: true,
        logisticProvider: true,
        requester: true,
        confirmer: true,
      },
    });

    if (!transfer) {
      return {
        success: false,
        error: "Transferencia no encontrada",
      };
    }

    // Obtener información de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    console.log("📄 Generando PDF con datos:", {
      transferId: transfer.id,
      motorcycle: transfer.motorcycle?.chassisNumber,
      organization: organization?.name,
    });

    // Generar el PDF
    const pdfBytes = await generateTransferPDF({
      transfer,
      organizationName: organization?.name || "Sistema de Gestión",
    });

    // Convertir a base64 para enviar al cliente
    const base64PDF = Buffer.from(pdfBytes).toString("base64");

    return {
      success: true,
      pdfData: base64PDF,
      filename: `transferencia-${transfer.id}-${transfer.motorcycle?.chassisNumber || "moto"}.pdf`,
    };
  } catch (error) {
    console.error("❌ Error generando PDF de transferencia:", error);
    return {
      success: false,
      error: "Error interno del servidor al generar el PDF",
    };
  }
}

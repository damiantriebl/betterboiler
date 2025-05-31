import { colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { MotorcycleTransferWithRelations } from "@/types/logistics";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

interface TransferPDFData {
  transfer: MotorcycleTransferWithRelations;
  organizationName?: string;
  organizationLogo?: string;
}

export async function generateTransferPDF(data: TransferPDFData): Promise<Uint8Array> {
  const { transfer } = data;

  if (!transfer.motorcycle) {
    throw new Error("La transferencia debe incluir información de la motocicleta");
  }

  // Crear template
  const template = new PDFTemplate({
    title: "ORDEN DE TRANSFERENCIA",
    subtitle: `Transferencia #${transfer.id.toString().padStart(6, "0")}`,
    includeGenerationDate: true,
    filename: `transferencia-${transfer.id}.pdf`,
  });

  // Inicializar template
  await template.init();

  // Funciones de utilidad
  const formatDate = (date: Date | string | null): string => {
    if (!date) return "N/A";
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const formatDateShort = (date: Date | string | null): string => {
    if (!date) return "N/A";
    return format(new Date(date), "dd/MM/yyyy", { locale: es });
  };

  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      IN_TRANSIT: "En Tránsito",
      DELIVERED: "Entregada",
      CANCELLED: "Cancelada",
      REQUESTED: "Solicitada",
      CONFIRMED: "Confirmada",
    };
    return statusMap[status] || status;
  };

  const formatCurrency = (amount: number, currency = "ARS"): string => {
    return `$${amount.toLocaleString("es-AR")} ${currency}`;
  };

  // Definir secciones del PDF
  const sections: PDFSection[] = [
    // Sección 1: Información General
    {
      title: "INFORMACIÓN DE LA TRANSFERENCIA",
      minSpaceRequired: 200, // Asegurar espacio suficiente
      content: (pdf, currentY, contentWidth) => {
        const data: Record<string, string> = {
          "ID de Transferencia": `#${transfer.id.toString().padStart(6, "0")}`,
          Estado: getStatusText(transfer.status),
          "Fecha de Solicitud": formatDate(transfer.requestedDate),
          "Solicitado por": transfer.requester?.name || "N/A",
          Email: transfer.requester?.email || "N/A",
        };

        if (transfer.confirmer) {
          data["Confirmado por"] = transfer.confirmer.name;
        }

        return PDFSectionHelpers.createSummarySection(data)(pdf, currentY, contentWidth);
      },
    },

    // Sección 2: Información de la Motocicleta
    {
      title: "DATOS DE LA MOTOCICLETA",
      minSpaceRequired: 250, // Asegurar espacio suficiente para la tabla
      content: (pdf, currentY, contentWidth) => {
        const motorcycle = transfer.motorcycle;
        if (!motorcycle) {
          return currentY - 20;
        }

        // Dividir en dos grupos para mejor presentación
        let workingY = currentY;

        // Grupo 1: Información básica
        const basicData: Record<string, string> = {
          Marca: motorcycle.brand?.name || "N/A",
          Modelo: motorcycle.model?.name || "N/A",
          Año: motorcycle.year.toString(),
          "Número de Chasis": motorcycle.chassisNumber,
        };

        workingY = PDFSectionHelpers.createSummarySection(basicData)(pdf, workingY, contentWidth);
        workingY -= 20; // Espacio entre tablas

        // Grupo 2: Información adicional
        const additionalData: Record<string, string> = {
          Color: motorcycle.color?.name || "N/A",
          Estado: motorcycle.state,
          Precio: formatCurrency(motorcycle.retailPrice, motorcycle.currency),
        };

        workingY = PDFSectionHelpers.createSummarySection(additionalData)(
          pdf,
          workingY,
          contentWidth,
        );

        return workingY;
      },
    },

    // Sección 3: Detalles del Traslado
    {
      title: "DETALLES DEL TRASLADO",
      minSpaceRequired: 200, // Asegurar espacio suficiente
      content: (pdf, currentY, contentWidth) => {
        const data: Record<string, string> = {
          "Sucursal de Origen": transfer.fromBranch?.name || "N/A",
          "Sucursal de Destino": transfer.toBranch?.name || "N/A",
          "Fecha Programada": transfer.scheduledPickupDate
            ? formatDateShort(transfer.scheduledPickupDate)
            : "No programada",
          "Fecha de Entrega": transfer.actualDeliveryDate
            ? formatDateShort(transfer.actualDeliveryDate)
            : "Pendiente",
        };

        if (transfer.cost) {
          data["Costo de Transporte"] = formatCurrency(transfer.cost, transfer.currency);
        }

        return PDFSectionHelpers.createSummarySection(data)(pdf, currentY, contentWidth);
      },
    },

    // Sección 4: Proveedor de Logística
    ...(transfer.logisticProvider
      ? [
          {
            title: "PROVEEDOR DE LOGÍSTICA",
            minSpaceRequired: 200, // Asegurar espacio suficiente
            content: (pdf: any, currentY: number, contentWidth: number) => {
              const provider = transfer.logisticProvider;
              if (!provider) {
                return currentY - 20;
              }
              const data: Record<string, string> = {
                Empresa: provider.name,
                Contacto: provider.contactName || "N/A",
                Teléfono: provider.contactPhone || "N/A",
                Email: provider.contactEmail || "N/A",
              };

              if (provider.address) {
                data.Dirección = provider.address;
              }

              return PDFSectionHelpers.createSummarySection(data)(pdf, currentY, contentWidth);
            },
          },
        ]
      : []),

    // Sección 5: Notas adicionales
    ...(transfer.notes
      ? [
          {
            title: "NOTAS ADICIONALES",
            content: (pdf: any, currentY: number, contentWidth: number) => {
              let workingY = currentY;

              // Dividir las notas en líneas para mejor presentación
              const lines = transfer.notes?.split("\n") || [];
              for (const line of lines) {
                if (workingY < 100) {
                  pdf.addPage();
                  workingY = pdf.getPageDimensions().height - margins.normal;
                }

                pdf.addText(line, {
                  x: margins.normal,
                  y: workingY,
                  size: fontSizes.normal,
                  color: colors.textPrimary,
                });
                workingY -= 20;
              }

              return workingY;
            },
          },
        ]
      : []),

    // Sección 6: Responsabilidades
    {
      title: "RESPONSABILIDADES",
      minSpaceRequired: 200, // Forzar nueva página si no hay espacio
      content: (pdf, currentY, contentWidth) => {
        let workingY = currentY;

        const responsibilities = [
          "1. El solicitante certifica que la motocicleta está en condiciones adecuadas para el traslado.",
          "2. El receptor debe verificar el estado de la motocicleta al momento de la recepción.",
          "3. Cualquier daño o discrepancia debe ser reportado inmediatamente.",
          "4. Este documento sirve como comprobante oficial de la transferencia.",
        ];

        for (const resp of responsibilities) {
          pdf.addText(resp, {
            x: margins.normal,
            y: workingY,
            size: fontSizes.small,
            color: colors.textSecondary,
          });
          workingY -= 20;
        }

        return workingY - 10;
      },
    },

    // Sección 7: Área de Firmas
    {
      title: "FIRMAS",
      minSpaceRequired: 150, // Asegurar que las firmas no se corten
      content: (pdf, currentY, contentWidth) => {
        let workingY = currentY;
        const columnWidth = Math.floor(contentWidth / 2) - 20;

        // Columna izquierda - Solicitante
        pdf.addText("Solicitante:", {
          x: margins.normal,
          y: workingY,
          size: fontSizes.normal,
          color: colors.textSecondary,
        });
        workingY -= 20;

        pdf.addText(transfer.requester?.name || "N/A", {
          x: margins.normal,
          y: workingY,
          size: fontSizes.normal,
          color: colors.textPrimary,
        });
        workingY -= 30;

        pdf.addText("_______________________", {
          x: margins.normal,
          y: workingY,
          size: fontSizes.normal,
          color: colors.textSecondary,
        });
        workingY -= 20;

        pdf.addText("Firma", {
          x: margins.normal,
          y: workingY,
          size: fontSizes.small,
          color: colors.textMuted,
        });

        // Columna derecha - Receptor
        const rightX = margins.normal + columnWidth + 40;
        workingY = currentY;

        pdf.addText("Receptor:", {
          x: rightX,
          y: workingY,
          size: fontSizes.normal,
          color: colors.textSecondary,
        });
        workingY -= 50;

        pdf.addText("_______________________", {
          x: rightX,
          y: workingY,
          size: fontSizes.normal,
          color: colors.textSecondary,
        });
        workingY -= 20;

        pdf.addText("Firma", {
          x: rightX,
          y: workingY,
          size: fontSizes.small,
          color: colors.textMuted,
        });

        return workingY - 20;
      },
    },

    // Sección 8: Información Legal
    {
      title: "INFORMACIÓN LEGAL",
      content: (pdf, currentY, contentWidth) => {
        const legalText =
          "Este documento ha sido generado automáticamente por el sistema de gestión. " +
          "Tiene validez como comprobante de transferencia entre sucursales. " +
          "Conserve este documento para futuras referencias.";

        return PDFSectionHelpers.createTextSection(legalText, {
          fontSize: fontSizes.small,
          color: colors.textMuted,
        })(pdf, currentY, contentWidth);
      },
    },
  ];

  // Agregar todas las secciones al PDF
  await template.addSections(sections);

  // Finalizar y retornar el PDF
  return template.finalize();
}

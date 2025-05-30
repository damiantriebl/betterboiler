import { getLogoUrl } from "@/actions/util/assets-unified";
import { getOrganizationSessionData } from "@/actions/util/organization-session-unified";
import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import sharp from "sharp";

export interface PDFTemplateConfig {
  title: string;
  subtitle?: string;
  filename?: string;
  includeGenerationDate?: boolean;
  dateRange?: { from?: Date; to?: Date };
}

export interface PDFSection {
  title: string;
  content: (pdf: PDFBuilder, currentY: number, contentWidth: number) => Promise<number> | number;
  newPageBefore?: boolean;
  minSpaceRequired?: number;
}

export class PDFTemplate {
  private pdf!: PDFBuilder;
  private orgData: any;
  private logoUrl: string | null = null;
  private config: PDFTemplateConfig;
  private width!: number;
  private height!: number;
  private contentWidth!: number;

  constructor(config: PDFTemplateConfig) {
    this.config = config;
  }

  // Inicializar el template
  async init(): Promise<void> {
    this.pdf = await PDFBuilder.create();
    const dimensions = this.pdf.getPageDimensions();
    this.width = dimensions.width;
    this.height = dimensions.height;
    this.contentWidth = this.width - margins.normal * 2;

    // Obtener información de la organización
    this.orgData = await getOrganizationSessionData();

    // Intentar obtener el logo usando la misma lógica que el navbar
    if (this.orgData.organizationLogo) {
      try {
        const logoUrl = await getLogoUrl(this.orgData.organizationLogo);
        if (logoUrl) {
          // Convertir la imagen a PNG si es necesario
          this.logoUrl = await this.convertImageToPNG(logoUrl);
        }
      } catch (error) {
        console.warn("No se pudo obtener el logo de la organización:", error);
      }
    }
  }

  // Convertir imagen a PNG usando Sharp
  private async convertImageToPNG(imageUrl: string): Promise<string> {
    try {
      // Descargar la imagen
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Error descargando imagen: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();

      // Convertir a PNG usando Sharp
      const pngBuffer = await sharp(Buffer.from(imageBuffer)).png().toBuffer();

      // Convertir a base64 data URL
      const base64 = pngBuffer.toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.warn("Error convirtiendo imagen a PNG:", error);
      throw error;
    }
  }

  // Agregar header con logo y título
  async addHeader(): Promise<number> {
    // Header con logo (sin texto duplicado)
    let currentY = await this.pdf.addHeader(
      this.orgData.organizationName || "Organización",
      this.logoUrl || undefined,
    );

    // Título principal con estilo moderno
    this.pdf.addCenteredTitle(this.config.title, currentY - 20, fontSizes.display, colors.primary);
    currentY -= 60;

    // Subtítulo si existe
    if (this.config.subtitle) {
      this.pdf.addCenteredTitle(
        this.config.subtitle,
        currentY,
        fontSizes.xlarge,
        colors.textSecondary,
      );
      currentY -= 40;
    }

    // Fecha de generación o rango de fechas con estilo mejorado
    if (this.config.dateRange) {
      const dateText = `Período: ${
        this.config.dateRange.from
          ? format(this.config.dateRange.from, "dd/MM/yyyy", { locale: es })
          : "N/A"
      } - ${
        this.config.dateRange.to
          ? format(this.config.dateRange.to, "dd/MM/yyyy", { locale: es })
          : "N/A"
      }`;
      this.pdf.addCenteredTitle(dateText, currentY, fontSizes.medium, colors.textMuted);
      currentY -= 40;
    } else if (this.config.includeGenerationDate !== false) {
      const dateText = `Fecha de generación: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`;
      this.pdf.addCenteredTitle(dateText, currentY, fontSizes.medium, colors.textMuted);
      currentY -= 40;
    }

    return currentY;
  }

  // Agregar secciones de contenido
  async addSections(sections: PDFSection[]): Promise<void> {
    let currentY = await this.addHeader();

    for (const section of sections) {
      // Verificar si necesita nueva página
      if (
        section.newPageBefore ||
        (section.minSpaceRequired && currentY < section.minSpaceRequired)
      ) {
        this.pdf.addPage();
        currentY = this.height - margins.normal;
      }

      // Agregar título de sección
      currentY = this.pdf.addSection(section.title, margins.normal, currentY, this.contentWidth);
      currentY -= 10;

      // Agregar contenido de la sección
      currentY = await section.content(this.pdf, currentY, this.contentWidth);
      currentY -= 30; // Espacio entre secciones
    }
  }

  // Agregar pie de página elegante a todas las páginas
  addFooters(): void {
    const now = new Date();
    const footerText = `Generado el: ${format(now, "dd/MM/yyyy HH:mm", { locale: es })} | ${this.orgData.organizationName || "Organización"}`;

    const pages = this.pdf.getPageCount();
    for (let i = 0; i < pages; i++) {
      this.pdf.setCurrentPage(i);

      // Línea separadora elegante
      this.pdf.addHorizontalLine(margins.normal, 50, this.width - margins.normal * 2, 1);

      // Pie de página izquierdo con estilo moderno
      this.pdf.addText(footerText, {
        x: margins.normal,
        y: 30,
        size: fontSizes.xs,
        color: colors.textMuted,
      });

      // Número de página derecho con estilo
      this.pdf.addText(`Página ${i + 1} de ${pages}`, {
        x: this.width - margins.normal - 80,
        y: 30,
        size: fontSizes.xs,
        color: colors.textMuted,
      });
    }
  }

  // Finalizar y generar PDF
  async finalize(): Promise<Uint8Array> {
    this.addFooters();
    return this.pdf.finalize();
  }

  // Getters para acceso a propiedades
  getPDF(): PDFBuilder {
    return this.pdf;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getContentWidth(): number {
    return this.contentWidth;
  }

  getOrgData(): any {
    return this.orgData;
  }
}

// Función de utilidad para crear respuesta HTTP
export function createPDFResponse(pdfBytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBytes.length.toString(),
    },
  });
}

// Funciones de utilidad para secciones comunes
export const PDFSectionHelpers = {
  // Crear tabla moderna con estilo mejorado
  createTableSection: (
    headers: string[],
    rows: string[][],
    options: {
      cellHeight?: number;
      fontSize?: number;
      headerColor?: any;
    } = {},
  ) => {
    return (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
      return pdf.addTable({
        x: margins.normal,
        y: currentY,
        width: contentWidth,
        cellHeight: options.cellHeight || 35,
        headers,
        rows,
        fontSize: options.fontSize || fontSizes.normal,
        headerColor: options.headerColor || colors.primary,
        textColor: colors.textPrimary,
        borderColor: colors.borderLight,
      });
    };
  },

  // Crear sección de texto con tipografía mejorada
  createTextSection: (
    text: string,
    options: { fontSize?: number; centered?: boolean; color?: any } = {},
  ) => {
    return (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
      const fontSize = options.fontSize || fontSizes.normal;
      const color = options.color || colors.textPrimary;

      if (options.centered) {
        pdf.addCenteredTitle(text, currentY, fontSize, color);
      } else {
        pdf.addText(text, {
          x: margins.normal,
          y: currentY,
          size: fontSize,
          color: color,
        });
      }
      return currentY - (fontSize + 10);
    };
  },

  // Crear sección de resumen con estilo moderno
  createSummarySection: (data: { [key: string]: string | number }) => {
    return (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
      const headers = ["Concepto", "Valor"];
      const rows = Object.entries(data).map(([key, value]) => [key, value.toString()]);

      return pdf.addTable({
        x: margins.normal,
        y: currentY,
        width: contentWidth,
        cellHeight: 32,
        headers,
        rows,
        fontSize: fontSizes.medium,
        headerColor: colors.primary,
        textColor: colors.textPrimary,
        borderColor: colors.borderLight,
      });
    };
  },
};

import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';

// Colores predefinidos
export const colors = {
  black: rgb(0, 0, 0),
  white: rgb(1, 1, 1),
  gray: rgb(0.5, 0.5, 0.5),
  lightGray: rgb(0.9, 0.9, 0.9),
  darkGray: rgb(0.3, 0.3, 0.3),
  blue: rgb(0.2, 0.4, 0.8),
  red: rgb(0.8, 0.2, 0.2),
  green: rgb(0.2, 0.8, 0.2),
} as const;

// Configuraciones de fuente
export const fontSizes = {
  tiny: 6,
  small: 8,
  normal: 10,
  medium: 12,
  large: 14,
  xlarge: 16,
  xxlarge: 20,
  title: 24,
} as const;

// Márgenes estándar
export const margins = {
  small: 20,
  normal: 30,
  large: 40,
} as const;

// Interfaz para configuración de texto
export interface TextConfig {
  x: number;
  y: number;
  size?: number;
  color?: ReturnType<typeof rgb>;
  font?: any;
  maxWidth?: number;
}

// Interfaz para configuración de tabla
export interface TableConfig {
  x: number;
  y: number;
  width: number;
  cellHeight: number;
  headers: string[];
  rows: string[][];
  headerColor?: ReturnType<typeof rgb>;
  borderColor?: ReturnType<typeof rgb>;
  textColor?: ReturnType<typeof rgb>;
  fontSize?: number;
}

// Clase utilitaria para PDFs
export class PDFBuilder {
  private doc!: PDFDocument;
  private currentPage!: PDFPage;
  private timesRomanFont: any;
  private timesRomanBoldFont: any;
  private courierFont: any;

  // Crear e inicializar el PDF - método estático
  static async create(): Promise<PDFBuilder> {
    const builder = new PDFBuilder();
    await builder.init();
    return builder;
  }

  // Inicializar documento y fuentes
  private async init() {
    this.doc = await PDFDocument.create();
    this.currentPage = this.doc.addPage();
    this.timesRomanFont = await this.doc.embedFont(StandardFonts.TimesRoman);
    this.timesRomanBoldFont = await this.doc.embedFont(StandardFonts.TimesRomanBold);
    this.courierFont = await this.doc.embedFont(StandardFonts.Courier);
  }

  // Obtener documento final
  async finalize(): Promise<Uint8Array> {
    return this.doc.save();
  }

  // Agregar nueva página
  addPage(): PDFPage {
    this.currentPage = this.doc.addPage();
    return this.currentPage;
  }

  // Obtener página actual
  getCurrentPage(): PDFPage {
    return this.currentPage;
  }

  // Obtener dimensiones de la página
  getPageDimensions() {
    const { width, height } = this.currentPage.getSize();
    return { width, height };
  }

  // Agregar texto simple
  addText(text: string, config: TextConfig) {
    const {
      x,
      y,
      size = fontSizes.normal,
      color = colors.black,
      font = this.timesRomanFont,
    } = config;

    this.currentPage.drawText(text, {
      x,
      y,
      size,
      font,
      color,
    });
  }

  // Agregar título centrado
  addCenteredTitle(text: string, y: number, size: number = fontSizes.title) {
    const { width } = this.getPageDimensions();
    const textWidth = this.timesRomanBoldFont.widthOfTextAtSize(text, size);
    const x = (width - textWidth) / 2;

    this.addText(text, {
      x,
      y,
      size,
      font: this.timesRomanBoldFont,
    });
  }

  // Agregar línea horizontal
  addHorizontalLine(x: number, y: number, width: number, thickness: number = 1) {
    this.currentPage.drawRectangle({
      x,
      y,
      width,
      height: thickness,
      color: colors.black,
    });
  }

  // Agregar rectángulo
  addRectangle(x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb> = colors.lightGray, borderColor?: ReturnType<typeof rgb>) {
    this.currentPage.drawRectangle({
      x,
      y,
      width,
      height,
      color,
      borderColor,
      borderWidth: borderColor ? 1 : 0,
    });
  }

  // Agregar tabla simple
  addTable(config: TableConfig) {
    const {
      x,
      y,
      width,
      cellHeight,
      headers,
      rows,
      headerColor = colors.lightGray,
      borderColor = colors.black,
      textColor = colors.black,
      fontSize = fontSizes.normal,
    } = config;

    const cellWidth = width / headers.length;
    let currentY = y;

    // Dibujar headers
    this.addRectangle(x, currentY, width, cellHeight, headerColor, borderColor);
    
    headers.forEach((header, index) => {
      this.addText(header, {
        x: x + (index * cellWidth) + 5,
        y: currentY + cellHeight / 2 - fontSize / 2,
        size: fontSize,
        color: textColor,
        font: this.timesRomanBoldFont,
      });
    });

    currentY -= cellHeight;

    // Dibujar filas
    rows.forEach((row) => {
      this.addRectangle(x, currentY, width, cellHeight, colors.white, borderColor);
      
      row.forEach((cell, index) => {
        this.addText(cell.toString(), {
          x: x + (index * cellWidth) + 5,
          y: currentY + cellHeight / 2 - fontSize / 2,
          size: fontSize,
          color: textColor,
          font: this.timesRomanFont,
        });
      });

      currentY -= cellHeight;
    });

    return currentY; // Retorna la posición Y final para continuar dibujando
  }

  // Agregar sección con título y contenido
  addSection(title: string, x: number, y: number, width: number): number {
    // Fondo de la sección
    this.addRectangle(x, y - 25, width, 25, colors.lightGray, colors.darkGray);
    
    // Título de la sección
    this.addText(title, {
      x: x + 10,
      y: y - 15,
      size: fontSizes.large,
      font: this.timesRomanBoldFont,
    });

    return y - 35; // Retorna la posición Y para el contenido
  }

  // Formatear números como moneda
  static formatCurrency(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // Calcular altura necesaria para texto con wrap
  calculateTextHeight(text: string, maxWidth: number, fontSize: number): number {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = this.timesRomanFont.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length * (fontSize + 2); // +2 para espaciado entre líneas
  }
} 
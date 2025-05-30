import { PDFDocument, type PDFImage, type PDFPage, StandardFonts, rgb } from "pdf-lib";

// Paleta de colores moderna - inspirada en diseño web
export const colors = {
  // Colores primarios
  primary: rgb(0.1, 0.2, 0.3), // Azul oscuro elegante
  primaryLight: rgb(0.2, 0.3, 0.4),
  secondary: rgb(0.95, 0.95, 0.95), // Gris muy claro

  // Colores de texto
  textPrimary: rgb(0.15, 0.15, 0.15), // Casi negro
  textSecondary: rgb(0.4, 0.4, 0.4), // Gris medio
  textMuted: rgb(0.6, 0.6, 0.6), // Gris claro

  // Colores de fondo
  white: rgb(1, 1, 1),
  backgroundLight: rgb(0.98, 0.98, 0.98),
  backgroundMedium: rgb(0.95, 0.95, 0.95),

  // Colores de acento
  accent: rgb(0.2, 0.6, 0.9), // Azul vibrante
  success: rgb(0.15, 0.7, 0.15), // Verde
  warning: rgb(0.9, 0.6, 0.1), // Naranja

  // Bordes
  borderLight: rgb(0.9, 0.9, 0.9),
  borderMedium: rgb(0.8, 0.8, 0.8),
  borderDark: rgb(0.6, 0.6, 0.6),

  // Deprecados (mantenidos para compatibilidad)
  black: rgb(0, 0, 0),
  gray: rgb(0.5, 0.5, 0.5),
  lightGray: rgb(0.9, 0.9, 0.9),
  darkGray: rgb(0.3, 0.3, 0.3),
};

// Tipografía moderna y escalable
export const fontSizes = {
  tiny: 6, // Mantenido para compatibilidad hacia atrás
  xs: 8,
  small: 10,
  normal: 12,
  medium: 14,
  large: 16,
  xlarge: 20,
  xxlarge: 24,
  title: 28,
  heading: 32,
  display: 36,
};

// Espaciado consistente
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const margins = {
  small: 20,
  normal: 40,
  large: 60,
};

// Configuraciones de sombras y efectos
export const shadows = {
  light: { offset: 2, blur: 4, color: rgb(0.9, 0.9, 0.9) },
  medium: { offset: 4, blur: 8, color: rgb(0.85, 0.85, 0.85) },
  strong: { offset: 6, blur: 12, color: rgb(0.8, 0.8, 0.8) },
};

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
  private helveticaFont: any;
  private helveticaBoldFont: any;
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
    this.helveticaFont = await this.doc.embedFont(StandardFonts.Helvetica);
    this.helveticaBoldFont = await this.doc.embedFont(StandardFonts.HelveticaBold);
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

  // Obtener número total de páginas
  getPageCount(): number {
    return this.doc.getPageCount();
  }

  // Cambiar a una página específica
  setCurrentPage(index: number): PDFPage {
    const pages = this.doc.getPages();
    if (index >= 0 && index < pages.length) {
      this.currentPage = pages[index];
    }
    return this.currentPage;
  }

  // Obtener dimensiones de la página
  getPageDimensions() {
    const { width, height } = this.currentPage.getSize();
    return { width, height };
  }

  // Obtener fuentes públicamente
  getHelveticaFont() {
    return this.helveticaFont;
  }

  getHelveticaBoldFont() {
    return this.helveticaBoldFont;
  }

  getCourierFont() {
    return this.courierFont;
  }

  // Agregar texto simple
  addText(text: string, config: TextConfig) {
    const {
      x,
      y,
      size = fontSizes.normal,
      color = colors.black,
      font = this.helveticaFont,
    } = config;

    this.currentPage.drawText(text, {
      x,
      y,
      size,
      font,
      color,
    });
  }

  // Agregar título centrado con tipografía moderna
  addCenteredTitle(
    text: string,
    y: number,
    size: number = fontSizes.title,
    color: ReturnType<typeof rgb> = colors.primary,
  ) {
    const { width } = this.getPageDimensions();
    const textWidth = this.helveticaBoldFont.widthOfTextAtSize(text, size);

    this.addText(text, {
      x: (width - textWidth) / 2,
      y: y,
      size: size,
      color: color,
      font: this.helveticaBoldFont,
    });
  }

  // Agregar línea horizontal
  addHorizontalLine(x: number, y: number, width: number, thickness = 1) {
    this.currentPage.drawRectangle({
      x,
      y,
      width,
      height: thickness,
      color: colors.black,
    });
  }

  // Agregar rectángulo
  addRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: ReturnType<typeof rgb> = colors.lightGray,
    borderColor?: ReturnType<typeof rgb>,
  ) {
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

  // Agregar tabla moderna con mejor estilo
  addTable(config: TableConfig) {
    const {
      x,
      y,
      width,
      cellHeight = 35,
      headers,
      rows,
      headerColor = colors.primary,
      borderColor = colors.borderLight,
      textColor = colors.textPrimary,
      fontSize = fontSizes.normal,
    } = config;

    const cellWidth = width / headers.length;
    let currentY = y;

    // Header con estilo moderno y más altura
    const headerHeight = cellHeight + 10; // Más altura para el header
    this.addRectangle(x, currentY, width, headerHeight, headerColor, colors.borderMedium);

    headers.forEach((header, index) => {
      this.addText(header, {
        x: x + index * cellWidth + spacing.lg, // Más padding horizontal
        y: currentY + headerHeight / 2 - (fontSize + 1) / 2,
        size: fontSize + 1,
        color: colors.white,
        font: this.helveticaBoldFont,
      });
    });

    currentY -= headerHeight;

    // Filas con alternancia de colores y mejor espaciado
    rows.forEach((row, rowIndex) => {
      const isEven = rowIndex % 2 === 0;
      const bgColor = isEven ? colors.white : colors.backgroundLight;

      this.addRectangle(x, currentY, width, cellHeight, bgColor, colors.borderLight);

      row.forEach((cell, index) => {
        this.addText(cell.toString(), {
          x: x + index * cellWidth + spacing.lg, // Más padding horizontal
          y: currentY + cellHeight / 2 - fontSize / 2,
          size: fontSize,
          color: textColor,
          font: this.helveticaFont,
        });
      });

      currentY -= cellHeight;
    });

    return currentY - spacing.md; // Espacio adicional después de la tabla
  }

  // Agregar sección con título estilizado
  addSection(title: string, x: number, y: number, width: number): number {
    const sectionHeight = 40;

    // Fondo degradado simulado con rectángulo sólido
    this.addRectangle(
      x,
      y - sectionHeight,
      width,
      sectionHeight,
      colors.backgroundMedium,
      colors.borderMedium,
    );

    // Línea de acento a la izquierda
    this.addRectangle(x, y - sectionHeight, 4, sectionHeight, colors.accent);

    // Título de la sección con mejor centrado vertical
    this.addText(title, {
      x: x + spacing.lg,
      y: y - sectionHeight / 2 - fontSizes.large / 2,
      size: fontSizes.large,
      color: colors.primary,
      font: this.helveticaBoldFont,
    });

    return y - sectionHeight - spacing.lg;
  }

  // Formatear números como moneda
  static formatCurrency(amount: number, currency = "ARS"): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
    }).format(amount);
  }

  // Calcular altura necesaria para texto con wrap
  calculateTextHeight(text: string, maxWidth: number, fontSize: number): number {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = this.helveticaFont.widthOfTextAtSize(testLine, fontSize);

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

  // Agregar imagen desde URL o base64
  async addImage(
    imageData: string | Uint8Array,
    config: {
      x: number;
      y: number;
      width?: number; // Ahora opcional
      height: number;
      maxWidth?: number; // Ancho máximo opcional
      format?: "png" | "jpg";
    },
  ) {
    try {
      let image: PDFImage;

      if (typeof imageData === "string") {
        // Si es base64 o URL, convertir a Uint8Array
        let arrayBuffer: ArrayBuffer;

        if (imageData.startsWith("data:")) {
          // Base64 data URL
          const base64Data = imageData.split(",")[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          // URL externa
          const response = await fetch(imageData);
          arrayBuffer = await response.arrayBuffer();
        }

        const uint8Array = new Uint8Array(arrayBuffer);

        // Determinar formato por extensión o contenido
        const format = config.format || "png";
        if (format === "png") {
          image = await this.doc.embedPng(uint8Array);
        } else {
          image = await this.doc.embedJpg(uint8Array);
        }
      } else {
        // Ya es Uint8Array
        const format = config.format || "png";
        if (format === "png") {
          image = await this.doc.embedPng(imageData);
        } else {
          image = await this.doc.embedJpg(imageData);
        }
      }

      // Calcular dimensiones respetando la proporción
      const imageDims = image.size();
      const imageAspectRatio = imageDims.width / imageDims.height;

      let finalWidth: number;
      let finalHeight: number;

      if (config.width) {
        // Si se especifica ancho, usarlo
        finalWidth = config.width;
        finalHeight = config.height;
      } else {
        // Calcular ancho basado en la proporción
        finalHeight = config.height;
        finalWidth = finalHeight * imageAspectRatio;

        // Respetar ancho máximo si se especifica
        if (config.maxWidth && finalWidth > config.maxWidth) {
          finalWidth = config.maxWidth;
          finalHeight = finalWidth / imageAspectRatio;
        }
      }

      this.currentPage.drawImage(image, {
        x: config.x,
        y: config.y,
        width: finalWidth,
        height: finalHeight,
      });

      // Retornar las dimensiones finales para uso posterior
      return { width: finalWidth, height: finalHeight };
    } catch (error) {
      console.warn("Error agregando imagen al PDF:", error);
      // Si falla, agregar un placeholder
      const fallbackWidth = config.width || 100;
      const fallbackHeight = config.height;
      this.addRectangle(
        config.x,
        config.y,
        fallbackWidth,
        fallbackHeight,
        colors.lightGray,
        colors.darkGray,
      );
      this.addText("Logo", {
        x: config.x + fallbackWidth / 2 - 15,
        y: config.y + fallbackHeight / 2 - 5,
        size: fontSizes.small,
        color: colors.darkGray,
      });
      return { width: fallbackWidth, height: fallbackHeight };
    }
  }

  // Agregar header moderno con logo de la organización
  async addHeader(organizationName: string, logoUrl?: string) {
    const { width, height } = this.getPageDimensions();
    const headerHeight = 100;
    const currentY = height - margins.normal - headerHeight;

    // Solo línea de acento en la parte inferior, sin cuadro
    this.addRectangle(
      margins.normal,
      currentY + headerHeight - 3,
      width - margins.normal * 2,
      3,
      colors.accent,
    );

    if (logoUrl) {
      // Logo con altura fija y ancho proporcional
      await this.addImage(logoUrl, {
        x: margins.normal + spacing.lg,
        y: currentY + spacing.lg,
        height: 80, // Solo altura fija
        maxWidth: 200, // Ancho máximo para logos muy anchos
        format: "png",
      });
    } else {
      // Solo nombre de la organización si no hay logo
      this.addText(organizationName, {
        x: margins.normal + spacing.lg,
        y: currentY + headerHeight / 2,
        size: fontSizes.title,
        font: this.helveticaBoldFont,
        color: colors.primary,
      });
    }

    return currentY - spacing.lg; // Espacio después del header
  }
}

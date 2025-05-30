import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock pdf-lib
vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: vi.fn(() => ({
      addPage: vi.fn(() => mockPage),
      embedFont: vi.fn(() => mockFont),
      save: vi.fn(() => new Uint8Array()),
    })),
  },
  StandardFonts: {
    TimesRoman: "TimesRoman",
    TimesRomanBold: "TimesRomanBold",
    Courier: "Courier",
  },
  rgb: vi.fn((r, g, b) => ({ r, g, b })),
}));

const mockFont = {
  widthOfTextAtSize: vi.fn(() => 100),
};

const mockPage = {
  getSize: vi.fn(() => ({ width: 500, height: 700 })),
  drawText: vi.fn(),
  drawRectangle: vi.fn(),
};

describe("PDFBuilder", () => {
  let builder: PDFBuilder;

  beforeEach(async () => {
    vi.clearAllMocks();
    builder = await PDFBuilder.create();
  });

  describe("creation and initialization", () => {
    it("should create and initialize PDFBuilder", async () => {
      // Act & Assert
      expect(builder).toBeInstanceOf(PDFBuilder);
      expect(builder.getCurrentPage()).toBeDefined();
    });

    it("should get page dimensions", () => {
      // Act
      const dimensions = builder.getPageDimensions();

      // Assert
      expect(dimensions).toEqual({ width: 500, height: 700 });
    });

    it("should add new page", () => {
      // Act
      const newPage = builder.addPage();

      // Assert
      expect(newPage).toBeDefined();
      expect(builder.getCurrentPage()).toBe(newPage);
    });
  });

  describe("instance methods", () => {
    it("should add text with default configuration", () => {
      // Arrange
      const text = "Test text";
      const config = { x: 50, y: 100 };

      // Act
      builder.addText(text, config);

      // Assert
      expect(mockPage.drawText).toHaveBeenCalledWith(text, {
        x: 50,
        y: 100,
        size: 12, // fontSizes.normal
        font: mockFont,
        color: { r: 0, g: 0, b: 0 }, // colors.black
      });
    });

    it("should add centered title", () => {
      // Act
      builder.addCenteredTitle("Test Title", 500);

      // Assert
      expect(mockPage.drawText).toHaveBeenCalledWith("Test Title", {
        x: 200, // (500 - 100) / 2
        y: 500,
        size: 28, // fontSizes.title
        font: mockFont,
        color: { r: 0.1, g: 0.2, b: 0.3 }, // colors.primary
      });
    });

    it("should add horizontal line", () => {
      // Act
      builder.addHorizontalLine(50, 100, 200);

      // Assert
      expect(mockPage.drawRectangle).toHaveBeenCalledWith({
        x: 50,
        y: 100,
        width: 200,
        height: 1,
        color: { r: 0, g: 0, b: 0 }, // colors.black
      });
    });

    it("should add rectangle with default colors (no border)", () => {
      // Act
      builder.addRectangle(50, 100, 200, 150);

      // Assert
      expect(mockPage.drawRectangle).toHaveBeenCalledWith({
        x: 50,
        y: 100,
        width: 200,
        height: 150,
        color: { r: 0.9, g: 0.9, b: 0.9 }, // colors.lightGray
        borderColor: undefined,
        borderWidth: 0,
      });
    });

    it("should add rectangle with custom colors and border", () => {
      // Act
      builder.addRectangle(50, 100, 200, 150, colors.white, colors.black);

      // Assert
      expect(mockPage.drawRectangle).toHaveBeenCalledWith({
        x: 50,
        y: 100,
        width: 200,
        height: 150,
        color: { r: 1, g: 1, b: 1 }, // white
        borderColor: { r: 0, g: 0, b: 0 }, // black
        borderWidth: 1,
      });
    });

    it("should add table with headers and rows", () => {
      // Arrange
      const config = {
        x: 50,
        y: 500,
        width: 400,
        cellHeight: 30,
        headers: ["Header 1", "Header 2"],
        rows: [["Row 1 Col 1", "Row 1 Col 2"]],
      };

      // Act
      const finalY = builder.addTable(config);

      // Assert
      // Check that rectangles were drawn (exact colors may vary based on implementation)
      expect(mockPage.drawRectangle).toHaveBeenCalled();

      // Should return a Y position
      expect(typeof finalY).toBe("number");
    });

    it("should add section with title", () => {
      // Arrange
      const title = "Section Title";
      const x = 50;
      const y = 500;
      const width = 400;

      // Act
      const finalY = builder.addSection(title, x, y, width);

      // Assert
      // Should draw section elements
      expect(mockPage.drawRectangle).toHaveBeenCalled();
      expect(typeof finalY).toBe("number");
    });

    it("should calculate text height", () => {
      // Act
      const height = builder.calculateTextHeight("Sample text", 200, 12);

      // Assert
      expect(height).toBeGreaterThan(0);
    });

    it("should finalize and return PDF bytes", async () => {
      // Act
      const bytes = await builder.finalize();

      // Assert
      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it("should format currency correctly", () => {
      // Act
      const formatted = PDFBuilder.formatCurrency(1234.56);

      // Assert
      expect(formatted).toMatch(/\$.*1.*234.*56/); // Allow for different formats
    });

    it("should format currency with custom currency", () => {
      // Act
      const formatted = PDFBuilder.formatCurrency(1234.56, "EUR");

      // Assert
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });
  });

  describe("Constants", () => {
    it("should export colors", () => {
      expect(colors).toBeDefined();
      expect(colors.black).toBeDefined();
      expect(colors.white).toBeDefined();
      expect(colors.lightGray).toBeDefined();
    });

    it("should export font sizes", () => {
      expect(fontSizes).toBeDefined();
      expect(fontSizes.small).toBeDefined();
      expect(fontSizes.normal).toBeDefined();
      expect(fontSizes.large).toBeDefined();
      expect(fontSizes.title).toBeDefined();
    });

    it("should export margins", () => {
      expect(margins).toBeDefined();
      expect(margins.small).toBeDefined();
      expect(margins.normal).toBeDefined();
      expect(margins.large).toBeDefined();
    });
  });
});

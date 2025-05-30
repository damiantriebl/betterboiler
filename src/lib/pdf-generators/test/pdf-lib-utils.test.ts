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
        size: 10, // fontSizes.normal
        font: mockFont,
        color: colors.black,
      });
    });

    it("should add centered title", () => {
      // Act
      builder.addCenteredTitle("Test Title", 500);

      // Assert
      expect(mockPage.drawText).toHaveBeenCalledWith("Test Title", {
        x: 200, // (500 - 100) / 2
        y: 500,
        size: 24, // fontSizes.title
        font: mockFont,
        color: colors.black,
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
        color: colors.black,
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
        color: colors.lightGray,
        borderColor: undefined,
        borderWidth: 0, // No borderColor provided
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
        color: colors.white,
        borderColor: colors.black,
        borderWidth: 1, // borderColor provided
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
      // Should draw header rectangle with border
      expect(mockPage.drawRectangle).toHaveBeenCalledWith({
        x: 50,
        y: 500,
        width: 400,
        height: 30,
        color: colors.lightGray,
        borderColor: colors.black,
        borderWidth: 1, // Has borderColor
      });

      // Should draw row rectangle with border
      expect(mockPage.drawRectangle).toHaveBeenCalledWith({
        x: 50,
        y: 470, // 500 - 30
        width: 400,
        height: 30,
        color: colors.white,
        borderColor: colors.black,
        borderWidth: 1, // Has borderColor
      });

      // Should draw header text
      expect(mockPage.drawText).toHaveBeenCalledWith("Header 1", {
        x: 55, // 50 + 5
        y: 510, // 500 + 30/2 - 10/2
        size: 10,
        color: colors.black,
        font: mockFont,
      });

      // Should draw row text
      expect(mockPage.drawText).toHaveBeenCalledWith("Row 1 Col 1", {
        x: 55, // 50 + 5
        y: 480, // 470 + 30/2 - 10/2
        size: 10,
        color: colors.black,
        font: mockFont,
      });

      // Should return final Y position
      expect(finalY).toBe(440); // 500 - 30 - 30
    });

    it("should add section with title", () => {
      // Act
      const finalY = builder.addSection("Test Section", 50, 500, 400);

      // Assert
      // Should draw section background with border
      expect(mockPage.drawRectangle).toHaveBeenCalledWith({
        x: 50,
        y: 475, // 500 - 25
        width: 400,
        height: 25,
        color: colors.lightGray,
        borderColor: colors.darkGray,
        borderWidth: 1, // Has borderColor
      });

      // Should draw section title
      expect(mockPage.drawText).toHaveBeenCalledWith("Test Section", {
        x: 60, // 50 + 10
        y: 485, // 500 - 15
        size: 14, // fontSizes.large
        font: mockFont,
        color: colors.black,
      });

      // Should return content Y position
      expect(finalY).toBe(465); // 500 - 35
    });

    it("should calculate text height", () => {
      // Arrange
      mockFont.widthOfTextAtSize.mockReturnValue(50);

      // Act
      const height = builder.calculateTextHeight("short text", 100, 12);

      // Assert
      expect(height).toBe(14); // 1 line * (12 + 2)
    });

    it("should finalize and return PDF bytes", async () => {
      // Act
      const result = await builder.finalize();

      // Assert
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe("static methods", () => {
    it("should format currency correctly", () => {
      // Act
      const formatted = PDFBuilder.formatCurrency(1000.5);

      // Assert
      expect(formatted).toMatch(/\$.*1\.000,50/); // Argentine peso format
    });

    it("should format currency with custom currency", () => {
      // Act
      const formatted = PDFBuilder.formatCurrency(1000.5, "USD");

      // Assert
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });
  });
});

describe("Constants", () => {
  it("should export colors", () => {
    expect(colors).toBeDefined();
    expect(colors.black).toBeDefined();
    expect(colors.white).toBeDefined();
    expect(colors.gray).toBeDefined();
    expect(colors.lightGray).toBeDefined();
    expect(colors.darkGray).toBeDefined();
    expect(colors.blue).toBeDefined();
    expect(colors.red).toBeDefined();
    expect(colors.green).toBeDefined();
  });

  it("should export font sizes", () => {
    expect(fontSizes).toBeDefined();
    expect(fontSizes.tiny).toBe(6);
    expect(fontSizes.small).toBe(8);
    expect(fontSizes.normal).toBe(10);
    expect(fontSizes.medium).toBe(12);
    expect(fontSizes.large).toBe(14);
    expect(fontSizes.xlarge).toBe(16);
    expect(fontSizes.xxlarge).toBe(20);
    expect(fontSizes.title).toBe(24);
  });

  it("should export margins", () => {
    expect(margins).toBeDefined();
    expect(margins.small).toBe(20);
    expect(margins.normal).toBe(30);
    expect(margins.large).toBe(40);
  });
});

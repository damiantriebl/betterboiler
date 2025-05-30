import { describe, expect, it, vi } from "vitest";
import { cn, formatCurrency, formatDate, formatPrice } from "../utils";

describe("utils", () => {
  describe("cn", () => {
    it("combina clases CSS correctamente", () => {
      const result = cn("class1", "class2");
      expect(result).toBe("class1 class2");
    });

    it("resuelve conflictos de clases de Tailwind", () => {
      const result = cn("bg-red-500", "bg-blue-500");
      expect(result).toBe("bg-blue-500");
    });

    it("maneja valores condicionales", () => {
      const result = cn("base-class", true && "conditional-class", false && "hidden-class");
      expect(result).toBe("base-class conditional-class");
    });

    it("maneja objetos con clases condicionales", () => {
      const result = cn("base", {
        active: true,
        disabled: false,
        special: undefined,
      });
      expect(result).toBe("base active");
    });

    it("maneja arrays de clases", () => {
      const result = cn(["class1", "class2"], "class3");
      expect(result).toBe("class1 class2 class3");
    });

    it("maneja valores undefined y null", () => {
      const result = cn("base", undefined, null, "valid");
      expect(result).toBe("base valid");
    });
  });

  describe("formatPrice", () => {
    it("formatea precio con moneda por defecto (ARS)", () => {
      const result = formatPrice(1000);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(1000);
      expect(result).toBe(expected);
    });

    it("formatea precio con moneda personalizada", () => {
      const result = formatPrice(1000, "USD");
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
      }).format(1000);
      expect(result).toBe(expected);
    });

    it("formatea números decimales correctamente", () => {
      const result = formatPrice(1234.56);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(1234.56);
      expect(result).toBe(expected);
    });

    it("formatea números grandes correctamente", () => {
      const result = formatPrice(1000000);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(1000000);
      expect(result).toBe(expected);
    });

    it("formatea cero correctamente", () => {
      const result = formatPrice(0);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(0);
      expect(result).toBe(expected);
    });

    it("formatea números negativos correctamente", () => {
      const result = formatPrice(-500);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(-500);
      expect(result).toBe(expected);
    });
  });

  describe("formatCurrency", () => {
    it("formatea cantidad con pesos argentinos", () => {
      const result = formatCurrency(1500);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(1500);
      expect(result).toBe(expected);
    });

    it("formatea números decimales", () => {
      const result = formatCurrency(1234.56);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(1234.56);
      expect(result).toBe(expected);
    });

    it("formatea números grandes", () => {
      const result = formatCurrency(2500000);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(2500000);
      expect(result).toBe(expected);
    });

    it("formatea cero", () => {
      const result = formatCurrency(0);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(0);
      expect(result).toBe(expected);
    });

    it("formatea números negativos", () => {
      const result = formatCurrency(-750);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(-750);
      expect(result).toBe(expected);
    });

    it("formatea números muy pequeños", () => {
      const result = formatCurrency(0.01);
      const expected = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(0.01);
      expect(result).toBe(expected);
    });
  });

  describe("formatDate", () => {
    it("formatea fecha correctamente en formato argentino", () => {
      const date = new Date("2024-01-15T10:30:00");
      const result = formatDate(date);
      expect(result).toBe("15/01/2024");
    });

    it("formatea fechas del último día del mes", () => {
      const date = new Date("2024-02-29T23:59:59"); // Año bisiesto
      const result = formatDate(date);
      expect(result).toBe("29/02/2024");
    });

    it("formatea fechas del primer día del año", () => {
      const date = new Date("2024-01-01T00:00:00");
      const result = formatDate(date);
      expect(result).toBe("01/01/2024");
    });

    it("formatea fechas del último día del año", () => {
      const date = new Date("2024-12-31T23:59:59");
      const result = formatDate(date);
      expect(result).toBe("31/12/2024");
    });

    it("formatea fechas de diferentes meses", () => {
      const dates = [
        { date: new Date("2024-03-05"), expected: "05/03/2024" },
        { date: new Date("2024-06-15"), expected: "15/06/2024" },
        { date: new Date("2024-09-25"), expected: "25/09/2024" },
        { date: new Date("2024-11-08"), expected: "08/11/2024" },
      ];

      for (const { date, expected } of dates) {
        const result = formatDate(date);

        // Convertir el resultado a formato español
        const [day, month, year] = expected.split("/");
        const expectedFormatted = `${day}/${month}/${year}`;

        expect(result).toBe(expectedFormatted);
      }
    });

    it("maneja fechas en el pasado", () => {
      const date = new Date("2020-05-10T15:30:00");
      const result = formatDate(date);
      expect(result).toBe("10/05/2020");
    });

    it("maneja fechas en el futuro", () => {
      const date = new Date("2030-08-20T08:45:00");
      const result = formatDate(date);
      expect(result).toBe("20/08/2030");
    });
  });
});

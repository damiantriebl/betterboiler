import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateInventoryReportPDF } from "./actions";
import { POST } from "./route";

// Mock de la función de generación de PDF
vi.mock("./actions", () => ({
  generateInventoryReportPDF: vi.fn(),
}));

const mockGenerateInventoryReportPDF = vi.mocked(generateInventoryReportPDF);

const createRequest = (body: any) => {
  return {
    json: async () => body,
  } as unknown as NextRequest;
};

describe("POST /api/reports/inventory/generate-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve un PDF y headers correctos si todo sale bien", async () => {
    const fakeBuffer = new Uint8Array([1, 2, 3]).buffer;
    (mockGenerateInventoryReportPDF as any).mockResolvedValue({
      arrayBuffer: async () => fakeBuffer,
    });
    const req = createRequest({ dateRange: { from: "2024-01-01", to: "2024-01-31" } });
    const res = await POST(req);
    // @ts-ignore
    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer).toEqual(fakeBuffer);
    // @ts-ignore
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    // @ts-ignore
    expect(res.headers.get("Content-Disposition")).toContain("inventory-report.pdf");
    // @ts-ignore
    expect(res.status).toBe(200);
  });

  it("devuelve 500 si ocurre un error", async () => {
    (mockGenerateInventoryReportPDF as any).mockRejectedValue(new Error("fail"));
    const req = createRequest({ dateRange: { from: "2024-01-01", to: "2024-01-31" } });
    const res = await POST(req);
    // @ts-ignore
    expect(res.status).toBe(500);
    // @ts-ignore
    const text = await res.text();
    expect(text).toContain("Error generating PDF");
  });

  it("devuelve 500 si falta dateRange", async () => {
    const req = createRequest({});
    const res = await POST(req);
    // @ts-ignore
    expect(res.status).toBe(500);
  });
});

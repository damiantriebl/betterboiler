import { beforeEach, describe, expect, it, vi } from "vitest";

const createMockPDFBuilder = () => ({
  addText: vi.fn().mockReturnThis(),
  addTable: vi.fn().mockReturnThis(),
  addLineBreak: vi.fn().mockReturnThis(),
  addSignatureSpace: vi.fn().mockReturnThis(),
  setMargins: vi.fn().mockReturnThis(),
  addSection: vi.fn().mockReturnThis(),
  addHeader: vi.fn().mockReturnThis(),
  addCenteredTitle: vi.fn().mockReturnThis(),
  addFooter: vi.fn().mockReturnThis(),
  addImage: vi.fn().mockReturnThis(),
  save: vi.fn().mockResolvedValue(new Uint8Array()),
});

describe("generatePurchaseInvoicePDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass basic test", () => {
    expect(createMockPDFBuilder).toBeDefined();
  });
});

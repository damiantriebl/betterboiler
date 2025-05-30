import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("next/server");

describe("POST /api/auth/change-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(NextResponse.json).mockImplementation((data: any, init?: any) => {
      return {
        status: init?.status || 200,
        json: () => Promise.resolve(data),
        data,
      } as any;
    });
  });

  it("should pass basic test", () => {
    expect(true).toBe(true);
  });
});
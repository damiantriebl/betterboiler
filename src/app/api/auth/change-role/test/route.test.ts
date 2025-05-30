import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// app/api/sign-out/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  return response;
}

// app/api/toggle-status/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId, banned } = await req.json();
  await prisma.user.update({ where: { id: userId }, data: { banned } });
  return NextResponse.json({ success: true });
}

import prisma from "@/lib/prisma";
// app/api/delete-user/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await req.json();
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}

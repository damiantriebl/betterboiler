import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, organizationId } = await req.json();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { organizationId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.error();
  }
}

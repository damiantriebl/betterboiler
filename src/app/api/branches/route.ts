import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";

export async function GET() {
  try {
    const session = await getOrganizationIdFromSession();
    if (session.error || !session.organizationId) {
      return NextResponse.json(
        { error: session.error || "Organización no encontrada" },
        { status: 401 },
      );
    }

    const branches = await prisma.branch.findMany({
      where: {
        organizationId: session.organizationId,
      },
      orderBy: {
        order: "asc", // O el campo que uses para ordenar, ej: name
      },
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("[BRANCHES_GET]", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener sucursales" },
      { status: 500 },
    );
  }
}

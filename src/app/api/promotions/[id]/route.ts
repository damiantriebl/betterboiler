import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Obtener el ID de la organización desde la sesión
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) {
      return NextResponse.json(
        { error: "No se pudo obtener la organización del usuario" },
        { status: 401 },
      );
    }

    // Convertir el ID de la promoción a número
    const promotionId = Number.parseInt(params.id);
    if (Number.isNaN(promotionId)) {
      return NextResponse.json({ error: "ID de promoción inválido" }, { status: 400 });
    }

    // Buscar la promoción en la base de datos
    const promotion = await prisma.bankingPromotion.findUnique({
      where: {
        id: promotionId,
        organizationId,
      },
      include: {
        installmentPlans: true,
      },
    });

    if (!promotion) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    // Devolver la promoción
    return NextResponse.json(promotion);
  } catch (error: unknown) {
    console.error("Error al obtener promoción:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}

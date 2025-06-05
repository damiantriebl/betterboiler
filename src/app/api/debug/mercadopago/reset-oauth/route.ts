import { requireOrganizationId } from "@/actions/util";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST() {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("🧹 [RESET-OAUTH] Limpiando configuración OAuth para org:", organizationId);

    // Eliminar configuración OAuth existente
    const deleteResult = await prisma.mercadoPagoOAuth.deleteMany({
      where: {
        organizationId: organizationId,
      },
    });

    console.log("✅ [RESET-OAUTH] Configuración eliminada:", deleteResult);

    return NextResponse.json({
      success: true,
      message: "Configuración OAuth de MercadoPago eliminada completamente",
      details: {
        oauthConfigsDeleted: deleteResult.count,
      },
    });
  } catch (error) {
    console.error("❌ [RESET-OAUTH] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

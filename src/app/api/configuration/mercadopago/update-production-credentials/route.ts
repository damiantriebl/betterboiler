import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🔑 [Update Production] Actualizando credenciales de producción...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [Update Production] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { accessToken, publicKey } = body;

    // Validar que los tokens sean de producción
    if (!accessToken || !accessToken.startsWith("APP_USR-")) {
      return NextResponse.json(
        {
          error: "Access token debe ser de producción (APP_USR-xxx)",
        },
        { status: 400 },
      );
    }

    if (!publicKey || !publicKey.startsWith("APP_USR-")) {
      return NextResponse.json(
        {
          error: "Public key debe ser de producción (APP_USR-xxx)",
        },
        { status: 400 },
      );
    }

    // Verificar que el access token funcione
    const testResponse = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!testResponse.ok) {
      console.error("❌ [Update Production] Token inválido:", testResponse.status);
      return NextResponse.json(
        {
          error: "Access token inválido o sin permisos",
        },
        { status: 400 },
      );
    }

    const userData = await testResponse.json();
    console.log("✅ [Update Production] Token validado para usuario:", userData.email);

    // Buscar o crear configuración OAuth
    const existingConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: { organizationId },
    });

    if (existingConfig) {
      // Actualizar configuración existente
      await prisma.mercadoPagoOAuth.update({
        where: { organizationId },
        data: {
          accessToken,
          publicKey,
          email: userData.email,
          scopes: ["read", "write", "offline_access"], // Asumimos scopes estándar
          expiresAt: null, // Los tokens de producción no expiran automáticamente
          updatedAt: new Date(),
        },
      });
    } else {
      // Crear nueva configuración
      await prisma.mercadoPagoOAuth.create({
        data: {
          organizationId,
          mercadoPagoUserId: userData.id?.toString() || userData.user_id?.toString() || "unknown",
          accessToken,
          publicKey,
          email: userData.email,
          scopes: ["read", "write", "offline_access"],
          expiresAt: null,
          refreshToken: null, // Se agregará si se hace OAuth completo después
        },
      });
    }

    console.log("✅ [Update Production] Credenciales de producción guardadas");

    return NextResponse.json({
      success: true,
      message: "Credenciales de producción configuradas exitosamente",
      data: {
        email: userData.email,
        accessTokenType: "PRODUCTION",
        hasPublicKey: true,
      },
    });
  } catch (error) {
    console.error("❌ [Update Production] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

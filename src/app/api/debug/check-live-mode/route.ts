import { requireOrganizationId } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: "Access token no configurado" }, { status: 400 });
    }

    console.log("🔍 [CHECK-LIVE-MODE] Verificando estado de Live Mode...");

    // Consultar información del usuario/aplicación
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const userData = await response.json();

    if (response.ok) {
      console.log("✅ [CHECK-LIVE-MODE] Datos obtenidos:", {
        id: userData.id,
        email: userData.email,
        live_mode: userData.live_mode,
        status: userData.status,
        site_status: userData.site_status,
      });

      return NextResponse.json({
        success: true,
        live_mode: userData.live_mode || false,
        user_data: {
          id: userData.id,
          email: userData.email,
          country_id: userData.country_id,
          site_id: userData.site_id,
          status: userData.status,
          site_status: userData.site_status,
          live_mode: userData.live_mode,
        },
        credentials_type: accessToken.startsWith("APP_USR-") ? "PRODUCTION" : "TEST",
        diagnosis: {
          has_production_credentials: accessToken.startsWith("APP_USR-"),
          live_mode_active: userData.live_mode || false,
          can_receive_real_payments: accessToken.startsWith("APP_USR-") && userData.live_mode,
          required_action: userData.live_mode ? "READY" : "ACTIVATE_LIVE_MODE",
        },
      });
    }
    console.error("❌ [CHECK-LIVE-MODE] Error consultando usuario:", userData);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo verificar el estado de Live Mode",
        details: userData.message || "Error desconocido",
        mercadopago_error: userData,
        credentials_type: accessToken.startsWith("APP_USR-") ? "PRODUCTION" : "TEST",
      },
      { status: response.status },
    );
  } catch (error) {
    console.error("💥 [CHECK-LIVE-MODE] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

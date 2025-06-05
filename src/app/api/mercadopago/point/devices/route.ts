import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🏪 [PointDevices] Obteniendo dispositivos Point...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [PointDevices] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener access token de MercadoPago para esta organización
    const tokenResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/${organizationId}`,
    );
    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: "Configuración de MercadoPago no encontrada" },
        { status: 404 },
      );
    }

    const { accessToken } = await tokenResponse.json();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token no configurado" }, { status: 404 });
    }

    // Consultar dispositivos Point desde la API de MercadoPago
    const mpResponse = await fetch("https://api.mercadopago.com/point/integration-api/devices", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mpResponse.ok) {
      console.error(
        "❌ [PointDevices] Error de MercadoPago:",
        mpResponse.status,
        await mpResponse.text(),
      );
      return NextResponse.json(
        {
          error: "Error consultando dispositivos Point",
          details: `HTTP ${mpResponse.status}`,
        },
        { status: mpResponse.status },
      );
    }

    const mpData = await mpResponse.json();
    console.log("✅ [PointDevices] Dispositivos obtenidos:", mpData);

    // Formatear respuesta
    const devices =
      mpData.devices?.map((device: any) => ({
        id: device.id,
        name: device.pos_id || device.operating_mode || `Point ${device.id.slice(-4)}`,
        status: device.status || "UNKNOWN",
        battery: device.battery_level,
        model: device.device_model,
      })) || [];

    return NextResponse.json({
      success: true,
      devices,
      total: devices.length,
    });
  } catch (error) {
    console.error("❌ [PointDevices] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

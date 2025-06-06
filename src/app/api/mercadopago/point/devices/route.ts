import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🏪 [PointDevices] Obteniendo terminals Point (API v1)...");

    // Intentar validar acceso normal primero
    const { organizationId: validatedOrgId, error } = await validateOrganizationAccess();
    
    // Si falla la validación, usar organización por defecto (para pruebas)
    const organizationId = validatedOrgId || "cmbggeh3l0000lhqsxwreokun";
    
    if (error && !validatedOrgId) {
      console.log("⚠️ [PointDevices] No hay sesión válida, usando organización por defecto");
    }

    console.log("🏪 [PointDevices] Usando organización:", organizationId);

    // Obtener access token de MercadoPago para esta organización
    const tokenResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/${organizationId}`,
      {
        headers: {
          "x-debug-key": "DEBUG_KEY", // Bypass auth para pruebas
        }
      }
    );
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ [PointDevices] Error de configuración:", errorText);
      return NextResponse.json(
        { error: "Configuración de MercadoPago no encontrada", details: errorText },
        { status: 404 },
      );
    }

    const { accessToken, environment, credentialSource } = await tokenResponse.json();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token no configurado" }, { status: 404 });
    }

    // Consultar dispositivos Point desde la nueva API v1 de MercadoPago
    const mpResponse = await fetch("https://api.mercadopago.com/terminals/v1/list", {
      method: "GET", 
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error(
        "❌ [PointDevices] Error de MercadoPago Terminals API:",
        mpResponse.status,
        errorText,
      );
      return NextResponse.json(
        {
          error: "Error consultando terminals Point",
          details: `HTTP ${mpResponse.status}: ${errorText}`,
        },
        { status: mpResponse.status },
      );
    }

    const mpData = await mpResponse.json();
    console.log("✅ [PointDevices] Dispositivos obtenidos:", mpData);

    // Formatear respuesta según nueva estructura de terminals v1
    const devices =
      mpData.data?.terminals?.map((terminal: any) => ({
        id: terminal.id,
        name: terminal.external_pos_id || `Point ${terminal.id.split('__')[1] || terminal.id.slice(-4)}`,
        status: terminal.operating_mode === "PDV" ? "ONLINE" : "OFFLINE", // Mapear operating_mode a status
        pos_id: terminal.pos_id,
        store_id: terminal.store_id,
        operating_mode: terminal.operating_mode,
        model: terminal.id.split('__')[0] || "UNKNOWN", // Extraer modelo del ID
      })) || [];

    return NextResponse.json({
      success: true,
      devices,
      total: devices.length,
      debug: {
        organizationId,
        environment,
        credentialSource,
        accessTokenStart: accessToken.substring(0, 15),
        apiUrl: "https://api.mercadopago.com/terminals/v1/list",
        timestamp: new Date().toISOString(),
      },
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

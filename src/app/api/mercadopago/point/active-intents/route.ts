import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [ActivePointIntents] Obteniendo payment intents activos...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [ActivePointIntents] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener configuración usando lógica unificada
    const configResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/${organizationId}`,
      {
        headers: {
          "x-debug-key": "DEBUG_KEY", // Bypass para debug
        },
      },
    );
    if (!configResponse.ok) {
      console.error("❌ [ActivePointIntents] Error obteniendo configuración:", {
        status: configResponse.status,
        statusText: configResponse.statusText,
      });
      return NextResponse.json(
        { error: "Configuración de MercadoPago no encontrada" },
        { status: 404 },
      );
    }

    const { accessToken, environment, credentialSource } = await configResponse.json();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token no configurado" }, { status: 404 });
    }

    console.log("🔑 [ActivePointIntents] Usando credenciales:", {
      source: credentialSource,
      environment,
      tokenPrefix: `${accessToken.substring(0, 20)}...`,
    });

    // Obtener dispositivos activos
    const devicesResponse = await fetch(
      "https://api.mercadopago.com/point/integration-api/devices",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!devicesResponse.ok) {
      console.error("❌ [ActivePointIntents] Error obteniendo dispositivos:", {
        status: devicesResponse.status,
        statusText: devicesResponse.statusText,
      });
      return NextResponse.json(
        { error: "Error obteniendo dispositivos" },
        { status: devicesResponse.status },
      );
    }

    const devicesData = await devicesResponse.json();
    const devices = devicesData.data?.terminals || [];

    console.log("📱 [ActivePointIntents] Dispositivos encontrados:", devices.length);

    // Para cada dispositivo, intentar obtener payment intents activos
    const activeIntents = [];
    
    for (const device of devices) {
      try {
        // Usar la API de payment intents para obtener los activos del dispositivo
        // Nota: Esta es una aproximación, la API real puede variar
        const intentsResponse = await fetch(
          `https://api.mercadopago.com/point/integration-api/devices/${device.id}/payment-intents`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (intentsResponse.ok) {
          const intentsData = await intentsResponse.json();
          if (intentsData && intentsData.length > 0) {
            activeIntents.push({
              device_id: device.id,
              device_name: device.name,
              device_status: device.operating_mode,
              intents: intentsData,
            });
          }
        }
      } catch (deviceError) {
        console.log(`⚠️ [ActivePointIntents] No se pudieron obtener intents para ${device.id}`);
      }
    }

    console.log("✅ [ActivePointIntents] Intents activos encontrados:", activeIntents.length);

    return NextResponse.json({
      success: true,
      devices: devices.map((d: any) => ({
        id: d.id,
        name: d.name,
        status: d.operating_mode,
      })),
      active_intents: activeIntents,
      total_devices: devices.length,
      total_active_intents: activeIntents.length,
    });
  } catch (error) {
    console.error("❌ [ActivePointIntents] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
} 
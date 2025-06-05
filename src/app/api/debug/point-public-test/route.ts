import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [POINT-PUBLIC-TEST] Probando Point API sin autenticación...");
    
    // Verificar clave de debug
    const url = new URL(request.url);
    const debugKey = url.searchParams.get("key");
    const orgId = url.searchParams.get("org") || "cmbggeh3l0000lhqsxwreokun"; // Tu organización por defecto

    if (debugKey !== process.env.DEBUG_KEY && debugKey !== "DEBUG_KEY") {
      return NextResponse.json(
        { error: "Acceso denegado - clave de debug incorrecta" },
        { status: 403 },
      );
    }

    console.log("🏪 [POINT-PUBLIC-TEST] Probando para organización:", orgId);

    // Obtener configuración directamente (sin sesión)
    const tokenResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/${orgId}`,
      {
        headers: {
          "x-debug-key": debugKey, // Para bypass de auth si es necesario
        }
      }
    );

    console.log("📋 [POINT-PUBLIC-TEST] Respuesta de configuración:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ [POINT-PUBLIC-TEST] Error de configuración:", errorText);
      
      return NextResponse.json({
        success: false,
        error: "Configuración de MercadoPago no encontrada",
        details: `HTTP ${tokenResponse.status}: ${errorText}`,
        organizationId: orgId,
      });
    }

    const { accessToken, environment, credentialSource } = await tokenResponse.json();
    console.log("🔑 [POINT-PUBLIC-TEST] Token obtenido:", {
      hasToken: !!accessToken,
      environment,
      credentialSource,
      tokenStart: accessToken?.substring(0, 15) || "NO_TOKEN",
    });

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "Access token no configurado",
        organizationId: orgId,
        environment,
        credentialSource,
      });
    }

    // Probar API de Point Devices
    console.log("🏪 [POINT-PUBLIC-TEST] Consultando dispositivos Point...");
    const mpResponse = await fetch("https://api.mercadopago.com/terminals/v1/list", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📡 [POINT-PUBLIC-TEST] Respuesta de MercadoPago:", {
      status: mpResponse.status,
      ok: mpResponse.ok,
      statusText: mpResponse.statusText,
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("❌ [POINT-PUBLIC-TEST] Error de MercadoPago:", {
        status: mpResponse.status,
        error: errorText,
      });
      
      return NextResponse.json({
        success: false,
        error: "Error consultando Point API",
        details: `HTTP ${mpResponse.status}: ${errorText}`,
        debug: {
          organizationId: orgId,
          environment,
          credentialSource,
          accessTokenStart: accessToken.substring(0, 15),
          isTestToken: accessToken.startsWith("TEST-"),
          isProdToken: accessToken.startsWith("APP_USR-"),
        },
      });
    }

    const mpData = await mpResponse.json();
    console.log("✅ [POINT-PUBLIC-TEST] Datos obtenidos de MercadoPago:", mpData);

    // Formatear dispositivos
    const devices = mpData.data?.terminals?.map((terminal: any) => ({
      id: terminal.id,
      name: terminal.external_pos_id || `Point ${terminal.id.split('__')[1] || terminal.id.slice(-4)}`,
      status: terminal.operating_mode === "PDV" ? "ONLINE" : "OFFLINE",
      pos_id: terminal.pos_id,
      store_id: terminal.store_id,
      operating_mode: terminal.operating_mode,
      model: terminal.id.split('__')[0] || "UNKNOWN",
    })) || [];

    return NextResponse.json({
      success: true,
      message: "Point API funcionando correctamente",
      organizationId: orgId,
      environment,
      credentialSource,
      apiResponse: {
        status: mpResponse.status,
        totalDevices: devices.length,
        devices,
        rawResponse: mpData,
      },
      debug: {
        accessTokenStart: accessToken.substring(0, 15),
        isTestToken: accessToken.startsWith("TEST-"),
        isProdToken: accessToken.startsWith("APP_USR-"),
        apiUrl: "https://api.mercadopago.com/terminals/v1/list",
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("💥 [POINT-PUBLIC-TEST] Error crítico:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    );
  }
} 
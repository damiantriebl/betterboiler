import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Verificar clave de debug
    const url = new URL(request.url);
    const debugKey = url.searchParams.get("key");
    const testCode = url.searchParams.get("code") || "TEST_CODE_123";

    if (debugKey !== "DEBUG_KEY") {
      return NextResponse.json(
        { error: "Acceso denegado - clave de debug incorrecta" },
        { status: 403 },
      );
    }

    console.log("🧪 [OAUTH TEST] Iniciando test de intercambio de tokens");

    // Simular el intercambio de código por token usando las mismas credenciales
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MERCADOPAGO_CLIENT_ID || "",
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET || "",
        code: testCode,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.BASE_URL}/api/configuration/mercadopago/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    console.log("🔍 [OAUTH TEST] Respuesta de MercadoPago:", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
      data: tokenData,
    });

    return NextResponse.json({
      success: true,
      test: {
        testCode,
        credentials: {
          clientId: process.env.MERCADOPAGO_CLIENT_ID ? "PRESENTE" : "FALTANTE",
          clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET ? "PRESENTE" : "FALTANTE",
          redirectUri: `${process.env.BASE_URL}/api/configuration/mercadopago/callback`,
        },
        response: {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          ok: tokenResponse.ok,
          data: tokenData,
        },
        expectedErrors: {
          400: "Código inválido o ya usado",
          401: "CLIENT_ID o CLIENT_SECRET incorrectos",
          404: "Endpoint no encontrado",
          500: "Error interno de MercadoPago",
        },
      },
    });
  } catch (error) {
    console.error("❌ [OAUTH TEST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    );
  }
}

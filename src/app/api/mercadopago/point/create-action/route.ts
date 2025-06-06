import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🎯 [CreateAction] === INICIO CREACIÓN DE ACCIÓN ===");

    // Debug bypass
    const debugKey = request.headers.get("x-debug-key");
    const isDebugMode = debugKey === "DEBUG_KEY";

    if (!isDebugMode) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Parsear body de la request
    const body = await request.json();
    const { type = "print", terminal_id, external_reference, subtype = "text", content } = body;

    if (!terminal_id) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: terminal_id" },
        { status: 400 },
      );
    }

    console.log("🎯 [CreateAction] Datos recibidos:", {
      type,
      terminal_id,
      external_reference,
      subtype,
      content,
    });

    // Obtener configuración OAuth desde la API existente
    const configResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/cmbggeh3l0000lhqsxwreokun`,
      {
        headers: { "x-debug-key": "DEBUG_KEY" },
      },
    );

    if (!configResponse.ok) {
      console.error("❌ [CreateAction] Error obteniendo configuración");
      return NextResponse.json(
        { error: "Configuración de MercadoPago no encontrada" },
        { status: 404 },
      );
    }

    const config = await configResponse.json();
    const accessToken = config.accessToken;

    if (!accessToken) {
      console.error("❌ [CreateAction] No se encontró access token");
      return NextResponse.json(
        { error: "Access token de MercadoPago no encontrado" },
        { status: 404 },
      );
    }

    console.log("🔑 [CreateAction] Access Token:", `${accessToken.substring(0, 20)}...`);

    // Estructura para crear acción según documentación oficial
    // https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/point/impressions/create-action/post
    const actionData = {
      type: type, // "print" para impresiones
      external_reference: external_reference || `action-${Date.now()}`,
      config: {
        point: {
          terminal_id: terminal_id,
          subtype: subtype, // "text", "image", "qr", etc.
        },
      },
      // Contenido opcional para impresiones
      ...(content && { content: content }),
    };

    console.log("📤 [CreateAction] === ENVIANDO A MERCADOPAGO ===");
    console.log("📤 [CreateAction] URL:", "https://api.mercadopago.com/terminals/v1/actions");
    console.log("📤 [CreateAction] Action Data:", JSON.stringify(actionData, null, 2));

    // Crear acción usando Terminals API v1
    const actionResponse = await fetch("https://api.mercadopago.com/terminals/v1/actions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `action-${Date.now()}-${Math.random()}`,
      },
      body: JSON.stringify(actionData),
    });

    const actionResult = await actionResponse.json();

    console.log("📥 [CreateAction] === RESPUESTA DE MERCADOPAGO ===");
    console.log("📥 [CreateAction] Status HTTP:", actionResponse.status);
    console.log("📥 [CreateAction] Response:", JSON.stringify(actionResult, null, 2));

    if (!actionResponse.ok) {
      console.error("❌ [CreateAction] Error creando acción:", {
        status: actionResponse.status,
        error: actionResult,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Error creando acción",
          details: actionResult.message || "Error de comunicación con MercadoPago",
          mercadopago_error: actionResult,
        },
        { status: 400 },
      );
    }

    console.log("✅ [CreateAction] === ACCIÓN CREADA EXITOSAMENTE ===");
    console.log("✅ [CreateAction] Action ID:", actionResult.id);
    console.log("✅ [CreateAction] Status:", actionResult.status);
    console.log("✅ [CreateAction] Type:", actionResult.type);

    return NextResponse.json({
      success: true,
      action: {
        id: actionResult.id,
        type: actionResult.type,
        status: actionResult.status,
        external_reference: actionResult.external_reference,
        terminal_id: actionResult.config?.point?.terminal_id,
        created_date: actionResult.created_date,
      },
      message: "Acción creada exitosamente",
      additional_info: actionResult,
    });
  } catch (error) {
    console.error("💥 [CreateAction] === ERROR CRÍTICO ===");
    console.error("💥 [CreateAction] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

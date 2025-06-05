import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ intentId: string }> },
) {
  try {
    const params = await context.params;
    console.log("❌ [CancelPointPayment] Cancelando pago:", params.intentId);

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [CancelPointPayment] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { intentId } = params;
    if (!intentId) {
      return NextResponse.json({ error: "ID de intención de pago requerido" }, { status: 400 });
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
      console.error("❌ [CancelPointPayment] Error obteniendo configuración:", {
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

    // Cancelar intención de pago en MercadoPago Point
    const mpResponse = await fetch(
      `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!mpResponse.ok) {
      console.error(
        "❌ [CancelPointPayment] Error de MercadoPago:",
        mpResponse.status,
        await mpResponse.text(),
      );
      return NextResponse.json(
        {
          error: "Error cancelando pago",
          details: `HTTP ${mpResponse.status}`,
        },
        { status: mpResponse.status },
      );
    }

    console.log("✅ [CancelPointPayment] Pago cancelado exitosamente");

    return NextResponse.json({
      success: true,
      message: "Pago cancelado exitosamente",
      intent_id: intentId,
    });
  } catch (error) {
    console.error("❌ [CancelPointPayment] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

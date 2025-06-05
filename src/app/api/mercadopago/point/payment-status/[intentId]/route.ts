import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ intentId: string }> },
) {
  try {
    const params = await context.params;
    console.log("🔍 [PointPaymentStatus] Consultando estado del pago:", params.intentId);

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [PointPaymentStatus] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { intentId } = params;
    if (!intentId) {
      return NextResponse.json({ error: "ID de intención de pago requerido" }, { status: 400 });
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

    // Consultar estado del pago en MercadoPago Point
    const mpResponse = await fetch(
      `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!mpResponse.ok) {
      console.error(
        "❌ [PointPaymentStatus] Error de MercadoPago:",
        mpResponse.status,
        await mpResponse.text(),
      );
      return NextResponse.json(
        {
          error: "Error consultando estado del pago",
          details: `HTTP ${mpResponse.status}`,
        },
        { status: mpResponse.status },
      );
    }

    const mpData = await mpResponse.json();
    console.log("✅ [PointPaymentStatus] Estado obtenido:", {
      id: mpData.id,
      status: mpData.status,
      state: mpData.state,
    });

    // Formatear respuesta según el estado
    let formattedStatus = "PENDING";
    if (mpData.state === "FINISHED" && mpData.status === "approved") {
      formattedStatus = "FINISHED";
    } else if (mpData.state === "CANCELED" || mpData.status === "cancelled") {
      formattedStatus = "CANCELED";
    } else if (mpData.state === "ERROR" || mpData.status === "rejected") {
      formattedStatus = "ERROR";
    } else if (mpData.state === "PROCESSING" || mpData.status === "pending") {
      formattedStatus = "PROCESSING";
    }

    return NextResponse.json({
      success: true,
      intent_id: mpData.id,
      status: formattedStatus,
      payment: mpData.payment,
      state: mpData.state,
      payment_status: mpData.status,
      amount: mpData.amount,
      additional_info: mpData,
    });
  } catch (error) {
    console.error("❌ [PointPaymentStatus] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

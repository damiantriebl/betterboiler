import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ intentId: string }> },
) {
  try {
    const params = await context.params;
    console.log("🔍 [PointPaymentStatus] Consultando estado de la order:", params.intentId);

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [PointPaymentStatus] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { intentId } = params;
    if (!intentId) {
      return NextResponse.json({ error: "ID de order requerido" }, { status: 400 });
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
      console.error("❌ [PointPaymentStatus] Error obteniendo configuración:", {
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

    // ✅ Consultar estado de la order usando Orders API v1
    // https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/point/orders/get-order/get
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/orders/${intentId}`,
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
    
    // Extraer información del primer payment dentro de la order
    const payment = mpData.transactions?.payments?.[0];
    
    console.log("✅ [PointPaymentStatus] Estado de order obtenido:", {
      order_id: mpData.id,
      order_status: mpData.status,
      payment_id: payment?.id,
      payment_status: payment?.status,
      total_amount: mpData.total_amount,
    });

    // Formatear respuesta según el estado de la order y el payment
    let formattedStatus = "PENDING";
    if (mpData.status === "finished" && payment?.status === "approved") {
      formattedStatus = "FINISHED";
    } else if (mpData.status === "canceled" || payment?.status === "cancelled") {
      formattedStatus = "CANCELED";
    } else if (mpData.status === "error" || payment?.status === "rejected") {
      formattedStatus = "ERROR";
    } else if (mpData.status === "processing" || payment?.status === "pending") {
      formattedStatus = "PROCESSING";
    }

    return NextResponse.json({
      success: true,
      order_id: mpData.id, // ID de la order
      payment_id: payment?.id, // ID del payment
      status: formattedStatus,
      order_status: mpData.status,
      payment_status: payment?.status,
      total_amount: mpData.total_amount,
      paid_amount: mpData.total_paid_amount,
      external_reference: mpData.external_reference,
      terminal_id: mpData.config?.point?.terminal_id,
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

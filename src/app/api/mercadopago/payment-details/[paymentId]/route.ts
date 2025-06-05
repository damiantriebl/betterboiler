import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  const params = await context.params;
  const { paymentId } = params;

  try {
    console.log("🔍 [PaymentDetails] Consultando pago:", paymentId);

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [PaymentDetails] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!paymentId) {
      return NextResponse.json({ error: "ID de pago requerido" }, { status: 400 });
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

    console.log("🔑 [PaymentDetails] Usando access token para consultar pago");

    // Consultar detalles del pago en MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("❌ [PaymentDetails] Error de MercadoPago:", mpResponse.status, errorText);

      return NextResponse.json(
        {
          error: "Error consultando detalles del pago",
          details: `HTTP ${mpResponse.status}`,
          mercadopago_error: errorText,
          payment_id: paymentId,
        },
        { status: mpResponse.status },
      );
    }

    const paymentData = await mpResponse.json();
    console.log("✅ [PaymentDetails] Detalles obtenidos:", {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
    });

    // Formatear respuesta con información útil para debugging
    return NextResponse.json({
      success: true,
      payment_id: paymentData.id,
      external_reference: paymentData.external_reference,

      // Estado del pago
      status: paymentData.status,
      status_detail: paymentData.status_detail,

      // Información financiera
      transaction_amount: paymentData.transaction_amount,
      net_amount: paymentData.transaction_details?.net_received_amount,
      total_paid_amount: paymentData.transaction_details?.total_paid_amount,
      currency_id: paymentData.currency_id,

      // Información del método de pago
      payment_method_id: paymentData.payment_method_id,
      payment_type_id: paymentData.payment_type_id,
      installments: paymentData.installments,

      // Información del pagador
      payer: {
        id: paymentData.payer?.id,
        email: paymentData.payer?.email,
        first_name: paymentData.payer?.first_name,
        last_name: paymentData.payer?.last_name,
        identification: paymentData.payer?.identification,
      },

      // Fechas importantes
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved,
      date_last_updated: paymentData.date_last_updated,

      // Información de errores (si existen)
      failure_reason:
        paymentData.status === "rejected"
          ? {
              code: paymentData.status_detail,
              description: getFailureDescription(paymentData.status_detail),
            }
          : null,

      // Información técnica para debugging
      debug_info: {
        organization_id: organizationId,
        processing_mode: paymentData.processing_mode,
        pos_id: paymentData.pos_id,
        store_id: paymentData.store_id,
        collector_id: paymentData.collector_id,
        sponsor_id: paymentData.sponsor_id,
        platform_id: paymentData.platform_id,
        merchant_account_id: paymentData.merchant_account_id,
      },

      // Respuesta completa de MercadoPago para análisis técnico
      raw_response: paymentData,
    });
  } catch (error) {
    console.error("❌ [PaymentDetails] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        payment_id: paymentId,
      },
      { status: 500 },
    );
  }
}

// Helper function para describir errores comunes
function getFailureDescription(statusDetail: string): string {
  const descriptions: { [key: string]: string } = {
    cc_rejected_insufficient_amount: "Fondos insuficientes",
    cc_rejected_bad_filled_card_number: "Número de tarjeta incorrecto",
    cc_rejected_bad_filled_date: "Fecha de vencimiento incorrecta",
    cc_rejected_bad_filled_security_code: "Código de seguridad incorrecto",
    cc_rejected_bad_filled_other: "Datos de tarjeta incorrectos",
    cc_rejected_blacklist: "Tarjeta en lista negra",
    cc_rejected_call_for_authorize: "Debe autorizar el pago con el banco",
    cc_rejected_card_disabled: "Tarjeta deshabilitada",
    cc_rejected_card_error: "Error de tarjeta",
    cc_rejected_duplicated_payment: "Pago duplicado",
    cc_rejected_high_risk: "Pago rechazado por riesgo",
    cc_rejected_max_attempts: "Máximo de intentos alcanzado",
    cc_rejected_other_reason: "Rechazo general",
    rejected_by_regulations: "Rechazado por regulaciones",
    rejected_by_bank: "Rechazado por el banco emisor",
    rejected_insufficient_data: "Datos insuficientes",
  };

  return descriptions[statusDetail] || statusDetail;
}

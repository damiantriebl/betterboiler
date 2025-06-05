import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🏪 [CreatePointPayment] Creando intención de pago...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [CreatePointPayment] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Parsear body de la request
    const body = await request.json();
    const { amount, description, device_id, external_reference, metadata } = body;

    if (!amount || !description || !device_id) {
      return NextResponse.json(
        {
          error: "Faltan parámetros requeridos: amount, description, device_id",
        },
        { status: 400 },
      );
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

    // Crear intención de pago en MercadoPago Point
    const paymentData = {
      amount: Number.parseFloat(amount),
      description: description,
      external_reference: external_reference,
      installments: 1,
      payment_method: {
        type: "credit_card",
      },
      notification_url: `${request.nextUrl.origin}/api/webhooks/mercadopago`,
      additional_info: {
        external_reference: external_reference,
        ...metadata,
      },
    };

    console.log("📤 [CreatePointPayment] Enviando a MercadoPago:", {
      device_id,
      amount: paymentData.amount,
      description: paymentData.description,
    });

    const mpResponse = await fetch(
      `https://api.mercadopago.com/point/integration-api/devices/${device_id}/payment-intents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      },
    );

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("❌ [CreatePointPayment] Error de MercadoPago:", mpResponse.status, mpData);
      return NextResponse.json(
        {
          error: "Error creando intención de pago",
          details: mpData.message || `HTTP ${mpResponse.status}`,
          mercadopago_error: mpData,
        },
        { status: mpResponse.status },
      );
    }

    console.log("✅ [CreatePointPayment] Intención creada:", mpData);

    return NextResponse.json({
      success: true,
      payment_intent_id: mpData.id,
      device_id: device_id,
      amount: paymentData.amount,
      status: mpData.status || "PENDING",
      additional_info: mpData,
    });
  } catch (error) {
    console.error("❌ [CreatePointPayment] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

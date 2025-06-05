import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ organizationId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { organizationId } = await params;
    const body = await request.json();

    console.log("🔔 [WEBHOOK-ORG] Webhook recibido para organización:", organizationId);
    console.log("🔔 [WEBHOOK-ORG] Datos:", body);

    // Validar que es una notificación de pago
    if (body.type !== "payment") {
      console.log("ℹ️ [WEBHOOK-ORG] Notificación ignorada - no es de tipo payment");
      return NextResponse.json({ status: "ignored" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error("❌ [WEBHOOK-ORG] No se encontró ID de pago en la notificación");
      return NextResponse.json({ error: "Payment ID missing" }, { status: 400 });
    }

    // Verificar que existe configuración OAuth para esta organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    // NUEVO: Lógica inteligente para obtener access token (igual que en process-payment)
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalIsTest = globalAccessToken?.startsWith("TEST-");
    const oauthIsTest = oauthConfig?.accessToken?.startsWith("TEST-");

    let accessToken = null;
    let credentialSource = "none";

    // PRIORIDAD: TEST > PRODUCCIÓN para desarrollo
    if (globalIsTest) {
      accessToken = globalAccessToken;
      credentialSource = "global-test";
      console.log("🧪 [WEBHOOK-ORG] Usando credenciales globales TEST");
    } else if (oauthIsTest && oauthConfig?.accessToken) {
      accessToken = oauthConfig.accessToken;
      credentialSource = "oauth-test";
      console.log("🧪 [WEBHOOK-ORG] Usando credenciales OAuth TEST");
    } else if (oauthConfig?.accessToken) {
      accessToken = oauthConfig.accessToken;
      credentialSource = "oauth-prod";
      console.log("🏭 [WEBHOOK-ORG] Usando credenciales OAuth PRODUCCIÓN");
    } else if (globalAccessToken) {
      accessToken = globalAccessToken;
      credentialSource = "global-prod";
      console.log("🏭 [WEBHOOK-ORG] Usando credenciales globales PRODUCCIÓN");
    }

    if (!accessToken) {
      console.error(
        "❌ [WEBHOOK-ORG] No se encontraron credenciales para organización:",
        organizationId,
      );
      return NextResponse.json({ error: "MP config not found" }, { status: 400 });
    }

    console.log("🔑 [WEBHOOK-ORG] Credenciales seleccionadas:", {
      credentialSource,
      organizationId,
    });

    // Consultar detalles del pago desde MercadoPago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      console.error(
        "❌ [WEBHOOK-ORG] Error al consultar pago en MercadoPago:",
        paymentResponse.status,
      );
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paymentData = await paymentResponse.json();
    console.log("💳 [WEBHOOK-ORG] Datos del pago obtenidos:", {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      external_reference: paymentData.external_reference,
      organizationId,
    });

    // Procesar según el estado del pago
    switch (paymentData.status) {
      case "approved":
        console.log("✅ [WEBHOOK-ORG] Pago aprobado:", paymentId);
        await handleApprovedPayment(paymentData, organizationId);
        break;

      case "pending":
        console.log("⏳ [WEBHOOK-ORG] Pago pendiente:", paymentId);
        await handlePendingPayment(paymentData, organizationId);
        break;

      case "rejected":
      case "cancelled":
        console.log("❌ [WEBHOOK-ORG] Pago rechazado/cancelado:", paymentId);
        await handleRejectedPayment(paymentData, organizationId);
        break;

      default:
        console.log("ℹ️ [WEBHOOK-ORG] Estado de pago no manejado:", paymentData.status);
    }

    return NextResponse.json({
      status: "processed",
      organizationId,
      paymentId,
      credentialSource,
    });
  } catch (error) {
    console.error("❌ [WEBHOOK-ORG] Error procesando webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleApprovedPayment(paymentData: any, organizationId: string) {
  try {
    console.log("✅ [WEBHOOK-ORG] Procesando pago aprobado para org:", organizationId, {
      paymentId: paymentData.id,
      amount: paymentData.transaction_amount,
      payerEmail: paymentData.payer?.email,
    });

    // TODO: Implementar lógica específica del negocio para esta organización
    // - Actualizar estado de venta en BD
    // - Registrar el pago
    // - Enviar notificación al cliente de ESTA organización
    // - Generar factura/recibo con datos de ESTA organización
  } catch (error) {
    console.error("❌ [WEBHOOK-ORG] Error procesando pago aprobado:", error);
  }
}

async function handlePendingPayment(paymentData: any, organizationId: string) {
  try {
    console.log("⏳ [WEBHOOK-ORG] Procesando pago pendiente para org:", organizationId, {
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
    });

    // TODO: Implementar lógica para pagos pendientes de ESTA organización
  } catch (error) {
    console.error("❌ [WEBHOOK-ORG] Error procesando pago pendiente:", error);
  }
}

async function handleRejectedPayment(paymentData: any, organizationId: string) {
  try {
    console.log("❌ [WEBHOOK-ORG] Procesando pago rechazado para org:", organizationId, {
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
    });

    // TODO: Implementar lógica para pagos rechazados de ESTA organización
  } catch (error) {
    console.error("❌ [WEBHOOK-ORG] Error procesando pago rechazado:", error);
  }
}

// Endpoint GET para verificar el estado del webhook
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { organizationId } = await params;

  return NextResponse.json({
    status: "active",
    service: "MercadoPago Webhook",
    organizationId,
    timestamp: new Date().toISOString(),
  });
}

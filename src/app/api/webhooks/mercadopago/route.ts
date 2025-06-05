import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🔔 [WEBHOOK-GENERIC] Webhook de MercadoPago recibido:", body);

    // Validar que es una notificación de pago
    if (body.type !== "payment") {
      console.log("ℹ️ [WEBHOOK-GENERIC] Notificación ignorada - no es de tipo payment");
      return NextResponse.json({ status: "ignored" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error("❌ [WEBHOOK-GENERIC] No se encontró ID de pago en la notificación");
      return NextResponse.json({ error: "Payment ID missing" }, { status: 400 });
    }

    console.log(
      "🔍 [WEBHOOK-GENERIC] Consultando detalles del pago para obtener organizationId...",
    );

    // PASO 1: Obtener detalles del pago usando credenciales globales para consulta inicial
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!globalAccessToken) {
      console.error("❌ [WEBHOOK-GENERIC] No se encontraron credenciales globales");
      return NextResponse.json({ error: "No credentials found" }, { status: 500 });
    }

    const initialPaymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${globalAccessToken}`,
        },
      },
    );

    if (!initialPaymentResponse.ok) {
      console.error(
        "❌ [WEBHOOK-GENERIC] Error en consulta inicial del pago:",
        initialPaymentResponse.status,
      );
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const initialPaymentData = await initialPaymentResponse.json();
    console.log("💳 [WEBHOOK-GENERIC] Datos iniciales del pago:", {
      id: initialPaymentData.id,
      status: initialPaymentData.status,
      metadata: initialPaymentData.metadata,
    });

    // PASO 2: Extraer organizationId del metadata
    const organizationId = initialPaymentData.metadata?.organization_id;

    if (!organizationId) {
      console.error(
        "❌ [WEBHOOK-GENERIC] No se encontró organization_id en metadata:",
        initialPaymentData.metadata,
      );
      return NextResponse.json({ error: "Organization ID not found in metadata" }, { status: 400 });
    }

    console.log("🏢 [WEBHOOK-GENERIC] Organización identificada:", organizationId);

    // PASO 3: Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    // PASO 4: Aplicar la misma lógica inteligente de credenciales que en process-payment
    let accessToken = null;
    let credentialSource = "none";

    const globalIsTest = globalAccessToken?.startsWith("TEST-");
    const oauthIsTest = oauthConfig?.accessToken?.startsWith("TEST-");

    // PRIORIDAD: TEST > PRODUCCIÓN para desarrollo
    if (globalIsTest) {
      accessToken = globalAccessToken;
      credentialSource = "global-test";
      console.log("🧪 [WEBHOOK-GENERIC] Usando credenciales globales TEST");
    } else if (oauthIsTest && oauthConfig?.accessToken) {
      accessToken = oauthConfig.accessToken;
      credentialSource = "oauth-test";
      console.log("🧪 [WEBHOOK-GENERIC] Usando credenciales OAuth TEST");
    } else if (oauthConfig?.accessToken) {
      accessToken = oauthConfig.accessToken;
      credentialSource = "oauth-prod";
      console.log("🏭 [WEBHOOK-GENERIC] Usando credenciales OAuth PRODUCCIÓN");
    } else if (globalAccessToken) {
      accessToken = globalAccessToken;
      credentialSource = "global-prod";
      console.log("🏭 [WEBHOOK-GENERIC] Usando credenciales globales PRODUCCIÓN");
    }

    if (!accessToken) {
      console.error(
        "❌ [WEBHOOK-GENERIC] No se encontraron credenciales para organización:",
        organizationId,
      );
      return NextResponse.json({ error: "MP config not found" }, { status: 400 });
    }

    console.log("🔑 [WEBHOOK-GENERIC] Credenciales seleccionadas:", {
      credentialSource,
      organizationId,
    });

    // PASO 5: Consultar detalles completos del pago con las credenciales correctas
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      console.error(
        "❌ [WEBHOOK-GENERIC] Error al consultar pago con credenciales correctas:",
        paymentResponse.status,
      );
      return NextResponse.json(
        { error: "Payment not found with correct credentials" },
        { status: 404 },
      );
    }

    const paymentData = await paymentResponse.json();
    console.log("💳 [WEBHOOK-GENERIC] Datos completos del pago obtenidos:", {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      external_reference: paymentData.external_reference,
      organizationId,
    });

    // PASO 6: Procesar según el estado del pago
    switch (paymentData.status) {
      case "approved":
        console.log("✅ [WEBHOOK-GENERIC] Pago aprobado:", paymentId);
        await handleApprovedPayment(paymentData, organizationId);
        break;

      case "pending":
        console.log("⏳ [WEBHOOK-GENERIC] Pago pendiente:", paymentId);
        await handlePendingPayment(paymentData, organizationId);
        break;

      case "rejected":
      case "cancelled":
        console.log("❌ [WEBHOOK-GENERIC] Pago rechazado/cancelado:", paymentId);
        await handleRejectedPayment(paymentData, organizationId);
        break;

      default:
        console.log("ℹ️ [WEBHOOK-GENERIC] Estado de pago no manejado:", paymentData.status);
    }

    return NextResponse.json({
      status: "processed",
      organizationId,
      paymentId,
      credentialSource,
    });
  } catch (error) {
    console.error("❌ [WEBHOOK-GENERIC] Error procesando webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleApprovedPayment(paymentData: any, organizationId: string) {
  try {
    console.log("✅ [WEBHOOK-GENERIC] Procesando pago aprobado para org:", organizationId, {
      paymentId: paymentData.id,
      amount: paymentData.transaction_amount,
      payerEmail: paymentData.payer?.email,
    });

    // Guardar el pago en la base de datos
    const payment = await prisma.payment.create({
      data: {
        organizationId: organizationId,
        amountPaid: paymentData.transaction_amount,
        paymentDate: new Date(paymentData.date_approved || paymentData.date_created),
        paymentMethod: `MercadoPago - ${paymentData.payment_method_id}`,
        transactionReference: paymentData.id.toString(),
        status: "COMPLETED",
        notes: JSON.stringify({
          mercadopago_payment_id: paymentData.id,
          mercadopago_status: paymentData.status,
          mercadopago_status_detail: paymentData.status_detail,
          payer_email: paymentData.payer?.email,
          payment_method: paymentData.payment_method_id,
          installments: paymentData.installments,
          external_reference: paymentData.external_reference,
          live_mode: paymentData.live_mode,
        }),
      },
    });

    console.log("💾 [WEBHOOK-GENERIC] Pago guardado en BD:", {
      paymentId: payment.id,
      mercadopagoId: paymentData.id,
      amount: payment.amountPaid,
      organizationId,
    });

    // Crear notificación para mostrar toast al usuario
    await createPaymentNotification(organizationId, paymentData, payment);
  } catch (error) {
    console.error("❌ [WEBHOOK-GENERIC] Error procesando pago aprobado:", error);
  }
}

async function createPaymentNotification(organizationId: string, paymentData: any, payment: any) {
  try {
    const message = `MercadoPago confirmó su pago de $${paymentData.transaction_amount}`;

    // Guardar notificación en BD (expira en 1 hora) - usando casting temporal
    const notification = await (prisma as any).paymentNotification.create({
      data: {
        organizationId: organizationId,
        paymentId: payment.id,
        mercadopagoId: paymentData.id.toString(),
        message: message,
        amount: paymentData.transaction_amount,
        isRead: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
    });

    console.log("🔔 [WEBHOOK-GENERIC] Notificación de pago guardada:", {
      notificationId: notification.id,
      organizationId,
      paymentId: payment.id,
      mercadopagoId: paymentData.id,
      amount: paymentData.transaction_amount,
      message,
    });
  } catch (error) {
    console.error("❌ [WEBHOOK-GENERIC] Error creando notificación:", error);
  }
}

async function handlePendingPayment(paymentData: any, organizationId: string) {
  try {
    console.log("⏳ [WEBHOOK-GENERIC] Procesando pago pendiente para org:", organizationId, {
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
    });

    // TODO: Implementar lógica para pagos pendientes de ESTA organización
  } catch (error) {
    console.error("❌ [WEBHOOK-GENERIC] Error procesando pago pendiente:", error);
  }
}

async function handleRejectedPayment(paymentData: any, organizationId: string) {
  try {
    console.log("❌ [WEBHOOK-GENERIC] Procesando pago rechazado para org:", organizationId, {
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
    });

    // TODO: Implementar lógica para pagos rechazados de ESTA organización
  } catch (error) {
    console.error("❌ [WEBHOOK-GENERIC] Error procesando pago rechazado:", error);
  }
}

// Endpoint GET para verificar el estado del webhook
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "MercadoPago Webhook",
    timestamp: new Date().toISOString(),
  });
}

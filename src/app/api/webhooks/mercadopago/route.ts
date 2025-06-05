import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🔔 [WEBHOOK-GENERIC] Webhook de MercadoPago recibido:", body);

    // 🆕 EXTRACCIÓN DE ORGANIZATION_ID: Desde URL params (Point Smart) o metadata (pagos online)
    const urlParams = new URL(request.url).searchParams;
    const organizationIdFromUrl = urlParams.get("organization_id");
    console.log("🔍 [WEBHOOK-GENERIC] Organization ID desde URL:", organizationIdFromUrl);

    // Validar que es una notificación de pago o order (Point Smart)
    if (body.type !== "payment" && body.type !== "order") {
      console.log(`ℹ️ [WEBHOOK-GENERIC] Notificación ignorada - tipo: ${body.type}`);
      return NextResponse.json({ status: "ignored" });
    }

    const resourceId = body.data?.id;
    if (!resourceId) {
      console.error("❌ [WEBHOOK-GENERIC] No se encontró ID en la notificación");
      return NextResponse.json({ error: "Resource ID missing" }, { status: 400 });
    }

    console.log("🔍 [WEBHOOK-GENERIC] Consultando detalles del recurso:", {
      type: body.type,
      resourceId: resourceId,
    });

    // PASO 1: Obtener detalles usando credenciales globales para consulta inicial
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!globalAccessToken) {
      console.error("❌ [WEBHOOK-GENERIC] No se encontraron credenciales globales");
      return NextResponse.json({ error: "No credentials found" }, { status: 500 });
    }

    // Determinar endpoint según el tipo de notificación
    const apiEndpoint = body.type === "order" 
      ? `https://api.mercadopago.com/v1/orders/${resourceId}`
      : `https://api.mercadopago.com/v1/payments/${resourceId}`;

    console.log("🌐 [WEBHOOK-GENERIC] Consultando endpoint:", apiEndpoint);

    const initialResponse = await fetch(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${globalAccessToken}`,
      },
    });

    if (!initialResponse.ok) {
      console.error(
        "❌ [WEBHOOK-GENERIC] Error en consulta inicial:",
        initialResponse.status,
      );
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const initialData = await initialResponse.json();
    console.log("💳 [WEBHOOK-GENERIC] Datos iniciales del recurso:", {
      id: initialData.id,
      status: initialData.status,
      metadata: initialData.metadata,
      type: body.type,
    });

    // PASO 2: Extraer organizationId - PRIORIDAD: URL params (Point Smart) > metadata (pagos online)
    const organizationIdFromMetadata = initialData.metadata?.organization_id;
    const organizationId = organizationIdFromUrl || organizationIdFromMetadata;

    console.log("🏢 [WEBHOOK-GENERIC] Organization IDs encontrados:", {
      fromUrl: organizationIdFromUrl,
      fromMetadata: organizationIdFromMetadata,
      selected: organizationId,
    });

    if (!organizationId) {
      console.error(
        "❌ [WEBHOOK-GENERIC] No se encontró organization_id en URL ni metadata:",
        {
          urlParams: Object.fromEntries(urlParams),
          metadata: initialData.metadata,
        },
      );
      return NextResponse.json({ error: "Organization ID not found" }, { status: 400 });
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

    // PASO 5: Consultar detalles completos con las credenciales correctas
    const finalResponse = await fetch(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!finalResponse.ok) {
      console.error(
        "❌ [WEBHOOK-GENERIC] Error al consultar recurso con credenciales correctas:",
        finalResponse.status,
      );
      return NextResponse.json(
        { error: "Resource not found with correct credentials" },
        { status: 404 },
      );
    }

    const finalData = await finalResponse.json();
    console.log("💳 [WEBHOOK-GENERIC] Datos completos obtenidos:", {
      id: finalData.id,
      status: finalData.status,
      type: body.type,
      organizationId,
    });

    // PASO 6: Procesar según el tipo y estado
    if (body.type === "order") {
      // Manejar webhooks de Point Smart (orders)
      console.log("🏪 [WEBHOOK-GENERIC] Procesando order de Point Smart:", finalData.id);
      
      // Extraer el payment de la order para manejar con la lógica existente
      const payment = finalData.transactions?.payments?.[0];
      if (payment) {
        await handlePaymentFromOrder(payment, finalData, organizationId);
      } else {
        console.warn("⚠️ [WEBHOOK-GENERIC] No se encontró payment en la order");
      }
    } else if (body.type === "payment") {
      // Manejar webhooks de pagos online con la lógica existente
      await handleDirectPayment(finalData, organizationId);
    }

    return NextResponse.json({
      status: "processed",
      organizationId,
      resourceId,
      resourceType: body.type,
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

// 🆕 FUNCIONES PARA MANEJAR WEBHOOKS DE POINT SMART Y PAGOS DIRECTOS

async function handlePaymentFromOrder(payment: any, order: any, organizationId: string) {
  try {
    console.log("🏪 [WEBHOOK-POINT] Procesando payment desde order de Point Smart:", {
      orderId: order.id,
      paymentId: payment.id,
      paymentStatus: payment.status,
      orderStatus: order.status,
      amount: payment.amount,
    });

    // Convertir payment de order a formato compatible con la lógica existente
    const paymentData = {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: Number.parseFloat(payment.amount),
      date_approved: payment.date_approved || order.date_created,
      date_created: payment.date_created || order.date_created,
      payment_method_id: payment.payment_method?.id || "point_smart",
      payer: {
        email: order.payer?.email || "point@smartdevice.com",
      },
      external_reference: order.external_reference,
      live_mode: order.live_mode,
      // Información específica de Point Smart
      point_smart_order_id: order.id,
      point_smart_terminal: order.config?.point?.terminal_id,
    };

    // Usar la lógica existente según el estado
    switch (payment.status) {
      case "processed":
      case "approved":
        console.log("✅ [WEBHOOK-POINT] Payment aprobado en Point Smart");
        await handleApprovedPayment(paymentData, organizationId);
        break;
      case "pending":
        console.log("⏳ [WEBHOOK-POINT] Payment pendiente en Point Smart");
        await handlePendingPayment(paymentData, organizationId);
        break;
      case "failed":
      case "rejected":
      case "cancelled":
        console.log("❌ [WEBHOOK-POINT] Payment fallido en Point Smart");
        await handleRejectedPayment(paymentData, organizationId);
        break;
      default:
        console.log(`ℹ️ [WEBHOOK-POINT] Estado no manejado: ${payment.status}`);
    }
  } catch (error) {
    console.error("❌ [WEBHOOK-POINT] Error procesando payment desde order:", error);
  }
}

async function handleDirectPayment(paymentData: any, organizationId: string) {
  try {
    console.log("💳 [WEBHOOK-PAYMENT] Procesando payment directo:", {
      paymentId: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
    });

    // Usar la lógica existente según el estado
    switch (paymentData.status) {
      case "approved":
        console.log("✅ [WEBHOOK-PAYMENT] Payment directo aprobado");
        await handleApprovedPayment(paymentData, organizationId);
        break;
      case "pending":
        console.log("⏳ [WEBHOOK-PAYMENT] Payment directo pendiente");
        await handlePendingPayment(paymentData, organizationId);
        break;
      case "rejected":
      case "cancelled":
        console.log("❌ [WEBHOOK-PAYMENT] Payment directo rechazado");
        await handleRejectedPayment(paymentData, organizationId);
        break;
      default:
        console.log(`ℹ️ [WEBHOOK-PAYMENT] Estado no manejado: ${paymentData.status}`);
    }
  } catch (error) {
    console.error("❌ [WEBHOOK-PAYMENT] Error procesando payment directo:", error);
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

import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
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
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/orders/${intentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

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
      order_status_detail: mpData.status_detail, // 🆕 Importante para determinar si está acreditado
      payment_id: payment?.id,
      payment_status: payment?.status,
      payment_status_detail: payment?.status_detail, // 🆕 Importante para el estado final
      total_amount: mpData.total_amount,
      paid_amount: mpData.total_paid_amount,
      external_reference: mpData.external_reference,
      terminal_id: mpData.config?.point?.terminal_id,
      created_date: mpData.created_date,
      last_updated_date: mpData.last_updated_date,
    });

    // 🆕 CREAR NOTIFICACIONES BASADAS EN CAMBIOS DE ESTADO
    await createPointSmartNotification(mpData, payment, organizationId);

    // Formatear respuesta según el estado de la order y el payment
    // Según documentación: https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/point/orders/get-order/get
    let formattedStatus = "PENDING";

    // Extraer estados importantes
    const orderStatus = mpData.status;
    const orderStatusDetail = mpData.status_detail;
    const paymentStatus = payment?.status;
    const paymentStatusDetail = payment?.status_detail;

    console.log("🔍 [PointPaymentStatus] Evaluando estados completos:", {
      orderStatus,
      orderStatusDetail,
      paymentStatus,
      paymentStatusDetail,
      hasPayment: !!payment,
    });

    // IMPORTANTE: En MercadoPago Point, "processed" + "accredited" = PAGO APROBADO
    if (
      (orderStatus === "processed" && orderStatusDetail === "accredited") ||
      (paymentStatus === "processed" && paymentStatusDetail === "accredited") ||
      (orderStatus === "finished" && paymentStatus === "approved")
    ) {
      formattedStatus = "FINISHED"; // ✅ PAGO EXITOSO
    } else if (orderStatus === "refunded" || paymentStatus === "refunded") {
      formattedStatus = "REFUNDED";
    } else if (orderStatus === "canceled" || paymentStatus === "cancelled") {
      formattedStatus = "CANCELED";
    } else if (
      paymentStatus === "rejected" ||
      paymentStatus === "failed" ||
      paymentStatusDetail === "rejected"
    ) {
      formattedStatus = "ERROR";
    } else if (orderStatus === "at_terminal" || paymentStatus === "at_terminal") {
      formattedStatus = "WAITING"; // Esperando interacción en el Point
    } else if (orderStatus === "processing" || paymentStatus === "pending") {
      formattedStatus = "PROCESSING";
    } else if (orderStatus === "created" || orderStatus === "open") {
      formattedStatus = "WAITING";
    }

    return NextResponse.json({
      success: true,
      order_id: mpData.id, // ID de la order
      payment_id: payment?.id, // ID del payment
      status: formattedStatus,
      order_status: mpData.status,
      order_status_detail: mpData.status_detail, // 🆕 Incluir status_detail
      payment_status: payment?.status,
      payment_status_detail: payment?.status_detail, // 🆕 Incluir status_detail del payment
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

// 🆕 FUNCIÓN PARA CREAR NOTIFICACIONES DE POINT SMART SIN WEBHOOKS
async function createPointSmartNotification(orderData: any, payment: any, organizationId: string) {
  try {
    const orderId = orderData.id;
    const currentStatus = payment?.status || orderData.status;

    // Verificar si ya existe una notificación para esta order con el mismo estado
    const existingNotification = await (prisma as any).paymentNotification.findFirst({
      where: {
        organization: {
          id: organizationId,
        },
        mercadopagoId: orderId,
        isRead: false, // Solo buscar notificaciones no leídas
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Si ya existe una notificación para esta order y el estado es el mismo, no crear otra
    if (existingNotification) {
      const existingData = JSON.parse(existingNotification.notes || "{}");
      if (existingData.payment_status === currentStatus) {
        console.log("📢 [PointSmartNotification] Notificación ya existe para:", {
          orderId,
          status: currentStatus,
          notificationId: existingNotification.id,
        });
        return; // No crear duplicado
      }
    }

    // Considerar tanto status como status_detail
    const statusDetail = payment?.status_detail || orderData.status_detail;

    // Crear mensaje según el estado
    let message = "";
    let shouldNotify = false;

    // Verificar primero el status_detail que es más específico
    if (statusDetail === "accredited" || currentStatus === "approved") {
      message = `✅ Pago Point Smart APROBADO - $${payment?.paid_amount || payment?.amount || orderData.total_paid_amount || "N/A"}`;
      shouldNotify = true;
    } else if (
      statusDetail === "rejected" ||
      currentStatus === "rejected" ||
      currentStatus === "failed"
    ) {
      message = `❌ Pago Point Smart RECHAZADO - Order ${orderId}`;
      shouldNotify = true;
    } else if (currentStatus === "processed" && !statusDetail) {
      // processed sin status_detail aún no está completo
      message = `⏳ Procesando pago Point Smart - Order ${orderId}`;
      shouldNotify = false; // No notificar hasta tener status_detail
    } else if (currentStatus === "at_terminal") {
      message = `📱 Esperando pago en Point Smart - Order ${orderId}`;
      shouldNotify = true;
    } else if (currentStatus === "pending") {
      message = `⏳ Pago Point Smart pendiente - Order ${orderId}`;
      shouldNotify = true;
    } else if (currentStatus === "cancelled") {
      message = `🚫 Pago Point Smart CANCELADO - Order ${orderId}`;
      shouldNotify = true;
    } else {
      message = `📱 Point Smart: ${currentStatus} - Order ${orderId}`;
      shouldNotify = false;
    }

    if (!shouldNotify) {
      console.log("📢 [PointSmartNotification] Estado no requiere notificación:", currentStatus);
      return;
    }

    // Crear la notificación con relación correcta
    const notification = await (prisma as any).paymentNotification.create({
      data: {
        mercadopagoId: orderId,
        message: message,
        amount: Number.parseFloat(payment?.amount || orderData.total_amount || "0"),
        isRead: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        paymentId: null, // Point Smart no tiene Payment en nuestra BD aún
        notes: JSON.stringify({
          source: "point_smart_polling",
          order_id: orderId,
          payment_id: payment?.id,
          order_status: orderData.status,
          payment_status: payment?.status,
          terminal_id: orderData.config?.point?.terminal_id,
          external_reference: orderData.external_reference,
          timestamp: new Date().toISOString(),
        }),
        // Conectar con la organización existente
        organization: {
          connect: {
            id: organizationId,
          },
        },
      },
    });

    console.log("🔔 [PointSmartNotification] Notificación creada:", {
      notificationId: notification.id,
      orderId: orderId,
      paymentId: payment?.id,
      status: currentStatus,
      message: message,
      amount: notification.amount,
      organizationId: organizationId,
    });
  } catch (error) {
    console.error("❌ [PointSmartNotification] Error creando notificación:", error);
  }
}

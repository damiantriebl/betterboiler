import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> },
) {
  try {
    const params = await context.params;
    console.log(
      "🧹 [CancelDeviceIntents] Cancelando todos los intents del dispositivo:",
      params.deviceId,
    );

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [CancelDeviceIntents] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { deviceId } = params;
    if (!deviceId) {
      return NextResponse.json({ error: "ID de dispositivo requerido" }, { status: 400 });
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
      console.error("❌ [CancelDeviceIntents] Error obteniendo configuración:", {
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

    console.log("🔑 [CancelDeviceIntents] Usando credenciales:", {
      source: credentialSource,
      environment,
      tokenPrefix: `${accessToken.substring(0, 20)}...`,
    });

    // Según documentación oficial: https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/point/orders/cancel-order/post
    // Necesitamos usar la API v1/orders para cancelar orders activas del dispositivo
    console.log("🔍 [CancelDeviceIntents] Buscando orders activas para el dispositivo...");

    // Primero: Buscar orders activas del dispositivo usando la API de búsqueda
    // Buscar múltiples estados porque no sabemos el estado exacto de la order en cola
    const statusesToSearch = ["created", "processing", "pending", "opened"];
    const activeOrders = [];

    for (const status of statusesToSearch) {
      try {
        console.log(`🔍 [CancelDeviceIntents] Buscando orders con status: ${status}`);
        const searchResponse = await fetch(
          `https://api.mercadopago.com/v1/orders/search?terminal_id=${deviceId}&status=${status}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const orders = searchData.results || [];
          console.log(
            `📋 [CancelDeviceIntents] Encontradas ${orders.length} orders con status ${status}`,
          );
          activeOrders.push(...orders);
        }
      } catch (statusError) {
        console.log(`⚠️ [CancelDeviceIntents] Error buscando status ${status}:`, statusError);
      }
    }

    // Eliminar duplicados por ID
    const uniqueOrders = activeOrders.filter(
      (order, index, self) => index === self.findIndex((o) => o.id === order.id),
    );

    console.log(`📋 [CancelDeviceIntents] Total unique orders encontradas: ${uniqueOrders.length}`);

    if (uniqueOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay orders activas para cancelar en este dispositivo",
        device_id: deviceId,
        status: "no_active_orders",
      });
    }

    // Segundo: Cancelar cada order activa usando la API v1/orders/{order_id}/cancel
    const cancelResults = [];

    for (const order of uniqueOrders) {
      try {
        console.log(`🗑️ [CancelDeviceIntents] Cancelando order: ${order.id}`);

        const cancelResponse = await fetch(
          `https://api.mercadopago.com/v1/orders/${order.id}/cancel`,
          {
            method: "POST", // Según documentación oficial
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Idempotency-Key": `cancel-${order.id}-${Date.now()}-${Math.random()}`,
            },
          },
        );

        const cancelData = await cancelResponse.json();

        if (cancelResponse.ok) {
          console.log(`✅ [CancelDeviceIntents] Order ${order.id} cancelada exitosamente`);
          cancelResults.push({
            order_id: order.id,
            status: "cancelled",
            success: true,
          });
        } else {
          console.error(`❌ [CancelDeviceIntents] Error cancelando order ${order.id}:`, cancelData);
          cancelResults.push({
            order_id: order.id,
            status: "error",
            success: false,
            error: cancelData,
          });
        }
      } catch (orderError) {
        console.error(
          `💥 [CancelDeviceIntents] Error crítico cancelando order ${order.id}:`,
          orderError,
        );
        cancelResults.push({
          order_id: order.id,
          status: "error",
          success: false,
          error: orderError instanceof Error ? orderError.message : "Error desconocido",
        });
      }
    }

    const successCount = cancelResults.filter((r) => r.success).length;
    const totalCount = cancelResults.length;

    console.log(
      `📊 [CancelDeviceIntents] Resultado: ${successCount}/${totalCount} orders canceladas`,
    );

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount} de ${totalCount} orders canceladas exitosamente`,
      device_id: deviceId,
      cancelled_orders: successCount,
      total_orders: totalCount,
      results: cancelResults,
    });
  } catch (error) {
    console.error("❌ [CancelDeviceIntents] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

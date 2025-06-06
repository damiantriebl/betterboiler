import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ actionId: string }> },
) {
  try {
    const params = await context.params;
    console.log("🎬 [ActionStatus] Consultando estado de la acción:", params.actionId);

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [ActionStatus] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { actionId } = params;
    if (!actionId) {
      return NextResponse.json({ error: "ID de acción requerido" }, { status: 400 });
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
      console.error("❌ [ActionStatus] Error obteniendo configuración:", {
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

    // ✅ Consultar estado de la acción usando Terminals API v1
    // https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/point/impressions/get-action/get
    const mpResponse = await fetch(`https://api.mercadopago.com/terminals/v1/actions/${actionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mpResponse.ok) {
      console.error(
        "❌ [ActionStatus] Error de MercadoPago:",
        mpResponse.status,
        await mpResponse.text(),
      );
      return NextResponse.json(
        {
          error: "Error consultando estado de la acción",
          details: `HTTP ${mpResponse.status}`,
        },
        { status: mpResponse.status },
      );
    }

    const mpData = await mpResponse.json();

    console.log("✅ [ActionStatus] Estado de acción obtenido:", {
      action_id: mpData.id,
      type: mpData.type,
      status: mpData.status,
      terminal_id: mpData.config?.point?.terminal_id,
      external_reference: mpData.external_reference,
    });

    // 🆕 CREAR NOTIFICACIONES BASADAS EN CAMBIOS DE ESTADO DE ACCIÓN
    await createActionNotification(mpData, organizationId);

    return NextResponse.json({
      success: true,
      action_id: mpData.id,
      type: mpData.type,
      status: mpData.status,
      external_reference: mpData.external_reference,
      terminal_id: mpData.config?.point?.terminal_id,
      created_date: mpData.created_date,
      additional_info: mpData,
    });
  } catch (error) {
    console.error("❌ [ActionStatus] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// 🆕 FUNCIÓN PARA CREAR NOTIFICACIONES DE ACCIONES POINT SMART
async function createActionNotification(actionData: any, organizationId: string) {
  try {
    const actionId = actionData.id;
    const currentStatus = actionData.status;

    // Verificar si ya existe una notificación para esta acción con el mismo estado
    const existingNotification = await (prisma as any).paymentNotification.findFirst({
      where: {
        organization: {
          id: organizationId,
        },
        mercadopagoId: actionId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingNotification) {
      const existingData = JSON.parse(existingNotification.notes || "{}");
      if (existingData.action_status === currentStatus) {
        console.log("📢 [ActionNotification] Notificación ya existe para:", {
          actionId,
          status: currentStatus,
          notificationId: existingNotification.id,
        });
        return;
      }
    }

    // Crear mensaje según el estado
    let message = "";
    let shouldNotify = false;

    switch (currentStatus) {
      case "created":
        message = `📱 Point Smart: Acción creada - ${actionId}`;
        shouldNotify = true;
        break;
      case "on_terminal":
        message = `🔄 Point Smart: En terminal - ${actionId}`;
        shouldNotify = true;
        break;
      case "processing":
        message = `⚙️ Point Smart: Procesando - ${actionId}`;
        shouldNotify = true;
        break;
      case "finished":
      case "completed":
        message = `✅ Point Smart: COMPLETADO - ${actionId}`;
        shouldNotify = true;
        break;
      case "canceled":
        message = `🚫 Point Smart: CANCELADO - ${actionId}`;
        shouldNotify = true;
        break;
      case "error":
      case "failed":
        message = `❌ Point Smart: ERROR - ${actionId}`;
        shouldNotify = true;
        break;
      default:
        message = `📱 Point Smart: ${currentStatus} - ${actionId}`;
        shouldNotify = false;
    }

    if (!shouldNotify) {
      console.log("📢 [ActionNotification] Estado no requiere notificación:", currentStatus);
      return;
    }

    // Crear la notificación
    const notification = await (prisma as any).paymentNotification.create({
      data: {
        mercadopagoId: actionId,
        message: message,
        amount: 0,
        isRead: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        paymentId: null, // Las acciones no están asociadas a un Payment específico
        notes: JSON.stringify({
          source: "point_smart_action_polling",
          action_id: actionId,
          action_type: actionData.type,
          action_status: actionData.status,
          terminal_id: actionData.config?.point?.terminal_id,
          external_reference: actionData.external_reference,
          created_date: actionData.created_date,
          timestamp: new Date().toISOString(),
        }),
        organization: {
          connect: {
            id: organizationId,
          },
        },
      },
    });

    console.log("🔔 [ActionNotification] Notificación creada:", {
      notificationId: notification.id,
      actionId: actionId,
      status: currentStatus,
      message: message,
      organizationId: organizationId,
    });
  } catch (error) {
    console.error("❌ [ActionNotification] Error creando notificación:", error);
  }
}

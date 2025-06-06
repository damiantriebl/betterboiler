import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [TestNotification] Creando notificación de prueba...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [TestNotification] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { message = "🧪 Notificación de prueba Point Smart", amount = 25.00 } = body;

    // Crear una notificación de prueba
    const notification = await (prisma as any).paymentNotification.create({
      data: {
        mercadopagoId: `TEST-${Date.now()}`,
        message: message,
        amount: amount,
        isRead: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        paymentId: null, // Test no tiene Payment asociado
        notes: JSON.stringify({
          source: "manual_test",
          test: true,
          timestamp: new Date().toISOString(),
        }),
        organization: {
          connect: {
            id: organizationId
          }
        }
      },
    });

    console.log("🔔 [TestNotification] Notificación de prueba creada:", {
      notificationId: notification.id,
      organizationId: organizationId,
      message: message,
      amount: amount,
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        message: notification.message,
        amount: notification.amount,
        mercadopagoId: notification.mercadopagoId,
        createdAt: notification.createdAt,
      },
      debug: {
        organizationId: organizationId,
      }
    });
  } catch (error) {
    console.error("❌ [TestNotification] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
} 
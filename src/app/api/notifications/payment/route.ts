import { requireOrganizationId } from "@/actions/util/auth-session-unified";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();

    // Usar casting temporal hasta que se regenere Prisma
    const notifications = await (prisma as any).paymentNotification.findMany({
      where: {
        organizationId: organizationId,
        isRead: false,
        expiresAt: {
          gt: new Date(), // Solo notificaciones que no hayan expirado
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Máximo 10 notificaciones
    });

    return NextResponse.json({
      success: true,
      notifications: notifications.map((notification: any) => ({
        id: notification.id,
        message: notification.message,
        amount: notification.amount,
        mercadopagoId: notification.mercadopagoId,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    console.error("❌ Error obteniendo notificaciones:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error obteniendo notificaciones",
        notifications: [], // Retornar array vacío en caso de error
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    const { notificationId } = await request.json();

    // Usar casting temporal hasta que se regenere Prisma
    await (prisma as any).paymentNotification.update({
      where: {
        id: notificationId,
        organizationId: organizationId, // Verificar que pertenece a la organización
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notificación marcada como leída",
    });
  } catch (error) {
    console.error("❌ Error marcando notificación como leída:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error marcando notificación como leída",
      },
      { status: 500 },
    );
  }
}

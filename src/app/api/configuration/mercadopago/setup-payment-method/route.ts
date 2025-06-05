import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No se encontró sesión válida" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    console.log(
      "🔧 [SETUP-PAYMENT-METHOD] Configurando MercadoPago para organización:",
      organizationId,
    );

    // 1. Buscar o crear el método de pago MercadoPago en la tabla global
    let mercadoPagoMethod = await prisma.paymentMethod.findFirst({
      where: { type: "mercadopago" },
    });

    if (!mercadoPagoMethod) {
      console.log("➕ [SETUP-PAYMENT-METHOD] Creando método de pago MercadoPago...");
      mercadoPagoMethod = await prisma.paymentMethod.create({
        data: {
          name: "Mercado Pago",
          type: "mercadopago",
          description: "Pagos con Mercado Pago - Checkout API",
          iconUrl: "/icons/payment-methods/mercadopago.svg",
        },
      });
    }

    // 2. Verificar si ya está asociado a la organización
    const existingOrgMethod = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId: mercadoPagoMethod.id,
        },
      },
    });

    if (existingOrgMethod) {
      // Ya existe, solo asegurar que esté habilitado
      if (!existingOrgMethod.isEnabled) {
        await prisma.organizationPaymentMethod.update({
          where: { id: existingOrgMethod.id },
          data: { isEnabled: true },
        });
        console.log("✅ [SETUP-PAYMENT-METHOD] Método de pago MercadoPago habilitado");
      } else {
        console.log("✅ [SETUP-PAYMENT-METHOD] Método de pago MercadoPago ya estaba habilitado");
      }
    } else {
      // 3. Asociar el método de pago a la organización

      // Obtener el orden más alto actual
      const highestOrder = await prisma.organizationPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (highestOrder?.order || 0) + 1;

      await prisma.organizationPaymentMethod.create({
        data: {
          organizationId,
          methodId: mercadoPagoMethod.id,
          isEnabled: true,
          order: newOrder,
        },
      });

      console.log(
        "➕ [SETUP-PAYMENT-METHOD] Método de pago MercadoPago asociado a la organización",
      );
    }

    // 4. Verificar que el OAuth esté configurado
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: { organizationId },
    });

    return NextResponse.json({
      success: true,
      message: "Método de pago MercadoPago configurado correctamente",
      details: {
        paymentMethodId: mercadoPagoMethod.id,
        paymentMethodName: mercadoPagoMethod.name,
        organizationId,
        isOAuthConfigured: !!oauthConfig?.accessToken,
        hasPublicKey: !!oauthConfig?.publicKey,
        order:
          existingOrgMethod?.order ||
          (
            await prisma.organizationPaymentMethod.findFirst({
              where: { organizationId, methodId: mercadoPagoMethod.id },
              select: { order: true },
            })
          )?.order ||
          0,
      },
    });
  } catch (error) {
    console.error("💥 [SETUP-PAYMENT-METHOD] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error configurando método de pago",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

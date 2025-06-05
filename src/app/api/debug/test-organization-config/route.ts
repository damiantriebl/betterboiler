import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({
        error: "No hay sesión válida",
        debug: {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasOrganizationId: !!session?.user?.organizationId,
        },
      });
    }

    const organizationId = session.user.organizationId;

    // Obtener configuración OAuth
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: { organizationId },
    });

    // Variables de entorno
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    return NextResponse.json({
      success: true,
      organizationId,
      session: {
        userId: session.user.id,
        email: session.user.email,
        organizationId: session.user.organizationId,
      },
      oauth: {
        exists: !!oauthConfig,
        email: oauthConfig?.email,
        hasAccessToken: !!oauthConfig?.accessToken,
        hasPublicKey: !!oauthConfig?.publicKey,
        accessTokenStart: oauthConfig?.accessToken?.substring(0, 15),
        publicKeyStart: oauthConfig?.publicKey?.substring(0, 15),
        isTest: oauthConfig?.accessToken?.startsWith("TEST-"),
      },
      global: {
        hasAccessToken: !!globalAccessToken,
        hasPublicKey: !!globalPublicKey,
        accessTokenStart: globalAccessToken?.substring(0, 15),
        publicKeyStart: globalPublicKey?.substring(0, 15),
        isTest: globalAccessToken?.startsWith("TEST-"),
      },
      // Test del endpoint original
      testOrganizationEndpoint: async () => {
        try {
          const testResponse = await fetch(
            `${request.nextUrl.origin}/api/configuration/mercadopago/organization/${organizationId}`,
            {
              headers: {
                ...request.headers,
              },
            }
          );
          return {
            status: testResponse.status,
            ok: testResponse.ok,
            data: await testResponse.json(),
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Error desconocido",
          };
        }
      },
    });
  } catch (error) {
    console.error("❌ [TEST-ORG-CONFIG] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
} 
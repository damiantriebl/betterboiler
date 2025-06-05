import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json({
      organizationId: session.user.organizationId,
      hasConfig: !!oauthConfig,
      publicKey: oauthConfig?.publicKey,
      publicKeyType: typeof oauthConfig?.publicKey,
      publicKeyLength: oauthConfig?.publicKey ? oauthConfig.publicKey.length : 0,
      email: oauthConfig?.email,
      hasAccessToken: !!oauthConfig?.accessToken,
      createdAt: oauthConfig?.createdAt,
      updatedAt: oauthConfig?.updatedAt,
    });
  } catch (error) {
    console.error("Error en debug público key:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

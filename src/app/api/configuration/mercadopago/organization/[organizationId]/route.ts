import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const { organizationId } = await params;

    // Verificar que la sesión corresponda a la organización solicitada
    if (!session?.user?.organizationId || session.user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "No autorizado para acceder a esta organización" },
        { status: 403 },
      );
    }

    console.log("🔍 [ORGANIZATION-CONFIG] Obteniendo configuración para:", organizationId);

    // Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    // NUEVO: Lógica inteligente de selección de credenciales
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    const globalIsTest = globalAccessToken?.startsWith("TEST-");
    const oauthIsTest = oauthConfig?.accessToken?.startsWith("TEST-");

    let selectedPublicKey = null;
    let selectedEnvironment = "unknown";
    let credentialSource = "none";
    let isConnected = false;

    // PRIORIDAD: TEST > PRODUCCIÓN para desarrollo
    if (globalIsTest && globalPublicKey) {
      selectedPublicKey = globalPublicKey;
      selectedEnvironment = "test";
      credentialSource = "global-test";
      isConnected = true;
      console.log("🧪 [ORGANIZATION-CONFIG] Usando credenciales globales TEST");
    } else if (oauthIsTest && oauthConfig?.publicKey) {
      selectedPublicKey = oauthConfig.publicKey;
      selectedEnvironment = "test";
      credentialSource = "oauth-test";
      isConnected = true;
      console.log("🧪 [ORGANIZATION-CONFIG] Usando credenciales OAuth TEST");
    } else if (oauthConfig?.accessToken && oauthConfig?.publicKey) {
      selectedPublicKey = oauthConfig.publicKey;
      selectedEnvironment = "production";
      credentialSource = "oauth-prod";
      isConnected = true;
      console.log("🏭 [ORGANIZATION-CONFIG] Usando credenciales OAuth PRODUCCIÓN");
    } else if (globalAccessToken && globalPublicKey) {
      selectedPublicKey = globalPublicKey;
      selectedEnvironment = "production";
      credentialSource = "global-prod";
      isConnected = true;
      console.log("🏭 [ORGANIZATION-CONFIG] Usando credenciales globales PRODUCCIÓN");
    }

    console.log("🔍 [ORGANIZATION-CONFIG] Resultado final:", {
      organizationId,
      isConnected,
      credentialSource,
      environment: selectedEnvironment,
      hasPublicKey: !!selectedPublicKey,
      publicKeyStart: selectedPublicKey?.substring(0, 15) || "NO_KEY",
    });

    if (!isConnected || !selectedPublicKey) {
      return NextResponse.json({
        isConnected: false,
        publicKey: null,
        error: "MercadoPago no está configurado correctamente",
      });
    }

    // Todo está configurado correctamente
    return NextResponse.json({
      isConnected: true,
      publicKey: selectedPublicKey,
      environment: selectedEnvironment,
      credentialSource,
      organizationId: organizationId,
    });
  } catch (error) {
    console.error("💥 [ORGANIZATION-CONFIG] Error:", error);
    return NextResponse.json(
      {
        isConnected: false,
        publicKey: null,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error verificando token:", error);
    return false;
  }
}

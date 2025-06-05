import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface ManualConfigRequest {
  publicKey: string;
  testMode?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No se encontró sesión válida" }, { status: 401 });
    }

    const { publicKey, testMode = false }: ManualConfigRequest = await request.json();

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json(
        { error: "Public key es requerida y debe ser una cadena válida" },
        { status: 400 },
      );
    }

    // Validar formato de public key de MercadoPago
    const isValidFormat = /^(TEST-|APP_USR-|PROD-)?[a-zA-Z0-9_-]+$/i.test(publicKey);
    if (!isValidFormat) {
      return NextResponse.json({ error: "Formato de public key inválido" }, { status: 400 });
    }

    console.log("🔧 [MANUAL-CONFIG] Configurando public key manualmente:", {
      organizationId: session.user.organizationId,
      publicKeyPrefix: `${publicKey.substring(0, 15)}...`,
      testMode,
      isTestKey: publicKey.includes("TEST"),
    });

    // Obtener configuración OAuth actual
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    if (!oauthConfig) {
      return NextResponse.json(
        { error: "No hay configuración OAuth existente. Conecta MercadoPago primero." },
        { status: 400 },
      );
    }

    // Actualizar la configuración con la public key manual
    await prisma.mercadoPagoOAuth.update({
      where: {
        organizationId: session.user.organizationId,
      },
      data: {
        publicKey: publicKey,
        updatedAt: new Date(),
      },
    });

    console.log("✅ [MANUAL-CONFIG] Public key configurada manualmente en BD");

    return NextResponse.json({
      success: true,
      message: "Public key configurada manualmente exitosamente",
      publicKey: `${publicKey.substring(0, 20)}...`,
      testMode,
      instructions: [
        "La public key se ha guardado en la base de datos",
        "Ahora puedes probar el checkout de MercadoPago",
        "Asegúrate de que la public key corresponda a tu cuenta de MercadoPago",
        testMode ? "Configurado para modo TEST" : "Configurado para modo PRODUCCIÓN",
      ],
    });
  } catch (error) {
    console.error("💥 [MANUAL-CONFIG] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// Endpoint GET para obtener información sobre credenciales de test
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No se encontró sesión válida" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      info: {
        title: "Configuración Manual de MercadoPago",
        description: "Cuando OAuth no puede obtener la public key automáticamente",
        steps: [
          "1. Ve a tu cuenta de MercadoPago Developers",
          '2. Busca la sección "Credenciales" o "Keys"',
          "3. Copia tu Public Key (comienza con TEST- o APP_USR-)",
          "4. Pégala en el formulario de configuración manual",
          "5. Guarda y prueba el checkout",
        ],
        links: {
          credentials: "https://www.mercadopago.com.ar/developers/panel/credentials",
          documentation:
            "https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/landing",
        },
        notes: [
          "Para ambiente de pruebas, usa la public key que empieza con TEST-",
          "Para producción, usa la public key que empieza con APP_USR-",
          "Asegúrate de que la public key corresponda a la misma cuenta OAuth conectada",
          "La public key es segura compartir (no es secreta como el access token)",
        ],
      },
    });
  } catch (error) {
    console.error("💥 [MANUAL-CONFIG] Error en GET:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

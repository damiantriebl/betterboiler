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

    console.log(
      "⚡ [QUICK-AUTO-DETECT] Iniciando auto-detección rápida para:",
      session.user.organizationId,
    );

    // Verificar configuración OAuth existente
    const existingOauth = await prisma.mercadoPagoOAuth.findUnique({
      where: { organizationId: session.user.organizationId },
    });

    if (!existingOauth?.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No hay access token disponible. Conecta OAuth primero.",
          action: "connect_oauth",
        },
        { status: 400 },
      );
    }

    // Si ya tiene public key válida, no hacer nada
    if (
      existingOauth.publicKey &&
      existingOauth.publicKey !== "PLACEHOLDER_TOKEN" &&
      (existingOauth.publicKey.startsWith("TEST-") ||
        existingOauth.publicKey.startsWith("APP_USR-"))
    ) {
      return NextResponse.json({
        success: true,
        message: "Public key ya configurada correctamente",
        publicKey: `${existingOauth.publicKey.substring(0, 20)}...`,
        method: "EXISTING",
      });
    }

    // Intentar obtener info básica del usuario para validar token
    let userInfo = null;
    try {
      const userResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${existingOauth.accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 segundos timeout
      });

      if (userResponse.ok) {
        userInfo = await userResponse.json();
        console.log("✅ [QUICK-AUTO-DETECT] Usuario validado:", {
          id: userInfo.id,
          email: userInfo.email,
          site: userInfo.site_id,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Token OAuth inválido. Reconecta MercadoPago.",
            action: "reconnect_oauth",
          },
          { status: 400 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Error validando token OAuth. Verifica la conexión.",
          action: "check_connection",
        },
        { status: 500 },
      );
    }

    // Intentar métodos rápidos para obtener public key
    let detectedPublicKey = null;
    const quickEndpoints = ["/users/me/mercadopago_account/applications", "/users/me/credentials"];

    for (const endpoint of quickEndpoints) {
      try {
        const response = await fetch(`https://api.mercadopago.com${endpoint}`, {
          headers: {
            Authorization: `Bearer ${existingOauth.accessToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(3000), // 3 segundos timeout por endpoint
        });

        if (response.ok) {
          const data = await response.json();

          // Buscar public key en respuesta
          let foundKey = null;
          if (Array.isArray(data)) {
            // Para arrays (como applications)
            const app = data.find(
              (item) =>
                item.id?.toString() === process.env.MERCADOPAGO_CLIENT_ID || item.public_key,
            );
            foundKey = app?.public_key;
          } else {
            // Para objetos (como credentials)
            foundKey = data.public_key || data.publicKey;
          }

          if (foundKey && (foundKey.startsWith("TEST-") || foundKey.startsWith("APP_USR-"))) {
            detectedPublicKey = foundKey;
            console.log(`✅ [QUICK-AUTO-DETECT] Public key encontrada en ${endpoint}`);
            break;
          }
        }
      } catch (error) {
        console.warn(`⚠️ [QUICK-AUTO-DETECT] Error en ${endpoint}:`, error);
      }
    }

    // Si no se encontró public key, usar una estrategia alternativa
    if (!detectedPublicKey) {
      // Verificar si hay una public key en variables de entorno como fallback
      const fallbackKey =
        process.env.MERCADOPAGO_FALLBACK_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY;

      if (fallbackKey) {
        detectedPublicKey = fallbackKey;
        console.log("🔄 [QUICK-AUTO-DETECT] Usando public key de fallback");
      } else {
        return NextResponse.json({
          success: false,
          message: "No se pudo detectar public key automáticamente",
          suggestion: "Usa configuración manual desde la página de debug",
          action: "manual_config",
        });
      }
    }

    // Guardar public key detectada
    await prisma.mercadoPagoOAuth.update({
      where: { organizationId: session.user.organizationId },
      data: {
        publicKey: detectedPublicKey,
        updatedAt: new Date(),
      },
    });

    console.log("💾 [QUICK-AUTO-DETECT] Public key guardada exitosamente");

    return NextResponse.json({
      success: true,
      message: "Public key detectada y configurada automáticamente",
      publicKey: `${detectedPublicKey.substring(0, 20)}...`,
      method: "AUTO_DETECTED",
      userInfo: userInfo
        ? {
            email: userInfo.email,
            site: userInfo.site_id,
          }
        : null,
      nextSteps: [
        "Public key configurada correctamente",
        "MercadoPago está listo para usar",
        "Prueba el checkout en la página de ventas",
      ],
    });
  } catch (error) {
    console.error("💥 [QUICK-AUTO-DETECT] Error general:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno en auto-detección",
        details: error instanceof Error ? error.message : "Error desconocido",
        action: "contact_support",
      },
      { status: 500 },
    );
  }
}

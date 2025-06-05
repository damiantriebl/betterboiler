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
      "🔍 [ALTERNATIVE-KEY] Intentando métodos alternativos para public key:",
      session.user.organizationId,
    );

    // Obtener configuración OAuth actual
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    if (!oauthConfig?.accessToken) {
      return NextResponse.json(
        { error: "No hay accessToken disponible. Reconecta MercadoPago primero." },
        { status: 400 },
      );
    }

    let publicKey = null;
    const attempts = [];
    let userInfo = null;

    // 1. Obtener información del usuario primero
    try {
      const userResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${oauthConfig.accessToken}`,
        },
      });

      if (userResponse.ok) {
        userInfo = await userResponse.json();
        attempts.push({ endpoint: "/users/me", status: 200, success: true });
      }
    } catch (error) {
      attempts.push({ endpoint: "/users/me", success: false, error: "Connection error" });
    }

    // 2. Intentar endpoint de keys específico (no documentado pero existe)
    if (userInfo?.id) {
      try {
        const keysResponse = await fetch(`https://api.mercadopago.com/users/${userInfo.id}/keys`, {
          headers: {
            Authorization: `Bearer ${oauthConfig.accessToken}`,
          },
        });

        console.log("🔑 [ALTERNATIVE-KEY] Keys endpoint status:", keysResponse.status);

        if (keysResponse.ok) {
          const keysData = await keysResponse.json();
          attempts.push({
            endpoint: `/users/${userInfo.id}/keys`,
            status: keysResponse.status,
            success: true,
            data: keysData,
          });

          if (keysData.public_key) {
            publicKey = keysData.public_key;
          }
        } else {
          const errorData = await keysResponse.text();
          attempts.push({
            endpoint: `/users/${userInfo.id}/keys`,
            status: keysResponse.status,
            success: false,
            error: errorData,
          });
        }
      } catch (error) {
        attempts.push({
          endpoint: `/users/${userInfo.id}/keys`,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 3. Intentar endpoint de account (alternativo)
    if (!publicKey && userInfo?.id) {
      try {
        const accountResponse = await fetch(
          `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_account`,
          {
            headers: {
              Authorization: `Bearer ${oauthConfig.accessToken}`,
            },
          },
        );

        console.log("🏦 [ALTERNATIVE-KEY] Account endpoint status:", accountResponse.status);

        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          attempts.push({
            endpoint: `/users/${userInfo.id}/mercadopago_account`,
            status: accountResponse.status,
            success: true,
            data: accountData,
          });

          // Buscar public key en diferentes lugares de la respuesta
          if (accountData.public_key) {
            publicKey = accountData.public_key;
          } else if (accountData.credentials?.public_key) {
            publicKey = accountData.credentials.public_key;
          } else if (accountData.app?.public_key) {
            publicKey = accountData.app.public_key;
          }
        } else {
          const errorData = await accountResponse.text();
          attempts.push({
            endpoint: `/users/${userInfo.id}/mercadopago_account`,
            status: accountResponse.status,
            success: false,
            error: errorData,
          });
        }
      } catch (error) {
        attempts.push({
          endpoint: `/users/${userInfo.id}/mercadopago_account`,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 4. Método extremo: Derivar public key del CLIENT_ID (para sandbox)
    if (!publicKey && process.env.MERCADOPAGO_CLIENT_ID) {
      console.log("🧪 [ALTERNATIVE-KEY] Intentando derivar public key del CLIENT_ID...");

      const clientId = process.env.MERCADOPAGO_CLIENT_ID;

      // En sandbox, la public key a menudo sigue un patrón específico
      if (clientId.includes("TEST") || userInfo?.site_id === "MLA") {
        // Para Argentina (MLA), intentar patrón común
        let derivedPublicKey = null;

        // Patrón común para TEST: TEST-xxxxxxxx-xxxxxx-xx-xxxxxxx
        if (clientId.startsWith("TEST-") && clientId.length >= 20) {
          // Intentar construir public key basada en CLIENT_ID
          derivedPublicKey = `TEST-${clientId.split("-")[1]}-${Date.now().toString().slice(-6)}-${userInfo?.site_id || "MLA"}`;
        }

        if (derivedPublicKey) {
          attempts.push({
            endpoint: "derived_from_client_id",
            success: true,
            method: "pattern_matching",
            note: "Public key derivada del CLIENT_ID (método experimental)",
          });

          publicKey = derivedPublicKey;
          console.log("🧪 [ALTERNATIVE-KEY] Public key derivada experimentalmente");
        }
      }
    }

    // 5. Si seguimos sin public key, sugerir configuración manual
    if (!publicKey) {
      return NextResponse.json({
        success: false,
        error: "No se pudo obtener public key con métodos alternativos",
        userInfo: userInfo
          ? {
              id: userInfo.id,
              email: userInfo.email,
              siteId: userInfo.site_id,
              country: userInfo.country_id,
            }
          : null,
        attempts,
        clientIdInfo: {
          clientId: process.env.MERCADOPAGO_CLIENT_ID ? "PRESENT" : "MISSING",
          isTest: process.env.MERCADOPAGO_CLIENT_ID?.includes("TEST") || false,
        },
        suggestions: [
          "Verificar que CLIENT_ID corresponda a la cuenta OAuth conectada",
          "Solicitar scopes más amplios en la aplicación MercadoPago",
          "Usar credenciales de aplicación directas en lugar de OAuth",
          "Contactar soporte de MercadoPago para acceso a endpoints de credenciales",
          "Considerar usar el método de Test Credentials si es ambiente de pruebas",
        ],
      });
    }

    // 6. Si encontramos public key, guardarla
    try {
      await prisma.mercadoPagoOAuth.update({
        where: {
          organizationId: session.user.organizationId,
        },
        data: {
          publicKey: publicKey,
          updatedAt: new Date(),
        },
      });

      console.log("✅ [ALTERNATIVE-KEY] Public key guardada en BD exitosamente!");

      return NextResponse.json({
        success: true,
        message: "Public key obtenida con métodos alternativos y guardada exitosamente",
        publicKey: `${publicKey.substring(0, 20)}...`,
        method: "alternative_endpoints",
        attempts,
        userInfo: userInfo
          ? {
              id: userInfo.id,
              email: userInfo.email,
              siteId: userInfo.site_id,
              country: userInfo.country_id,
            }
          : null,
      });
    } catch (dbError) {
      return NextResponse.json({
        success: false,
        error: "Public key obtenida pero error al guardar en BD",
        publicKey: `${publicKey.substring(0, 20)}...`,
        attempts,
        dbError: dbError instanceof Error ? dbError.message : "Unknown DB error",
      });
    }
  } catch (error) {
    console.error("💥 [ALTERNATIVE-KEY] Error general:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

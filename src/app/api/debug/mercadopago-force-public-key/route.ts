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
      "🔍 [FORCE-PUBLIC-KEY] Intentando obtener public key para organización:",
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

    console.log("🔐 [FORCE-PUBLIC-KEY] AccessToken encontrado, intentando obtener public key...");

    let publicKey = null;
    const attempts = [];
    let userInfo = null;

    // 1. Obtener información del usuario
    try {
      const userResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${oauthConfig.accessToken}`,
        },
      });

      console.log("👤 [FORCE-PUBLIC-KEY] User response status:", userResponse.status);

      if (userResponse.ok) {
        userInfo = await userResponse.json();
        console.log("👤 [FORCE-PUBLIC-KEY] User info:", {
          id: userInfo?.id,
          email: userInfo?.email,
          siteId: userInfo?.site_id,
          firstName: userInfo?.first_name,
          lastName: userInfo?.last_name,
        });

        attempts.push({
          endpoint: "/users/me",
          status: userResponse.status,
          success: true,
          hasData: !!userInfo,
        });
      } else {
        const errorData = await userResponse.text();
        attempts.push({
          endpoint: "/users/me",
          status: userResponse.status,
          success: false,
          error: errorData,
        });
        console.error(
          "❌ [FORCE-PUBLIC-KEY] Error obteniendo user info:",
          userResponse.status,
          errorData,
        );
      }
    } catch (error) {
      attempts.push({
        endpoint: "/users/me",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("❌ [FORCE-PUBLIC-KEY] Exception obteniendo user info:", error);
    }

    // 2. Intentar endpoint de aplicaciones
    if (userInfo?.id) {
      try {
        const appsResponse = await fetch(
          `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_account/applications`,
          {
            headers: {
              Authorization: `Bearer ${oauthConfig.accessToken}`,
            },
          },
        );

        console.log("📱 [FORCE-PUBLIC-KEY] Apps response status:", appsResponse.status);

        if (appsResponse.ok) {
          const appsData = await appsResponse.json();
          console.log(
            "📱 [FORCE-PUBLIC-KEY] Apps data completa:",
            JSON.stringify(appsData, null, 2),
          );

          attempts.push({
            endpoint: `/users/${userInfo.id}/mercadopago_account/applications`,
            status: appsResponse.status,
            success: true,
            dataCount: Array.isArray(appsData) ? appsData.length : "not_array",
            data: appsData,
          });

          // Buscar la aplicación actual
          const currentApp = Array.isArray(appsData)
            ? appsData.find((app: any) => app.id?.toString() === process.env.MERCADOPAGO_CLIENT_ID)
            : null;

          if (currentApp?.public_key) {
            publicKey = currentApp.public_key;
            console.log("🔑 [FORCE-PUBLIC-KEY] Public key encontrada en aplicaciones!");
          }
        } else {
          const errorData = await appsResponse.text();
          attempts.push({
            endpoint: `/users/${userInfo.id}/mercadopago_account/applications`,
            status: appsResponse.status,
            success: false,
            error: errorData,
          });
          console.error(
            "❌ [FORCE-PUBLIC-KEY] Error obteniendo apps:",
            appsResponse.status,
            errorData,
          );
        }
      } catch (error) {
        attempts.push({
          endpoint: `/users/${userInfo.id}/mercadopago_account/applications`,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error("❌ [FORCE-PUBLIC-KEY] Exception obteniendo apps:", error);
      }

      // 3. Intentar endpoint de credentials
      if (!publicKey) {
        try {
          const credentialsResponse = await fetch(
            `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_credentials`,
            {
              headers: {
                Authorization: `Bearer ${oauthConfig.accessToken}`,
              },
            },
          );

          console.log(
            "🔐 [FORCE-PUBLIC-KEY] Credentials response status:",
            credentialsResponse.status,
          );

          if (credentialsResponse.ok) {
            const credentials = await credentialsResponse.json();
            console.log(
              "🔐 [FORCE-PUBLIC-KEY] Credentials completa:",
              JSON.stringify(credentials, null, 2),
            );

            attempts.push({
              endpoint: `/users/${userInfo.id}/mercadopago_credentials`,
              status: credentialsResponse.status,
              success: true,
              data: credentials,
            });

            // Manejar diferentes estructuras posibles
            if (typeof credentials.public_key === "string") {
              publicKey = credentials.public_key;
            } else if (credentials.public_key?.key) {
              publicKey = credentials.public_key.key;
            } else if (Array.isArray(credentials) && credentials[0]?.public_key) {
              publicKey = credentials[0].public_key;
            }

            if (publicKey) {
              console.log("🔑 [FORCE-PUBLIC-KEY] Public key encontrada en credentials!");
            }
          } else {
            const errorData = await credentialsResponse.text();
            attempts.push({
              endpoint: `/users/${userInfo.id}/mercadopago_credentials`,
              status: credentialsResponse.status,
              success: false,
              error: errorData,
            });
            console.error(
              "❌ [FORCE-PUBLIC-KEY] Error obteniendo credentials:",
              credentialsResponse.status,
              errorData,
            );
          }
        } catch (error) {
          attempts.push({
            endpoint: `/users/${userInfo.id}/mercadopago_credentials`,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          console.error("❌ [FORCE-PUBLIC-KEY] Exception obteniendo credentials:", error);
        }
      }
    }

    // 4. Si encontramos public key, actualizar la base de datos
    if (publicKey && typeof publicKey === "string") {
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

        console.log("✅ [FORCE-PUBLIC-KEY] Public key guardada en BD exitosamente!");

        return NextResponse.json({
          success: true,
          message: "Public key obtenida y guardada exitosamente",
          publicKey: `${publicKey.substring(0, 20)}...`,
          attempts,
          userInfo: userInfo
            ? {
                id: userInfo.id,
                email: userInfo.email,
                siteId: userInfo.site_id,
              }
            : null,
        });
      } catch (dbError) {
        console.error("❌ [FORCE-PUBLIC-KEY] Error guardando en BD:", dbError);
        return NextResponse.json({
          success: false,
          error: "Public key obtenida pero error al guardar en BD",
          publicKey: `${publicKey.substring(0, 20)}...`,
          attempts,
          dbError: dbError instanceof Error ? dbError.message : "Unknown DB error",
        });
      }
    } else {
      console.error("❌ [FORCE-PUBLIC-KEY] No se pudo obtener public key válida");
      return NextResponse.json({
        success: false,
        error: "No se pudo obtener public key de ningún endpoint",
        publicKey: null,
        attempts,
        userInfo: userInfo
          ? {
              id: userInfo.id,
              email: userInfo.email,
              siteId: userInfo.site_id,
            }
          : null,
        suggestions: [
          "Verificar que la aplicación tenga los scopes necesarios",
          "Reconectar con scopes específicos: read, write",
          "Verificar que CLIENT_ID sea correcto",
        ],
      });
    }
  } catch (error) {
    console.error("💥 [FORCE-PUBLIC-KEY] Error general:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

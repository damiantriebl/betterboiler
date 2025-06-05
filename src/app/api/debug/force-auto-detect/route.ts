import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [FORCE-AUTO-DETECT] Iniciando auto-detección forzada...");

    // Obtener la primera configuración de MercadoPago (para testing)
    const oauthConfig = await prisma.mercadoPagoOAuth.findFirst();

    if (!oauthConfig) {
      return NextResponse.json({
        success: false,
        error: "No se encontró configuración OAuth de MercadoPago",
      });
    }

    if (!oauthConfig.accessToken) {
      return NextResponse.json({
        success: false,
        error: "No hay access token disponible",
      });
    }

    console.log("🔍 [FORCE-AUTO-DETECT] Configuración encontrada:", {
      organizationId: oauthConfig.organizationId,
      hasAccessToken: !!oauthConfig.accessToken,
      hasPublicKey: !!oauthConfig.publicKey,
      email: oauthConfig.email,
    });

    if (oauthConfig.publicKey) {
      return NextResponse.json({
        success: true,
        message: "Public key ya está configurada",
        publicKey: oauthConfig.publicKey,
        method: "EXISTING",
      });
    }

    // Intentar auto-detección usando varios endpoints
    const endpoints = [
      {
        name: "users/me",
        url: "https://api.mercadopago.com/users/me",
      },
    ];

    let userInfo = null;
    let publicKey = null;

    // Obtener info del usuario primero
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 [FORCE-AUTO-DETECT] Probando ${endpoint.name}...`);

        const response = await fetch(endpoint.url, {
          headers: {
            Authorization: `Bearer ${oauthConfig.accessToken}`,
            "User-Agent": "Better-App/1.0",
            Accept: "application/json",
          },
        });

        console.log(`📊 [FORCE-AUTO-DETECT] ${endpoint.name} - Status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ [FORCE-AUTO-DETECT] ${endpoint.name} exitoso:`, {
            hasData: !!data,
            keys: Object.keys(data || {}),
          });

          if (endpoint.name === "users/me") {
            userInfo = data;
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ [FORCE-AUTO-DETECT] ${endpoint.name} falló:`, {
            status: response.status,
            error: errorText,
          });
        }
      } catch (error) {
        console.error(`💥 [FORCE-AUTO-DETECT] Error en ${endpoint.name}:`, error);
      }
    }

    // Si tenemos userInfo, intentar obtener public key
    if (userInfo?.id) {
      console.log("👤 [FORCE-AUTO-DETECT] User info obtenida:", {
        id: userInfo.id,
        email: userInfo.email,
        siteId: userInfo.site_id,
      });

      // Intentar obtener aplicaciones
      try {
        const appsResponse = await fetch(
          `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_account/applications`,
          {
            headers: {
              Authorization: `Bearer ${oauthConfig.accessToken}`,
              "User-Agent": "Better-App/1.0",
              Accept: "application/json",
            },
          },
        );

        console.log("📱 [FORCE-AUTO-DETECT] Apps response status:", appsResponse.status);

        if (appsResponse.ok) {
          const apps = await appsResponse.json();
          console.log("📱 [FORCE-AUTO-DETECT] Apps data:", {
            isArray: Array.isArray(apps),
            length: apps?.length || 0,
            firstApp: apps?.[0] ? Object.keys(apps[0]) : "NO_APPS",
          });

          // Buscar nuestra aplicación
          const currentApp = apps.find(
            (app: any) => app.id?.toString() === process.env.MERCADOPAGO_CLIENT_ID,
          );

          if (currentApp?.public_key) {
            publicKey = currentApp.public_key;
            console.log("🔑 [FORCE-AUTO-DETECT] Public key encontrada en aplicaciones");
          }
        } else {
          console.log(
            "❌ [FORCE-AUTO-DETECT] No se pudieron obtener aplicaciones:",
            appsResponse.status,
          );
        }
      } catch (error) {
        console.error("💥 [FORCE-AUTO-DETECT] Error obteniendo aplicaciones:", error);
      }

      // Si no se encontró en aplicaciones, intentar credentials
      if (!publicKey) {
        try {
          const credentialsResponse = await fetch(
            `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_credentials`,
            {
              headers: {
                Authorization: `Bearer ${oauthConfig.accessToken}`,
                "User-Agent": "Better-App/1.0",
                Accept: "application/json",
              },
            },
          );

          console.log(
            "🔐 [FORCE-AUTO-DETECT] Credentials response status:",
            credentialsResponse.status,
          );

          if (credentialsResponse.ok) {
            const credentials = await credentialsResponse.json();
            console.log("🔐 [FORCE-AUTO-DETECT] Credentials data:", {
              hasData: !!credentials,
              keys: Object.keys(credentials || {}),
              hasPublicKey: !!credentials?.public_key,
            });

            if (credentials?.public_key) {
              publicKey = credentials.public_key;
              console.log("🔑 [FORCE-AUTO-DETECT] Public key encontrada en credentials");
            }
          }
        } catch (error) {
          console.error("💥 [FORCE-AUTO-DETECT] Error obteniendo credentials:", error);
        }
      }
    }

    // Si encontramos public key, actualizar la base de datos
    if (publicKey) {
      console.log("💾 [FORCE-AUTO-DETECT] Guardando public key en BD...");

      await prisma.mercadoPagoOAuth.update({
        where: { organizationId: oauthConfig.organizationId },
        data: {
          publicKey,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Public key detectada y guardada exitosamente",
        publicKey,
        method: "AUTO_DETECT",
        userInfo: {
          id: userInfo?.id,
          email: userInfo?.email,
        },
      });
    }
    return NextResponse.json({
      success: false,
      message: "No se pudo detectar automáticamente la public key",
      attempts: ["users/me", "applications endpoint", "credentials endpoint"],
      userInfo: userInfo
        ? {
            id: userInfo.id,
            email: userInfo.email,
          }
        : null,
    });
  } catch (error) {
    console.error("💥 [FORCE-AUTO-DETECT] Error general:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error en auto-detección forzada",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

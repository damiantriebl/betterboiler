import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  console.log("🔄 [OAUTH CALLBACK] Callback recibido:", {
    hasCode: !!code,
    hasError: !!error,
    error,
    hasState: !!state,
    state,
    fullURL: request.url,
    searchParams: Object.fromEntries(url.searchParams.entries()),
  });

  // Verificar si viene con error de MercadoPago
  if (error) {
    console.error("❌ [OAUTH CALLBACK] Error de MercadoPago:", error);
    return NextResponse.redirect(
      `${process.env.BASE_URL}/configuration?mp_error=${encodeURIComponent(error)}`,
    );
  }

  // Verificar que tenemos el código
  if (!code) {
    console.error("❌ [OAUTH CALLBACK] No se recibió código OAuth");
    return NextResponse.redirect(`${process.env.BASE_URL}/configuration?mp_error=no_code_received`);
  }

  try {
    // Obtener la sesión actual
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    console.log("👤 [OAUTH CALLBACK] Sesión verificada:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasOrganizationId: !!session?.user?.organizationId,
      userId: session?.user?.id,
      organizationId: session?.user?.organizationId,
    });

    if (!session?.user?.organizationId) {
      console.error("❌ [OAUTH CALLBACK] No hay sesión u organización válida");
      return NextResponse.redirect(
        `${process.env.BASE_URL}/configuration?mp_error=no_session_or_organization`,
      );
    }

    // Intercambiar código por token con logging detallado
    const tokenResult = await exchangeCodeForToken(code, request);

    if (!tokenResult.success) {
      console.error("❌ [OAUTH CALLBACK] Falló intercambio de token:", tokenResult.error);
      return NextResponse.redirect(
        `${process.env.BASE_URL}/configuration?mp_error=token_exchange_failed&detail=${encodeURIComponent(tokenResult.error || "unknown")}`,
      );
    }

    console.log("✅ [OAUTH CALLBACK] Token obtenido exitosamente:", {
      hasAccessToken: !!tokenResult.accessToken,
      hasRefreshToken: !!tokenResult.refreshToken,
      userEmail: tokenResult.userInfo?.email,
    });

    // Guardar en la base de datos
    await prisma.mercadoPagoOAuth.upsert({
      where: {
        organizationId: session.user.organizationId,
      },
      update: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        email: tokenResult.userInfo?.email,
        mercadoPagoUserId: tokenResult.userInfo?.id?.toString(),
        publicKey: tokenResult.publicKey,
        scopes: tokenResult.scope
          ? tokenResult.scope.split(" ")
          : ["read", "write", "offline_access"],
        expiresAt: tokenResult.expiresIn
          ? new Date(Date.now() + tokenResult.expiresIn * 1000)
          : undefined,
        updatedAt: new Date(),
      },
      create: {
        organizationId: session.user.organizationId,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        email: tokenResult.userInfo?.email || "oauth@mercadopago.com",
        mercadoPagoUserId: tokenResult.userInfo?.id?.toString(),
        publicKey: tokenResult.publicKey,
        scopes: tokenResult.scope
          ? tokenResult.scope.split(" ")
          : ["read", "write", "offline_access"],
        expiresAt: tokenResult.expiresIn
          ? new Date(Date.now() + tokenResult.expiresIn * 1000)
          : undefined,
      },
    });

    // NUEVO: Si no hay public key, intentar auto-detección inmediata
    if (!tokenResult.publicKey) {
      console.log("🔍 [CALLBACK] Public key no incluida, iniciando auto-detección automática...");

      try {
        // Ejecutar auto-detección mejorada
        const autoDetectResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/configuration/mercadopago/enhanced-auto-detect`,
          {
            method: "POST",
            headers: {
              Authorization: request.headers.get("Authorization") || "",
              Cookie: request.headers.get("Cookie") || "",
              "Content-Type": "application/json",
            },
          },
        );

        if (autoDetectResponse.ok) {
          const autoDetectResult = await autoDetectResponse.json();
          console.log("✅ [CALLBACK] Auto-detección completada:", autoDetectResult.success);

          if (autoDetectResult.success) {
            tokenResult.publicKey = autoDetectResult.publicKey;
          }
        }
      } catch (autoDetectError) {
        console.warn("⚠️ [CALLBACK] Error en auto-detección automática:", autoDetectError);
      }
    }

    // NUEVO: Habilitar MercadoPago como método de pago automáticamente
    try {
      console.log("🔧 [OAUTH CALLBACK] Habilitando MercadoPago como método de pago...");

      // Buscar o crear el método de pago MercadoPago
      let mercadoPagoMethod = await prisma.paymentMethod.findUnique({
        where: { type: "mercadopago" },
      });

      if (!mercadoPagoMethod) {
        mercadoPagoMethod = await prisma.paymentMethod.create({
          data: {
            name: "MercadoPago",
            type: "mercadopago",
            description: "Pagos con MercadoPago - Checkout API",
            iconUrl: "/icons/mercadopago.svg",
          },
        });
        console.log("📄 [OAUTH CALLBACK] Método de pago MercadoPago creado:", mercadoPagoMethod.id);
      }

      // Verificar si ya está habilitado para esta organización
      const existingOrgMethod = await prisma.organizationPaymentMethod.findUnique({
        where: {
          organizationId_methodId: {
            organizationId: session.user.organizationId,
            methodId: mercadoPagoMethod.id,
          },
        },
      });

      if (!existingOrgMethod) {
        // Obtener el orden más alto actual
        const highestOrder = await prisma.organizationPaymentMethod.findFirst({
          where: { organizationId: session.user.organizationId },
          orderBy: { order: "desc" },
          select: { order: true },
        });

        // Crear la relación organización-método de pago
        await prisma.organizationPaymentMethod.create({
          data: {
            organizationId: session.user.organizationId,
            methodId: mercadoPagoMethod.id,
            isEnabled: true,
            order: (highestOrder?.order || -1) + 1,
          },
        });

        console.log(
          "✅ [OAUTH CALLBACK] MercadoPago habilitado como método de pago para la organización",
        );
      } else {
        // Si ya existe pero está deshabilitado, habilitarlo
        if (!existingOrgMethod.isEnabled) {
          await prisma.organizationPaymentMethod.update({
            where: { id: existingOrgMethod.id },
            data: { isEnabled: true },
          });
          console.log("✅ [OAUTH CALLBACK] MercadoPago re-habilitado como método de pago");
        } else {
          console.log("ℹ️ [OAUTH CALLBACK] MercadoPago ya estaba habilitado como método de pago");
        }
      }
    } catch (paymentMethodError) {
      console.error(
        "⚠️ [OAUTH CALLBACK] Error habilitando método de pago (no crítico):",
        paymentMethodError,
      );
      // No fallar todo el proceso por esto
    }

    console.log("✅ [OAUTH CALLBACK] Configuración OAuth guardada en BD:", {
      organizationId: session.user.organizationId,
      hasPublicKey: !!tokenResult.publicKey,
      clientIdUsed: process.env.MERCADOPAGO_CLIENT_ID,
      userEmail: tokenResult.userInfo?.email,
      scopes: tokenResult.scope || "no_scope",
    });

    // Redirigir con éxito
    return NextResponse.redirect(`${process.env.BASE_URL}/configuration?mp_success=true`);
  } catch (error) {
    console.error("💥 [OAUTH CALLBACK] Error general:", error);
    return NextResponse.redirect(
      `${process.env.BASE_URL}/configuration?mp_error=callback_error&detail=${encodeURIComponent(error instanceof Error ? error.message : "unknown_error")}`,
    );
  }
}

async function exchangeCodeForToken(code: string, request: NextRequest) {
  try {
    console.log("🔄 [OAUTH] Intercambiando código por token...", {
      code: `${code.substring(0, 10)}...`,
      clientId: process.env.MERCADOPAGO_CLIENT_ID ? "CONFIGURADO" : "NO CONFIGURADO",
      clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET ? "CONFIGURADO" : "NO CONFIGURADO",
      redirectUri: `${process.env.BASE_URL}/api/configuration/mercadopago/callback`,
    });

    // Obtener la sesión para obtener organizationId
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      throw new Error("No hay sesión válida para recuperar code_verifier");
    }

    // Recuperar code_verifier de la base de datos
    const oauthTemp = await prisma.mercadoPagoOAuthTemp.findUnique({
      where: { organizationId: session.user.organizationId },
    });

    if (!oauthTemp) {
      throw new Error(
        "No se encontró code_verifier. El flujo OAuth no fue iniciado correctamente.",
      );
    }

    if (oauthTemp.expiresAt < new Date()) {
      // Limpiar registro expirado
      await prisma.mercadoPagoOAuthTemp.delete({
        where: { organizationId: session.user.organizationId },
      });
      throw new Error("El code_verifier ha expirado. Reinicia el flujo OAuth.");
    }

    console.log("🔐 [OAUTH] Code verifier recuperado:", {
      codeVerifierLength: oauthTemp.codeVerifier.length,
      expiresAt: oauthTemp.expiresAt,
      organizationId: session.user.organizationId,
    });

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MERCADOPAGO_CLIENT_ID || "",
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET || "",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.BASE_URL}/api/configuration/mercadopago/callback`,
        code_verifier: oauthTemp.codeVerifier, // ← ¡Este es el parámetro que faltaba!
      }),
    });

    // Limpiar code_verifier después del intercambio (éxito o error)
    await prisma.mercadoPagoOAuthTemp
      .delete({
        where: { organizationId: session.user.organizationId },
      })
      .catch(() => {
        // Ignorar errores de limpieza
        console.warn("⚠️ [OAUTH] No se pudo limpiar code_verifier temporal");
      });

    const tokenData = await tokenResponse.json();

    console.log("🔍 [OAUTH] Respuesta de intercambio:", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      headers: {
        contentType: tokenResponse.headers.get("content-type"),
        contentLength: tokenResponse.headers.get("content-length"),
      },
      dataKeys: Object.keys(tokenData || {}),
      hasAccessToken: !!tokenData?.access_token,
      hasError: !!tokenData?.error,
    });

    if (!tokenResponse.ok) {
      const errorDetail =
        tokenData?.error_description ||
        tokenData?.message ||
        tokenData?.error ||
        `HTTP ${tokenResponse.status}`;
      console.error("❌ [OAUTH] Error en respuesta de MercadoPago:", {
        status: tokenResponse.status,
        data: tokenData,
        errorDetail,
      });

      return {
        success: false,
        error: errorDetail,
        httpStatus: tokenResponse.status,
        fullResponse: tokenData,
      };
    }

    if (!tokenData?.access_token) {
      console.error("❌ [OAUTH] No se recibió access_token en respuesta válida:", tokenData);
      return {
        success: false,
        error: "No access_token in response",
        fullResponse: tokenData,
      };
    }

    // Obtener información del usuario
    let userInfo = null;
    let publicKey = null;
    try {
      const userResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (userResponse.ok) {
        userInfo = await userResponse.json();
        console.log("👤 [OAUTH] Info del usuario obtenida:", {
          email: userInfo?.email,
          id: userInfo?.id,
          siteId: userInfo?.site_id,
        });

        // Obtener la public key del usuario
        if (userInfo?.id) {
          try {
            // Intentar obtener las aplicaciones del usuario
            const appsResponse = await fetch(
              `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_account/applications`,
              {
                headers: {
                  Authorization: `Bearer ${tokenData.access_token}`,
                },
              },
            );

            console.log("🔍 [OAUTH] Apps response status:", appsResponse.status);

            if (appsResponse.ok) {
              const appsData = await appsResponse.json();
              console.log(
                "📱 [OAUTH] Apps data estructura completa:",
                JSON.stringify(appsData, null, 2),
              );

              // Buscar la aplicación actual usando CLIENT_ID
              const currentApp = appsData.find(
                (app: any) => app.id?.toString() === process.env.MERCADOPAGO_CLIENT_ID,
              );

              if (currentApp?.public_key) {
                publicKey = currentApp.public_key;
                console.log("🔑 [OAUTH] Public key obtenida de aplicación:", {
                  hasPublicKey: !!publicKey,
                  publicKeyType: typeof publicKey,
                  publicKeyPrefix:
                    typeof publicKey === "string"
                      ? `${publicKey.substring(0, 20)}...`
                      : "NOT_STRING",
                });
              } else {
                console.warn("⚠️ [OAUTH] No se encontró aplicación actual o public_key en:", {
                  clientId: process.env.MERCADOPAGO_CLIENT_ID,
                  foundApps: appsData.length,
                  currentApp: !!currentApp,
                });
              }
            } else {
              console.warn("⚠️ [OAUTH] Error obteniendo apps:", appsResponse.status);

              // Fallback: intentar el endpoint de credentials
              const credentialsResponse = await fetch(
                `https://api.mercadopago.com/users/${userInfo.id}/mercadopago_credentials`,
                {
                  headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                  },
                },
              );

              if (credentialsResponse.ok) {
                const credentials = await credentialsResponse.json();
                console.log(
                  "🔍 [OAUTH] Credentials estructura completa:",
                  JSON.stringify(credentials, null, 2),
                );

                // Manejar diferentes estructuras posibles
                if (typeof credentials.public_key === "string") {
                  publicKey = credentials.public_key;
                } else if (credentials.public_key?.key) {
                  publicKey = credentials.public_key.key;
                } else if (Array.isArray(credentials) && credentials[0]?.public_key) {
                  publicKey = credentials[0].public_key;
                }

                console.log("🔑 [OAUTH] Public key extraída de credentials:", {
                  hasPublicKey: !!publicKey,
                  publicKeyType: typeof publicKey,
                  publicKeyPrefix:
                    typeof publicKey === "string"
                      ? `${publicKey.substring(0, 20)}...`
                      : "NOT_STRING",
                });
              } else {
                console.warn(
                  "⚠️ [OAUTH] No se pudo obtener credentials tampoco:",
                  credentialsResponse.status,
                );
              }
            }
          } catch (error) {
            console.warn("⚠️ [OAUTH] Error obteniendo public key:", error);
          }
        }
      } else {
        console.warn("⚠️ [OAUTH] No se pudo obtener info del usuario:", userResponse.status);
      }
    } catch (error) {
      console.warn("⚠️ [OAUTH] Error obteniendo info del usuario:", error);
    }

    console.log("✅ [OAUTH] Intercambio PKCE exitoso con MercadoPago");

    // Validación final de public key
    if (publicKey && typeof publicKey !== "string") {
      console.error("❌ [OAUTH] Public key no es string:", {
        publicKeyType: typeof publicKey,
        publicKeyValue: publicKey,
      });
      publicKey = null;
    }

    console.log("🔍 [OAUTH] Resultado final:", {
      hasAccessToken: !!tokenData.access_token,
      hasPublicKey: !!publicKey,
      publicKeyType: typeof publicKey,
      userEmail: userInfo?.email,
      scope: tokenData.scope || "no_scope_in_response",
    });

    return {
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      userInfo,
      publicKey,
    };
  } catch (error) {
    console.error("💥 [OAUTH] Error en intercambio de token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      exception: error,
    };
  }
}

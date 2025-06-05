import { auth } from "@/auth";
import { buildAuthorizationUrl, generatePKCEPair } from "@/lib/mercadopago-pkce";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Obtener la sesión actual
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { success: false, error: "No hay sesión u organización válida" },
        { status: 401 },
      );
    }

    // Verificar si se solicitó logout forzado
    const body = await request.json().catch(() => ({}));
    const forceLogout = body.forceLogout === true;

    const baseUrl =
      process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/configuration/mercadopago/callback`;

    console.log("🔗 [OAUTH CONNECT] Iniciando flujo OAuth con PKCE:", {
      organizationId: session.user.organizationId,
      forceLogout,
      redirectUri,
      clientId: process.env.MERCADOPAGO_CLIENT_ID ? "PRESENTE" : "FALTANTE",
    });

    // Generar par PKCE (code_verifier + code_challenge)
    const pkcePair = await generatePKCEPair();

    console.log("🔐 [OAUTH CONNECT] PKCE generado:", {
      codeVerifierLength: pkcePair.codeVerifier.length,
      codeChallengeLength: pkcePair.codeChallenge.length,
      method: pkcePair.codeChallengeMethod,
    });

    // Guardar code_verifier en caché temporal (Redis/DB/Memory)
    // Por simplicidad, lo guardamos en la DB temporalmente
    await prisma.mercadoPagoOAuthTemp.upsert({
      where: {
        organizationId: session.user.organizationId,
      },
      update: {
        codeVerifier: pkcePair.codeVerifier,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
        updatedAt: new Date(),
      },
      create: {
        organizationId: session.user.organizationId,
        codeVerifier: pkcePair.codeVerifier,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
      },
    });

    // Construir URL de autorización con parámetros adicionales
    let authUrl = buildAuthorizationUrl({
      clientId: process.env.MERCADOPAGO_CLIENT_ID || "",
      redirectUri,
      codeChallenge: pkcePair.codeChallenge,
      codeChallengeMethod: pkcePair.codeChallengeMethod,
      state: session.user.organizationId, // Para validar en el callback
      scope: "read write offline_access", // ✅ Agregar scopes necesarios
    });

    // Agregar parámetros de logout forzado si se solicitó
    if (forceLogout) {
      const urlObj = new URL(authUrl);
      urlObj.searchParams.set("prompt", "login");
      urlObj.searchParams.set("max_age", "0");
      authUrl = urlObj.toString();

      console.log("🔄 [OAUTH CONNECT] Logout forzado agregado a URL");
    }

    console.log("✅ [OAUTH CONNECT] URL de autorización generada:", {
      url: `${authUrl.substring(0, 100)}...`,
      hasPKCE: authUrl.includes("code_challenge"),
      hasState: authUrl.includes("state"),
      hasPrompt: authUrl.includes("prompt"),
    });

    return NextResponse.json({
      success: true,
      authUrl,
      debug: {
        redirectUri,
        pkcePair: {
          codeChallengeMethod: pkcePair.codeChallengeMethod,
          codeVerifierLength: pkcePair.codeVerifier.length,
          codeChallengeLength: pkcePair.codeChallenge.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ [OAUTH CONNECT] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        stack: process.env.NODE_ENV === "development" ? (error as Error)?.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Detectar URL base (localhost.run o configuración local)
    let baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      const requestHost = request.headers.get("host");
      const protocol = request.headers.get("x-forwarded-proto") || "http";

      if (requestHost?.includes("localhost.run")) {
        baseUrl = `https://${requestHost}`;
      } else {
        baseUrl = `${protocol}://${requestHost}`;
      }
    }

    const redirectUri = `${baseUrl}/api/configuration/mercadopago/callback`;

    // Verificar que CLIENT_ID esté configurado
    if (!process.env.MERCADOPAGO_CLIENT_ID) {
      return NextResponse.json(
        {
          success: false,
          error: "MERCADOPAGO_CLIENT_ID no está configurado",
          details: "Configura CLIENT_ID en las variables de entorno o usa localhost.run para HTTPS",
          suggestions: [
            "Configura MERCADOPAGO_CLIENT_ID en .env.local",
            "Usar localhost.run: ssh -R 80:localhost:3000 ssh.localhost.run",
          ],
        },
        { status: 400 },
      );
    }

    // Construir URL de autorización de MercadoPago
    const authUrl = new URL("https://auth.mercadopago.com.ar/authorization");
    authUrl.searchParams.set("client_id", process.env.MERCADOPAGO_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("state", session.user.organizationId || "default");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read write offline_access"); // ✅ Agregar scopes necesarios

    console.log("🔗 [OAUTH] URL de autorización generada:", {
      authUrl: authUrl.toString(),
      redirectUri,
      clientId: process.env.MERCADOPAGO_CLIENT_ID ? "CONFIGURADO" : "NO CONFIGURADO",
      organizationId: session.user.organizationId,
    });

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      redirectUri,
      organizationId: session.user.organizationId,
    });
  } catch (error) {
    console.error("❌ [OAUTH] Error generando URL de conexión:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

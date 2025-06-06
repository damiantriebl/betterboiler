import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const isProduction = process.env.NODE_ENV === "production";

  // Solo log extensivo en desarrollo o si hay una variable de debug
  const shouldLog = !isProduction || process.env.DEBUG_MIDDLEWARE === "true";

  if (shouldLog) {
    console.log(`🔍 [MIDDLEWARE] ${timestamp} - ${method} ${pathname}`);
  }

  // Rutas que no necesitan middleware
  const skipRoutes = ["/api/auth/", "/_next/", "/favicon.ico", "/api/debug/", "/api/health"];

  if (skipRoutes.some((route) => pathname.startsWith(route))) {
    if (shouldLog && pathname.startsWith("/api/auth/")) {
      console.log(`🔐 [MIDDLEWARE] Ruta de auth, permitiendo paso: ${pathname}`);
    }
    return NextResponse.next();
  }

  // Rutas protegidas que requieren autenticación
  const protectedRoutes = [
    "/dashboard",
    "/admin",
    "/profile",
    "/settings",
    "/clients",
    "/sales",
    "/stock",
    "/suppliers",
    "/current-accounts",
    "/petty-cash",
    "/logistic",
    "/reports",
    "/configuration",
  ];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    // En producción, ser más estricto con las cookies de autenticación
    const cookieHeader = request.headers.get("cookie") || "";
    const hasAuthCookies = cookieHeader.includes("better-auth") || cookieHeader.includes("session");

    if (shouldLog) {
      console.log(`🔒 [MIDDLEWARE] Ruta protegida: ${pathname}`);
      console.log(`🍪 [MIDDLEWARE] Cookies de auth presentes: ${hasAuthCookies ? "Sí" : "No"}`);
    }

    // Si no hay cookies de auth en una ruta protegida, redirigir al sign-in
    if (!hasAuthCookies) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);

      if (shouldLog) {
        console.log(`❌ [MIDDLEWARE] Sin cookies de auth, redirigiendo a: ${signInUrl.toString()}`);
      }

      return NextResponse.redirect(signInUrl);
    }
  }

  // Headers de seguridad adicionales para producción
  const response = NextResponse.next();

  if (isProduction) {
    // Headers de seguridad para producción
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // CSP más estricto para bloquear extensiones
    response.headers.set("Content-Security-Policy", 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';"
    );
    
    // Headers adicionales para bloquear inyección de extensiones
    response.headers.set("X-Chrome-Extension-Block", "deny-script-injection");
    response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  }

  // Headers para bloquear extensiones también en desarrollo
  if (!isProduction) {
    response.headers.set("X-Chrome-Extension-Block", "deny-script-injection");
    response.headers.set("X-Extension-Protection", "block-script-injection");
    
    // CSP más permisivo en desarrollo pero bloqueando extensiones
    response.headers.set("Content-Security-Policy", 
      "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*; " +
      "connect-src 'self' localhost:* 127.0.0.1:* ws: wss:; " +
      "frame-src 'none';"
    );
  }

  // Información del entorno para debugging
  if (shouldLog) {
    const debugInfo = {
      host: request.headers.get("host"),
      origin: request.nextUrl.origin,
      userAgent: request.headers.get("user-agent") ? "presente" : "ausente",
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    };
    console.log("📋 [MIDDLEWARE] Debug info:", debugInfo);
  }

  if (shouldLog) {
    console.log(`✅ [MIDDLEWARE] Permitiendo acceso a: ${pathname}`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - API routes de auth (/api/auth)
     * - Archivos estáticos (_next/static)
     * - Imágenes de Next.js (_next/image)
     * - favicon.ico
     * - Archivos públicos con extensión
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.[^/]*$).*)",
  ],
};

if (process.env.NODE_ENV === "development" || process.env.DEBUG_MIDDLEWARE === "true") {
  console.log(
    `🚀 [MIDDLEWARE] Middleware cargado - Env: ${process.env.NODE_ENV} - Config: ${JSON.stringify(config.matcher)}`,
  );
}

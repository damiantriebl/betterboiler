import type { Session } from "@/auth";
import { betterFetch } from "@better-fetch/fetch";
import { type NextRequest, NextResponse } from "next/server";

// Cache de sesiones en memoria para reducir llamadas a la DB
const sessionCache = new Map<string, { session: Session | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const authRoutes = ["/sign-in", "/sign-up"];
const passwordRoutes = ["/reset-password", "/forgot-password"];
const adminRoutes = ["/admin"];
const rootRoutes = ["/root"];
const publicRoutes = ["/public", "/api/health"]; // Rutas que NO requieren autenticación

export default async function authMiddleware(request: NextRequest) {
  const pathName = request.nextUrl.pathname;

  const isAuth = authRoutes.includes(pathName);
  const isPassword = passwordRoutes.includes(pathName);
  const isAdmin = adminRoutes.includes(pathName) || pathName.startsWith("/admin");
  const isRoot = rootRoutes.includes(pathName) || pathName.startsWith("/root");
  const isPublic = publicRoutes.includes(pathName) || pathName.startsWith("/public");

  // 🔐 TODAS las rutas requieren autenticación por defecto, excepto auth, password, y public
  const requiresAuth = !isAuth && !isPassword && !isPublic;

  // Extraer el token de la cookie para usar como clave de cache
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionToken = cookieHeader.match(/better-auth\.session_token=([^;]+)/)?.[1];

  let session: Session | null = null;

  // Verificar cache primero
  if (sessionToken) {
    const cached = sessionCache.get(sessionToken);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      session = cached.session;
    } else {
      // Si no está en cache o expiró, hacer la llamada
      const { data } = await betterFetch<Session>("/api/auth/get-session", {
        baseURL: process.env.BETTER_AUTH_URL,
        headers: {
          cookie: cookieHeader,
        },
      });
      session = data;

      // Guardar en cache
      sessionCache.set(sessionToken, { session, timestamp: Date.now() });

      // Limpiar cache antiguo periódicamente
      if (sessionCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of sessionCache.entries()) {
          if (now - value.timestamp > CACHE_TTL) {
            sessionCache.delete(key);
          }
        }
      }
    }
  } else {
    // Si no hay token, hacer la llamada normal
    const { data } = await betterFetch<Session>("/api/auth/get-session", {
      baseURL: process.env.BETTER_AUTH_URL,
      headers: {
        cookie: cookieHeader,
      },
    });
    session = data;
  }

  const response = NextResponse.next();
  response.headers.set("x-session", session ? "true" : "false");

  if (isAuth || isPassword) {
    return session ? NextResponse.redirect(new URL("/", request.url)) : response;
  }

  if (!session && requiresAuth) {
    return NextResponse.redirect(new URL("/sign-in?error=not-logged", request.url));
  }

  if (isAdmin && session?.user.role !== "admin" && session?.user.role !== "root") {
    return NextResponse.redirect(new URL("/?error=not-admin-privilegies", request.url));
  }

  if (isRoot && session?.user.role !== "root") {
    return NextResponse.redirect(new URL("/?error=not-root-privilegies", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};

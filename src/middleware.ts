import type { Session } from "@/auth";
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

  // Construir la URL completa para better-auth usando el request
  const baseUrl = new URL(request.url).origin;
  const sessionUrl = `${baseUrl}/api/auth/get-session`;

  let session: Session | null = null;

  try {
    // Usar fetch nativo en lugar de betterFetch
    const response = await fetch(sessionUrl, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (response.ok) {
      const data = await response.json();
      session = data;
    }
  } catch (error) {
    // En caso de error, asumir que no hay sesión
    console.error("Error fetching session in middleware:", error);
    session = null;
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

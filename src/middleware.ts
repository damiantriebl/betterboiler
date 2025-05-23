import type { Session } from "@/auth";
import { betterFetch } from "@better-fetch/fetch";
import { type NextRequest, NextResponse } from "next/server";

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

  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: process.env.BETTER_AUTH_URL,
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });

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

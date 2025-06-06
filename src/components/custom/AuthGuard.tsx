"use client";

import { isDevelopment } from "@/lib/env";
import { useSessionStore } from "@/stores/SessionStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: "admin" | "root";
  fallbackUrl?: string;
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requiredRole,
  fallbackUrl = "/sign-in",
}: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  const userId = useSessionStore((state) => state.userId);
  const userRole = useSessionStore((state) => state.userRole);

  if (isDevelopment()) {
    console.log("🛡️ [AUTH GUARD] Estado actual:", {
      isChecking,
      shouldRender,
      userId,
      userRole,
      requireAuth,
      requiredRole,
      currentPath: typeof window !== "undefined" ? window.location.pathname : "SSR",
    });
  }

  useEffect(() => {
    if (isDevelopment()) {
      console.log("⏱️ [AUTH GUARD] Iniciando timer de hidratación...");
    }
    // Esperar un momento para que el store se hidrate
    const timer = setTimeout(() => {
      if (isDevelopment()) {
        console.log("⏱️ [AUTH GUARD] Timer completado, cambiando isChecking a false");
      }
      setIsChecking(false);
    }, 150);

    return () => {
      if (isDevelopment()) {
        console.log("⏱️ [AUTH GUARD] Limpiando timer");
      }
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isChecking) {
      if (isDevelopment()) {
        console.log("🔍 [AUTH GUARD] Aún verificando, saliendo del useEffect");
      }
      return;
    }

    const currentPath = window.location.pathname;
    const authPaths = ["/sign-in", "/sign-up", "/reset-password", "/forgot-password"];
    const isAuthPage = authPaths.includes(currentPath);

    if (isDevelopment()) {
      console.log("🔍 [AUTH GUARD] Verificando acceso:", {
        currentPath,
        isAuthPage,
        userId,
        userRole,
        requireAuth,
        requiredRole,
      });
    }

    // Si está en página de auth pero ya está logueado, redirigir
    if (isAuthPage && userId) {
      if (isDevelopment()) {
        console.log(
          "🔄 [AUTH GUARD] Usuario logueado en página de auth, redirigiendo a /dashboard",
        );
      }
      router.replace("/dashboard");
      setShouldRender(false);
      return;
    }

    // Si está en página de auth y no requiere auth, mostrar
    if (isAuthPage && !requireAuth) {
      if (isDevelopment()) {
        console.log("✅ [AUTH GUARD] Página de auth y no requiere auth, mostrando contenido");
      }
      setShouldRender(true);
      return;
    }

    // Si se requiere autenticación pero no hay usuario
    if (requireAuth && !userId) {
      if (isDevelopment()) {
        console.log(
          `🚫 [AUTH GUARD] Se requiere auth pero no hay userId, redirigiendo a ${fallbackUrl}`,
        );
      }
      router.replace(`${fallbackUrl}?error=not-logged`);
      setShouldRender(false);
      return;
    }

    // Si se requiere un rol específico
    if (requiredRole && userRole !== requiredRole && userRole !== "root") {
      if (isDevelopment()) {
        console.log(
          `🚫 [AUTH GUARD] Se requiere rol ${requiredRole} pero usuario tiene ${userRole}`,
        );
      }
      const errorParam =
        requiredRole === "admin" ? "not-admin-privilegies" : "not-root-privilegies";
      router.replace(`/?error=${errorParam}`);
      setShouldRender(false);
      return;
    }

    // Todo está bien, mostrar contenido
    if (isDevelopment()) {
      console.log("✅ [AUTH GUARD] Todas las verificaciones pasaron, mostrando contenido");
    }
    setShouldRender(true);
  }, [isChecking, requireAuth, requiredRole, userId, userRole, router, fallbackUrl]);

  // Mostrar loading mientras verifica
  if (isChecking) {
    if (isDevelopment()) {
      console.log("⏳ [AUTH GUARD] Mostrando loader mientras verifica");
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Si no debe renderizar, no mostrar nada (se está redirigiendo)
  if (!shouldRender) {
    if (isDevelopment()) {
      console.log("🚫 [AUTH GUARD] shouldRender es false, no mostrando contenido");
    }
    return null;
  }

  if (isDevelopment()) {
    console.log("✅ [AUTH GUARD] Renderizando children");
  }
  return <>{children}</>;
}

"use server";

import { authClient } from "@/auth-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// El import de auth puede no ser necesario si solo borramos la cookie.
// import { auth } from "@/auth";

export default async function signOutAction() {
  try {
    // Intentar hacer sign out con better-auth
    const response = await authClient.signOut();

    // Limpiar todas las cookies relacionadas con auth
    const cookieStore = await cookies();
    const sessionCookieName = process.env.AUTH_SESSION_COOKIE_NAME || "better-auth-session-token";

    // Limpiar las cookies de sesión
    cookieStore.delete(sessionCookieName);
    cookieStore.delete("better-auth.session-token");
    cookieStore.delete("session-token");

    console.log("✅ Sign out successful");
  } catch (error) {
    console.error("⚠️ Error during sign out:", error);

    // Aunque haya error, limpiamos las cookies anyway
    const cookieStore = await cookies();
    const sessionCookieName = process.env.AUTH_SESSION_COOKIE_NAME || "better-auth-session-token";

    cookieStore.delete(sessionCookieName);
    cookieStore.delete("better-auth.session-token");
    cookieStore.delete("session-token");
  }

  // Redirigir al login
  redirect("/sign-in");
}

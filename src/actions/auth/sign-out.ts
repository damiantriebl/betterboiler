"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// El import de auth puede no ser necesario si solo borramos la cookie.
// import { auth } from "@/auth";

export default async function signOutAction() {
  try {
    const sessionCookieName = process.env.AUTH_SESSION_COOKIE_NAME || "better-auth-session-token"; // ¡VERIFICAR ESTE NOMBRE!
    const cookieStore = await cookies(); // Esperar la promesa
    cookieStore.delete(sessionCookieName); // Llamar delete sobre el objeto resuelto
  } catch (error) {
    console.error("Error al intentar borrar la cookie de sesión:", error);
  } finally {
    redirect("/sign-in"); // Redirigir siempre
  }
}

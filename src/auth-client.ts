import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";

// Función para obtener la URL base correcta
function getBaseURL() {
  // En el servidor durante SSR
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "http://localhost:3000";
  }

  // En el cliente - usar window.location.origin directamente
  // No acceder a process.env en el cliente
  return window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [adminClient()],
});

import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";

// Función para obtener la URL base correcta
function getBaseURL() {
  // En el servidor durante SSR
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "http://localhost:3000";
  }
  
  // En el cliente
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [adminClient()],
});
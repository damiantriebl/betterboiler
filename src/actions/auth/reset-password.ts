// /actions/reset-password.ts
"use server";

import { authClient } from "@/auth-client";
import type { serverMessage } from "@/types/ServerMessageType";

export async function resetPasswordAction(
  prevState: { success: string | false; error: string | false },
  formData: FormData,
): Promise<serverMessage> {
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");
  const token = formData.get("token");

  // Validate required fields
  if (password === null || passwordConfirm === null || token === null) {
    return { error: "Todos los campos son obligatorios.", success: false };
  }

  if (password !== passwordConfirm) {
    return { error: "Las contraseñas no coinciden.", success: false };
  }

  const { error } = await authClient.resetPassword({
    newPassword: password as string,
    token: token as string,
  });

  if (error) {
    if (error.message === "USER_NOT_FOUND") {
      return {
        error: "Usuario no encontrado. No existe ninguna cuenta registrada con este email.",
        success: false,
      };
    }
    if (error.message === "PASSWORD_TOO_SHORT") {
      return { error: error.message || "contraseña muy corta.", success: false };
    }
    return { error: error.message || "Ocurrió un error inesperado.", success: false };
  }

  return {
    success: "Contraseña restablecida con éxito. Ya puedes iniciar sesión.",
    error: false,
  };
}

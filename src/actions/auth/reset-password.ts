// /actions/reset-password.ts
"use server";

import { z } from "zod";
import { forgotPasswordSchema } from "@/zod/AuthZod";
import { authClient } from "@/auth-client";
import type { serverMessage } from "@/types/ServerMessageType";

export async function resetPasswordAction(
  prevState: { success: string | false; error: string | false },
  formData: FormData,
): Promise<serverMessage> {
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");
  const token = formData.get("token");

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
    } else if (error.message === "PASSWORD_TOO_SHORT") {
      return { error: error.message || "contraseña muy corta.", success: false };
    }
    return { error: error.message || "Ocurrió un error inesperado.", success: false };
  }

  return {
    success: "Contraseña restablecida con éxito. Ya puedes iniciar sesión.",
    error: false,
  };
}

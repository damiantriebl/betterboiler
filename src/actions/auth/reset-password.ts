// /actions/reset-password.ts
"use server";

import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/authZod";
import { authClient } from "@/auth-client";
import { serverMessage } from "@/app/(auth)/forgot-password/page";

export async function resetPasswordAction(prevState: { success: string | false; error: string | false; }, formData: FormData): Promise<serverMessage> {
  const password = formData.get("password") as string | null;
  const token = formData.get("token") as string | null;
  if (!password || !token) {
    return { error: "Invalid form data", success: false };
  }

  const { error } = await authClient.resetPassword({
    newPassword: password,
    token: token
  });

  if (error) {
    if (error.message === "USER_NOT_FOUND") {
      return {
        error: "Usuario no encontrado. No existe ninguna cuenta registrada con este email.",
        success: false,
      };
    }else if (error.message === "PASSWORD_TOO_SHORT") {
      return { error: error.message || "contraseña muy corta.", success: false };

    }
     else {
      return { error: error.message || "Ocurrió un error inesperado.", success: false };
    }
  }

  return {
    success: "Contraseña restablecida con éxito.",
    error: false,
  };
}
